-- ============================================================================
-- 20261015000000_dc_role_rls.sql
-- CVTEC EDMS Document Controller Role & Document Enhancements (02-document-controller.md)
-- ============================================================================

-- 1. Augment documents table with discipline and revision tracking
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS discipline TEXT CHECK (discipline IN ('mep', 'architect', 'structure', 'civil')),
  ADD COLUMN IF NOT EXISTS revision TEXT NOT NULL DEFAULT 'R00';

-- 2. Ensure RLS is active on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Admin document policy (full management)
DROP POLICY IF EXISTS "admin_documents_all" ON public.documents;
CREATE POLICY "admin_documents_all"
ON public.documents
FOR ALL
USING (
  private.has_role(ARRAY['admin'])
)
WITH CHECK (
  private.has_role(ARRAY['admin'])
);

-- 4. Document Controller Policies: assigned projects only
DROP POLICY IF EXISTS "dc_documents_select" ON public.documents;
CREATE POLICY "dc_documents_select"
ON public.documents
FOR SELECT
USING (
  private.has_role(ARRAY['dc'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
);

DROP POLICY IF EXISTS "dc_documents_insert" ON public.documents;
CREATE POLICY "dc_documents_insert"
ON public.documents
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['dc'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
);

DROP POLICY IF EXISTS "dc_documents_update" ON public.documents;
CREATE POLICY "dc_documents_update"
ON public.documents
FOR UPDATE
USING (
  private.has_role(ARRAY['dc'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
)
WITH CHECK (
  private.has_role(ARRAY['dc'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
);

-- DC has ZERO DELETE policy on documents (soft delete archive only via update archived_at)
-- DC has ZERO SELECT policy on project_confidential
