-- ============================================================================
-- 20261016010000_area_manager_role_rls.sql
-- CVTEC EDMS Area Manager Role RLS & Review Policies (06-area-manager.md)
-- ============================================================================

-- 1. AM can view all projects (project.viewAll)
DROP POLICY IF EXISTS "am_projects_select" ON public.projects;
CREATE POLICY "am_projects_select"
ON public.projects
FOR SELECT
USING (private.has_role(ARRAY['area_manager']));

-- 2. AM can view confidential financials
DROP POLICY IF EXISTS "am_confidential_select" ON public.project_confidential;
CREATE POLICY "am_confidential_select"
ON public.project_confidential
FOR SELECT
USING (private.has_role(ARRAY['area_manager']));

-- 3. AM can view all documents across all projects
DROP POLICY IF EXISTS "am_documents_select" ON public.documents;
CREATE POLICY "am_documents_select"
ON public.documents
FOR SELECT
USING (private.has_role(ARRAY['area_manager']));

-- 4. Insert review records at 'am' level
DROP POLICY IF EXISTS "am_reviews_insert" ON public.document_reviews;
CREATE POLICY "am_reviews_insert"
ON public.document_reviews
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['area_manager'])
  AND level = 'am'
  AND reviewer_id = (SELECT auth.uid())
);

-- 5. Update document status via second-level review decision
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
      )
    )
  )
)
WITH CHECK (
  private.has_role(ARRAY['area_manager'])
  AND status::text IN ('ready_for_authority', 'rejected')
);

-- Area Manager has ZERO INSERT or DELETE policies on public.documents
-- Area Manager has ZERO UPDATE policy on project_nocs
