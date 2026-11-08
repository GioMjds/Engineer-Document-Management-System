-- ============================================================================
-- 20261108030000_harden_review_documents_matrix.sql
-- H2 active-RE bypass, H5 document and project guards, H8 atomic reorder, H9 matrix reads
-- ============================================================================

-- H2: the Area Manager bypass applies only when no ACTIVE Resident Engineer is on the project
DROP POLICY IF EXISTS "am_documents_status_update" ON public.documents;
CREATE POLICY "am_documents_status_update"
ON public.documents
FOR UPDATE
USING (
  private.has_role(ARRAY['area_manager'])
  AND (
    status::text = 'escalated'
    OR (
      status = 'submitted'
      AND NOT EXISTS (
        SELECT 1 FROM public.project_members pm
        JOIN public.profiles p ON p.id = pm.user_id
        WHERE pm.project_id = documents.project_id
          AND p.role = 'resident_engineer'
          AND p.active = true
      )
    )
  )
)
WITH CHECK (
  private.has_role(ARRAY['area_manager'])
  AND status::text IN ('ready_for_authority', 'rejected')
);

-- H5: documents - deny-by-default column whitelist and legal status moves for non-admin users
CREATE OR REPLACE FUNCTION private.guard_document_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_mutable TEXT[] := ARRAY[
    'title', 'description', 'discipline', 'doc_number', 'status',
    'status_before_archive', 'archived_at', 'archived_by', 'updated_at'
  ];
BEGIN
  -- Service-role writes (no auth.uid) and admins are trusted.
  IF (SELECT auth.uid()) IS NULL OR private.has_role(ARRAY['admin']) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - v_mutable) IS DISTINCT FROM (to_jsonb(OLD) - v_mutable) THEN
    RAISE EXCEPTION 'Protected document columns cannot be changed directly.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status::text = 'archived' OR NEW.status::text = 'archived' THEN
      IF NOT private.has_role(ARRAY['dc']) THEN
        RAISE EXCEPTION 'Only a Document Controller can archive or restore a document.';
      END IF;
    ELSIF NEW.status::text IN ('escalated', 'ready_for_authority', 'rejected') THEN
      IF NOT private.has_role(ARRAY['resident_engineer', 'area_manager'])
         OR OLD.status::text NOT IN ('submitted', 'escalated') THEN
        RAISE EXCEPTION 'Only a reviewer can decide a submitted drawing.';
      END IF;
    ELSE
      RAISE EXCEPTION 'Status change % to % is not allowed.', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_document_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS documents_guard_update ON public.documents;
CREATE TRIGGER documents_guard_update
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION private.guard_document_update();

-- H5: projects - Resident Engineer and Area Manager may only touch milestones and stage
CREATE OR REPLACE FUNCTION private.guard_project_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_mutable TEXT[] := ARRAY['milestones', 'stage', 'updated_at'];
BEGIN
  IF (SELECT auth.uid()) IS NULL OR private.has_role(ARRAY['admin']) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - v_mutable) IS DISTINCT FROM (to_jsonb(OLD) - v_mutable) THEN
    RAISE EXCEPTION 'Only milestones and stage can be changed on a project.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_project_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS projects_guard_update ON public.projects;
CREATE TRIGGER projects_guard_update
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION private.guard_project_update();

-- H8: atomic reorder that remaps blocking links and propagates to project NOCs
CREATE OR REPLACE FUNCTION public.reorder_matrix_items_atomic(
  p_master_authority_id INT,
  p_ordered_ids UUID[],
  p_caller_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total INT;
  v_map JSONB;
  v_old JSONB;
BEGIN
  IF p_caller_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: caller id does not match the authenticated user.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_caller_id AND role IN ('admin', 'authority_engineer', 'dc') AND active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: strictly Admin, Authority Engineer, or DC can reorder matrix templates.';
  END IF;

  -- Lock the active set so concurrent edits wait.
  PERFORM 1 FROM public.noc_matrix_items
  WHERE master_authority_id = p_master_authority_id AND active = true
  FOR UPDATE;

  SELECT count(*) INTO v_total
  FROM public.noc_matrix_items
  WHERE master_authority_id = p_master_authority_id AND active = true;

  IF coalesce(cardinality(p_ordered_ids), 0) <> v_total
     OR (SELECT count(DISTINCT u.id) FROM unnest(p_ordered_ids) AS u(id)) <> v_total
     OR EXISTS (
       SELECT 1 FROM unnest(p_ordered_ids) AS u(id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.noc_matrix_items m
         WHERE m.id = u.id AND m.master_authority_id = p_master_authority_id AND m.active = true
       )
     ) THEN
    RAISE EXCEPTION 'Ordered ids must list every active item of this authority exactly once.';
  END IF;

  -- old sequence -> new sequence, and the previous order for the revision log
  SELECT jsonb_object_agg(m.sequence_no::text, o.ord), jsonb_agg(m.id ORDER BY m.sequence_no)
  INTO v_map, v_old
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS o(id, ord)
  JOIN public.noc_matrix_items m ON m.id = o.id;

  -- Park sequences out of range so the partial unique index never collides.
  UPDATE public.noc_matrix_items
  SET sequence_no = sequence_no + 100000
  WHERE master_authority_id = p_master_authority_id AND active = true;

  UPDATE public.noc_matrix_items m
  SET sequence_no = o.ord::int,
      blocking_sequence_no = CASE
        WHEN m.blocking_sequence_no IS NULL THEN NULL
        ELSE (v_map ->> m.blocking_sequence_no::text)::int
      END,
      updated_at = now()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS o(id, ord)
  WHERE m.id = o.id;

  -- Keep project NOC copies in step so prerequisite checks still match.
  UPDATE public.project_nocs pn
  SET sequence_no = m.sequence_no,
      blocking_sequence_no = m.blocking_sequence_no,
      updated_at = now(),
      updated_by = p_caller_id
  FROM public.noc_matrix_items m
  JOIN public.projects p ON p.master_authority_id = m.master_authority_id
  WHERE pn.matrix_item_id = m.id
    AND pn.project_id = p.id
    AND m.master_authority_id = p_master_authority_id
    AND m.active = true
    AND p.archived_at IS NULL
    AND p.stage <> 'completed';

  INSERT INTO public.noc_matrix_revisions (
    master_authority_id, matrix_item_id, action, changed_by, change_summary,
    previous_data, new_data, propagated_projects_count, propagated_nocs_count
  ) VALUES (
    p_master_authority_id, NULL, 'REORDER', p_caller_id,
    format('Reordered %s matrix item sequences.', v_total),
    jsonb_build_object('orderedIds', v_old),
    jsonb_build_object('orderedIds', to_jsonb(p_ordered_ids)),
    0, 0
  );

  RETURN jsonb_build_object('reordered', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_matrix_items_atomic(INT, UUID[], UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_matrix_items_atomic(INT, UUID[], UUID)
  TO authenticated, service_role;

-- H9: matrix blueprint reads only for matrix roles
-- Requirements: the "Allow write matrix requirements" FOR ALL policy already grants select to them.
DROP POLICY IF EXISTS "Allow read matrix requirements" ON public.noc_matrix_requirements;

-- Revisions have no FOR ALL policy, so replace the open read with a role-scoped one.
DROP POLICY IF EXISTS "Allow read matrix revisions" ON public.noc_matrix_revisions;
DROP POLICY IF EXISTS "matrix_revisions_select" ON public.noc_matrix_revisions;
CREATE POLICY "matrix_revisions_select"
ON public.noc_matrix_revisions
FOR SELECT
TO authenticated
USING (private.has_role(ARRAY['admin', 'authority_engineer', 'dc']));

-- H9: NOC children follow the parent NOC's visibility. The EXISTS runs under project_nocs RLS
-- ("nocs read" = can_see_project, plus admin and CEO policies), so access is project-scoped.
DROP POLICY IF EXISTS "Allow read project requirements" ON public.project_noc_requirements;
DROP POLICY IF EXISTS "project_noc_requirements_select" ON public.project_noc_requirements;
CREATE POLICY "project_noc_requirements_select"
ON public.project_noc_requirements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_nocs pn
    WHERE pn.id = project_noc_requirements.project_noc_id
  )
);

DROP POLICY IF EXISTS "auth_eng_dc_project_noc_requirements" ON public.project_noc_requirements;
CREATE POLICY "auth_eng_dc_project_noc_requirements"
ON public.project_noc_requirements
FOR ALL
TO authenticated
USING (
  private.has_role(ARRAY['admin', 'authority_engineer', 'dc', 'resident_engineer'])
  AND EXISTS (
    SELECT 1 FROM public.project_nocs pn
    WHERE pn.id = project_noc_requirements.project_noc_id
  )
)
WITH CHECK (
  private.has_role(ARRAY['admin', 'authority_engineer', 'dc', 'resident_engineer'])
  AND EXISTS (
    SELECT 1 FROM public.project_nocs pn
    WHERE pn.id = project_noc_requirements.project_noc_id
  )
);

DROP POLICY IF EXISTS "Allow read resubmission history" ON public.noc_resubmission_history;
DROP POLICY IF EXISTS "noc_resubmission_history_select" ON public.noc_resubmission_history;
CREATE POLICY "noc_resubmission_history_select"
ON public.noc_resubmission_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_nocs pn
    WHERE pn.id = noc_resubmission_history.project_noc_id
  )
);
