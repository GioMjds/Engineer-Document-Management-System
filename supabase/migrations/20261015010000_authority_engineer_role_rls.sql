-- ============================================================================
-- 20261015010000_authority_engineer_role_rls.sql
-- CVTEC EDMS Authority Engineer Role RLS Policies (03-authority-engineer.md)
-- ============================================================================

-- 1. Read NOCs in assigned projects
DROP POLICY IF EXISTS "auth_eng_noc_select" ON public.project_nocs;
CREATE POLICY "auth_eng_noc_select"
ON public.project_nocs
FOR SELECT
USING (
  private.has_role(ARRAY['authority_engineer'])
  AND private.can_see_project(project_id)
);

-- 2. Update NOC tracker in assigned projects
DROP POLICY IF EXISTS "auth_eng_noc_update" ON public.project_nocs;
CREATE POLICY "auth_eng_noc_update"
ON public.project_nocs
FOR UPDATE
USING (
  private.has_role(ARRAY['authority_engineer'])
  AND private.can_see_project(project_id)
)
WITH CHECK (
  private.has_role(ARRAY['authority_engineer'])
  AND private.can_see_project(project_id)
);

-- 3. Manage Matrix revisions
DROP POLICY IF EXISTS "auth_eng_matrix_revisions_insert" ON public.noc_matrix_revisions;
CREATE POLICY "auth_eng_matrix_revisions_insert"
ON public.noc_matrix_revisions
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['authority_engineer'])
  AND changed_by = (SELECT auth.uid())
);

-- 4. Documents: select in assigned project, insert/update own uploads only
DROP POLICY IF EXISTS "auth_eng_documents_select" ON public.documents;
CREATE POLICY "auth_eng_documents_select"
ON public.documents
FOR SELECT
USING (
  private.has_role(ARRAY['authority_engineer'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
);

DROP POLICY IF EXISTS "auth_eng_documents_insert" ON public.documents;
CREATE POLICY "auth_eng_documents_insert"
ON public.documents
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['authority_engineer'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
  AND uploaded_by = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "auth_eng_documents_update" ON public.documents;
CREATE POLICY "auth_eng_documents_update"
ON public.documents
FOR UPDATE
USING (
  private.has_role(ARRAY['authority_engineer'])
  AND uploaded_by = (SELECT auth.uid())
);
