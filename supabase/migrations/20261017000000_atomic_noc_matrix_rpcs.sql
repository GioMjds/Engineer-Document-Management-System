-- ============================================================================
-- 20261017000000_atomic_noc_matrix_rpcs.sql
-- CVTEC EDMS Atomic Matrix Operations, Integrity Constraints, and Seed
-- ============================================================================

-- 1. Lowercase unique indexes on authority names to block duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS master_authorities_lower_name_idx
  ON public.master_authorities (lower(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS reviewing_authorities_lower_name_idx
  ON public.reviewing_authorities (lower(trim(name)));

-- 2. Partial unique index on active matrix item sequences per master authority
CREATE UNIQUE INDEX IF NOT EXISTS noc_matrix_items_master_seq_active_idx
  ON public.noc_matrix_items (master_authority_id, sequence_no)
  WHERE active = true;

-- 3. Check constraint for matrix revision actions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'noc_matrix_revisions_action_check'
  ) THEN
    ALTER TABLE public.noc_matrix_revisions
      ADD CONSTRAINT noc_matrix_revisions_action_check
      CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'REORDER'));
  END IF;
END $$;

-- 4. Seed baseline master authorities if missing
INSERT INTO public.master_authorities (id, name, jurisdiction)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Nakheel & Trakhees', 'JAFZA & Coastal Zones'),
  (2, 'Dubai Municipality', 'Mainland Dubai & Al Safat'),
  (3, 'Dubai Development Authority', 'TECOM & Free Zones')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, jurisdiction = EXCLUDED.jurisdiction;

-- 5. Seed baseline reviewing authorities if missing
INSERT INTO public.reviewing_authorities (id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Trakhees'),
  (2, 'Nakheel'),
  (3, 'DEWA'),
  (4, 'Empower'),
  (5, 'RTA'),
  (6, 'EHS'),
  (7, 'DCAA'),
  (8, 'DM'),
  (9, 'DU'),
  (10, 'Etisalat'),
  (11, 'Green Building'),
  (12, 'Third Party'),
  (13, 'DCD'),
  (14, 'DDA')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- 6. Atomic RPC: save_matrix_item_atomic
-- Performs matrix item update, project propagation, checklist replacement, and revision log in a single transaction.
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

  -- Update matrix item
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

  -- Propagate changes to unobtained, unapproved project NOCs
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

  -- Atomically synchronize requirements
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

-- 7. Atomic RPC: create_matrix_item_atomic
-- Computes sequence safely with table lock, creates blueprint, requirements, propagates to projects, logs revision.
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
BEGIN
  -- Verify caller role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_caller_id AND role IN ('admin', 'authority_engineer', 'dc') AND active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: strictly Admin, Authority Engineer, or DC can create matrix blueprints.';
  END IF;

  -- Prevent sequence number race condition by locking master authority items
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

  -- Insert checklist requirements
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
  WITH inserted_nocs AS (
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
  )
  SELECT COUNT(*) INTO v_active_projects_count FROM inserted_nocs;

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
      'sequenceNo', v_next_seq,
      'description', trim(p_description),
      'stage', p_stage,
      'reviewingAuthorityId', p_reviewing_authority_id,
      'submittedBy', p_submitted_by,
      'blockingSequenceNo', p_blocking_seq,
      'defaultFee', p_default_fee,
      'validityDays', p_validity_days
    ),
    v_active_projects_count,
    v_active_projects_count
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_item_id,
    'sequence_no', v_next_seq,
    'propagated_projects_count', v_active_projects_count
  );
END;
$$;

-- 8. Backward-compatible overload for propagate_matrix_item_change
CREATE OR REPLACE FUNCTION public.propagate_matrix_item_change(
  p_matrix_item_id UUID,
  p_caller_id UUID,
  p_change_summary TEXT,
  p_description TEXT,
  p_stage public.noc_stage,
  p_reviewing_authority_id INT,
  p_submitted_by public.noc_submitter,
  p_blocking_seq INT,
  p_default_fee NUMERIC,
  p_validity_days INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.save_matrix_item_atomic(
    p_matrix_item_id,
    p_caller_id,
    p_change_summary,
    p_description,
    p_stage,
    p_reviewing_authority_id,
    p_submitted_by,
    p_blocking_seq,
    p_default_fee,
    p_validity_days,
    '[]'::jsonb
  );
END;
$$;
