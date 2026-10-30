-- ============================================================================
-- Migration: 20261030000000_sync_project_noc_requirements.sql
-- Fixes checklist propagation from NOC Matrix blueprints to project_noc_requirements
-- ============================================================================

-- 1. Table Grants & Permissions
GRANT ALL ON TABLE public.project_noc_requirements TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.noc_matrix_requirements TO authenticated, service_role, anon;
GRANT ALL ON TABLE public.noc_resubmission_history TO authenticated, service_role, anon;

-- 2. Enhanced RLS Policies for project_noc_requirements
DROP POLICY IF EXISTS "auth_eng_dc_project_noc_requirements" ON public.project_noc_requirements;
CREATE POLICY "auth_eng_dc_project_noc_requirements"
ON public.project_noc_requirements
FOR ALL
TO authenticated
USING (
  private.has_role(ARRAY['admin', 'authority_engineer', 'dc', 'resident_engineer'])
)
WITH CHECK (
  private.has_role(ARRAY['admin', 'authority_engineer', 'dc', 'resident_engineer'])
);

-- 3. Replace save_matrix_item_atomic to propagate checklist changes to active projects
CREATE OR REPLACE FUNCTION public.save_matrix_item_atomic(
  p_matrix_item_id UUID,
  p_caller_id UUID,
  p_change_summary TEXT,
  p_description TEXT,
  p_stage public.noc_stage,
  p_reviewing_authority_id INT,
  p_submitted_by public.noc_submitter,
  p_blocking_seq INT,
  p_default_fee NUMERIC,
  p_validity_days INT,
  p_requirements JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_auth_id INT;
  v_old_data JSONB;
  v_new_data JSONB;
  v_projects_updated INT := 0;
  v_nocs_updated INT := 0;
  v_req JSONB;
  v_proj_noc RECORD;
BEGIN
  -- Verify caller role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_caller_id AND role IN ('admin', 'authority_engineer', 'dc') AND active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: strictly Admin, Authority Engineer, or DC can modify matrix templates.';
  END IF;

  -- Lock and capture current blueprint item
  SELECT master_authority_id, to_jsonb(m) INTO v_master_auth_id, v_old_data
  FROM public.noc_matrix_items m
  WHERE id = p_matrix_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matrix blueprint item % not found.', p_matrix_item_id;
  END IF;

  -- Update matrix blueprint item
  UPDATE public.noc_matrix_items
  SET description = trim(p_description),
      stage = p_stage,
      reviewing_authority_id = p_reviewing_authority_id,
      submitted_by = p_submitted_by,
      blocking_sequence_no = p_blocking_seq,
      default_fee = p_default_fee,
      validity_days = p_validity_days,
      updated_at = now()
  WHERE id = p_matrix_item_id;

  v_new_data := jsonb_build_object(
    'description', trim(p_description),
    'stage', p_stage,
    'reviewing_authority_id', p_reviewing_authority_id,
    'submitted_by', p_submitted_by,
    'blocking_sequence_no', p_blocking_seq,
    'default_fee', p_default_fee,
    'validity_days', p_validity_days
  );

  -- Propagate metadata changes to unobtained, unapproved project NOCs
  WITH updated_rows AS (
    UPDATE public.project_nocs pn
    SET description = trim(p_description),
        stage = p_stage,
        reviewing_authority_id = p_reviewing_authority_id,
        submitted_by = p_submitted_by,
        blocking_sequence_no = p_blocking_seq,
        payment_fee = CASE WHEN pn.is_paid THEN pn.payment_fee ELSE p_default_fee END,
        updated_at = now(),
        updated_by = p_caller_id
    FROM public.projects p
    WHERE pn.project_id = p.id
      AND p.master_authority_id = v_master_auth_id
      AND p.archived_at IS NULL
      AND p.stage != 'completed'
      AND pn.matrix_item_id = p_matrix_item_id
      AND pn.status_code != 'approved'
    RETURNING pn.id, pn.project_id
  )
  SELECT COUNT(*), COUNT(DISTINCT project_id)
  INTO v_nocs_updated, v_projects_updated
  FROM updated_rows;

  -- Atomically synchronize template requirements
  DELETE FROM public.noc_matrix_requirements
  WHERE matrix_item_id = p_matrix_item_id;

  IF p_requirements IS NOT NULL AND jsonb_array_length(p_requirements) > 0 THEN
    FOR v_req IN SELECT * FROM jsonb_array_elements(p_requirements)
    LOOP
      INSERT INTO public.noc_matrix_requirements (
        matrix_item_id,
        title,
        mandatory,
        sort_order
      ) VALUES (
        p_matrix_item_id,
        trim(v_req->>'title'),
        COALESCE((v_req->>'mandatory')::boolean, true),
        COALESCE((v_req->>'sort_order')::int, (v_req->>'sortOrder')::int, 0)
      );
    END LOOP;
  END IF;

  -- Propagate checklist requirements to active, unapproved project NOCs
  FOR v_proj_noc IN
    SELECT pn.id
    FROM public.project_nocs pn
    JOIN public.projects p ON p.id = pn.project_id
    WHERE pn.matrix_item_id = p_matrix_item_id
      AND p.master_authority_id = v_master_auth_id
      AND p.archived_at IS NULL
      AND p.stage != 'completed'
      AND pn.status_code != 'approved'
  LOOP
    -- Sync requirements, preserving existing satisfied status and attachments where title matches
    IF p_requirements IS NOT NULL AND jsonb_array_length(p_requirements) > 0 THEN
      -- Delete requirements no longer in template
      DELETE FROM public.project_noc_requirements pnr
      WHERE pnr.project_noc_id = v_proj_noc.id
        AND trim(pnr.title) NOT IN (
          SELECT trim(r->>'title') FROM jsonb_array_elements(p_requirements) r
        );

      -- Insert missing requirements into project_noc_requirements
      FOR v_req IN SELECT * FROM jsonb_array_elements(p_requirements)
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM public.project_noc_requirements pnr
          WHERE pnr.project_noc_id = v_proj_noc.id
            AND trim(pnr.title) = trim(v_req->>'title')
        ) THEN
          INSERT INTO public.project_noc_requirements (
            project_noc_id,
            title,
            is_satisfied,
            file_url
          ) VALUES (
            v_proj_noc.id,
            trim(v_req->>'title'),
            false,
            null
          );
        END IF;
      END LOOP;
    ELSE
      -- All requirements removed in blueprint template
      DELETE FROM public.project_noc_requirements
      WHERE project_noc_id = v_proj_noc.id;
    END IF;
  END LOOP;

  -- Insert audit revision record
  INSERT INTO public.noc_matrix_revisions (
    master_authority_id,
    matrix_item_id,
    action,
    changed_by,
    change_summary,
    previous_data,
    new_data,
    propagated_projects_count,
    propagated_nocs_count
  ) VALUES (
    v_master_auth_id,
    p_matrix_item_id,
    'UPDATE',
    p_caller_id,
    p_change_summary,
    v_old_data,
    v_new_data,
    v_projects_updated,
    v_nocs_updated
  );

  RETURN jsonb_build_object(
    'success', true,
    'projects_updated', v_projects_updated,
    'nocs_updated', v_nocs_updated
  );
END;
$$;

-- 4. Replace create_matrix_item_atomic to also clone checklist to instantiated project NOCs
CREATE OR REPLACE FUNCTION public.create_matrix_item_atomic(
  p_master_authority_id INT,
  p_caller_id UUID,
  p_change_summary TEXT,
  p_description TEXT,
  p_stage public.noc_stage,
  p_reviewing_authority_id INT,
  p_submitted_by public.noc_submitter,
  p_blocking_seq INT,
  p_default_fee NUMERIC,
  p_validity_days INT,
  p_requirements JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_item_id UUID;
  v_next_seq INT;
  v_active_projects_count INT := 0;
  v_req JSONB;
  v_inserted_noc RECORD;
BEGIN
  -- Verify caller role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_caller_id AND role IN ('admin', 'authority_engineer', 'dc') AND active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: strictly Admin, Authority Engineer, or DC can create matrix blueprints.';
  END IF;

  PERFORM 1 FROM public.master_authorities
  WHERE id = p_master_authority_id
  FOR UPDATE;

  SELECT COALESCE(MAX(sequence_no), 0) + 1
  INTO v_next_seq
  FROM public.noc_matrix_items
  WHERE master_authority_id = p_master_authority_id
    AND active = true;

  -- Insert matrix blueprint item
  INSERT INTO public.noc_matrix_items (
    master_authority_id,
    sequence_no,
    stage,
    reviewing_authority_id,
    description,
    submitted_by,
    blocking_sequence_no,
    default_fee,
    validity_days,
    active
  ) VALUES (
    p_master_authority_id,
    v_next_seq,
    p_stage,
    p_reviewing_authority_id,
    trim(p_description),
    p_submitted_by,
    p_blocking_seq,
    p_default_fee,
    p_validity_days,
    true
  ) RETURNING id INTO v_new_item_id;

  -- Insert checklist requirements into template
  IF p_requirements IS NOT NULL AND jsonb_array_length(p_requirements) > 0 THEN
    FOR v_req IN SELECT * FROM jsonb_array_elements(p_requirements)
    LOOP
      INSERT INTO public.noc_matrix_requirements (
        matrix_item_id,
        title,
        mandatory,
        sort_order
      ) VALUES (
        v_new_item_id,
        trim(v_req->>'title'),
        COALESCE((v_req->>'mandatory')::boolean, true),
        COALESCE((v_req->>'sort_order')::int, (v_req->>'sortOrder')::int, 0)
      );
    END LOOP;
  END IF;

  -- Propagate unobtained NOC to active projects under this master authority
  FOR v_inserted_noc IN
    INSERT INTO public.project_nocs (
      project_id,
      matrix_item_id,
      sequence_no,
      stage,
      reviewing_authority_id,
      description,
      submitted_by,
      blocking_sequence_no,
      status_code,
      payment_fee,
      is_paid,
      current_revision,
      plan_date,
      updated_by
    )
    SELECT
      p.id,
      v_new_item_id,
      v_next_seq,
      p_stage,
      p_reviewing_authority_id,
      trim(p_description),
      p_submitted_by,
      p_blocking_seq,
      'not_started',
      p_default_fee,
      false,
      'R00',
      CURRENT_DATE,
      p_caller_id
    FROM public.projects p
    WHERE p.master_authority_id = p_master_authority_id
      AND p.archived_at IS NULL
      AND p.stage != 'completed'
    RETURNING id
  LOOP
    v_active_projects_count := v_active_projects_count + 1;

    -- Clone requirements to newly instantiated project NOC
    IF p_requirements IS NOT NULL AND jsonb_array_length(p_requirements) > 0 THEN
      FOR v_req IN SELECT * FROM jsonb_array_elements(p_requirements)
      LOOP
        INSERT INTO public.project_noc_requirements (
          project_noc_id,
          title,
          is_satisfied
        ) VALUES (
          v_inserted_noc.id,
          trim(v_req->>'title'),
          false
        );
      END LOOP;
    END IF;
  END LOOP;

  -- Record revision entry in audit log
  INSERT INTO public.noc_matrix_revisions (
    master_authority_id,
    matrix_item_id,
    action,
    changed_by,
    change_summary,
    new_data,
    propagated_projects_count,
    propagated_nocs_count
  ) VALUES (
    p_master_authority_id,
    v_new_item_id,
    'CREATE',
    p_caller_id,
    p_change_summary,
    jsonb_build_object(
      'description', trim(p_description),
      'stage', p_stage,
      'reviewing_authority_id', p_reviewing_authority_id,
      'submitted_by', p_submitted_by,
      'blocking_sequence_no', p_blocking_seq,
      'default_fee', p_default_fee,
      'validity_days', p_validity_days
    ),
    v_active_projects_count,
    v_active_projects_count
  );

  RETURN jsonb_build_object(
    'success', true,
    'matrix_item_id', v_new_item_id,
    'sequence_no', v_next_seq,
    'propagated_projects_count', v_active_projects_count
  );
END;
$$;

-- 5. Backfill existing project NOCs missing their template requirements (including Project 26003)
INSERT INTO public.project_noc_requirements (
  project_noc_id,
  title,
  is_satisfied,
  file_url
)
SELECT
  pn.id AS project_noc_id,
  nmr.title,
  CASE
    WHEN pn.status_code = 'approved' THEN true
    ELSE false
  END AS is_satisfied,
  null AS file_url
FROM public.project_nocs pn
JOIN public.noc_matrix_requirements nmr ON nmr.matrix_item_id = pn.matrix_item_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_noc_requirements pnr
  WHERE pnr.project_noc_id = pn.id
    AND trim(pnr.title) = trim(nmr.title)
)
ORDER BY pn.sequence_no, nmr.sort_order;
