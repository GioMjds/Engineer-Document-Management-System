-- ============================================================================
-- 20261016000000_resident_engineer_role_rls.sql
-- CVTEC EDMS Resident Engineer Role RLS & Review Policies (05-resident-engineer.md)
-- ============================================================================

-- 1. Ensure doc_status enum contains review states if defined
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_status') THEN
    ALTER TYPE public.doc_status ADD VALUE IF NOT EXISTS 'escalated';
    ALTER TYPE public.doc_status ADD VALUE IF NOT EXISTS 'ready_for_authority';
  END IF;
END $$;

-- 2. Read drawings in assigned projects
DROP POLICY IF EXISTS "re_documents_select" ON public.documents;
CREATE POLICY "re_documents_select"
ON public.documents
FOR SELECT
USING (
  private.has_role(ARRAY['resident_engineer'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
);

-- 3. Insert review records at 're' level
DROP POLICY IF EXISTS "reviews_insert_re" ON public.document_reviews;
CREATE POLICY "reviews_insert_re"
ON public.document_reviews
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['resident_engineer'])
  AND level = 're'
  AND reviewer_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id
      AND (d.project_id IS NULL OR private.can_see_project(d.project_id))
  )
);

-- 4. Update document status via review decision
DROP POLICY IF EXISTS "re_documents_status_update" ON public.documents;
CREATE POLICY "re_documents_status_update"
ON public.documents
FOR UPDATE
USING (
  private.has_role(ARRAY['resident_engineer'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
  AND status = 'submitted'
)
WITH CHECK (
  private.has_role(ARRAY['resident_engineer'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
  AND status IN ('escalated', 'ready_for_authority', 'rejected')
);

-- Resident Engineer has ZERO SELECT policy on project_confidential
-- Resident Engineer has ZERO INSERT/DELETE policy on public.documents
