-- ============================================================================
-- 20261016020000_ceo_role_rls.sql
-- CVTEC EDMS Chief Executive Officer (CEO) Role RLS Policies (07-ceo.md)
-- ============================================================================

-- 1. Projects: CEO read-only visibility across all projects (project.viewAll)
DROP POLICY IF EXISTS "ceo_projects_select" ON public.projects;
CREATE POLICY "ceo_projects_select"
ON public.projects
FOR SELECT
USING (private.has_role(ARRAY['ceo']));

-- 2. Project Confidential: CEO read-only visibility for consultant contract amounts
DROP POLICY IF EXISTS "ceo_confidential_select" ON public.project_confidential;
CREATE POLICY "ceo_confidential_select"
ON public.project_confidential
FOR SELECT
USING (private.has_role(ARRAY['ceo']));

-- 3. Documents: CEO read-only visibility across all projects
DROP POLICY IF EXISTS "ceo_documents_select" ON public.documents;
CREATE POLICY "ceo_documents_select"
ON public.documents
FOR SELECT
USING (private.has_role(ARRAY['ceo']));

-- 4. Project NOCs: CEO read-only visibility across all projects
DROP POLICY IF EXISTS "ceo_noc_select" ON public.project_nocs;
CREATE POLICY "ceo_noc_select"
ON public.project_nocs
FOR SELECT
USING (private.has_role(ARRAY['ceo']));

-- 5. Document Reviews: CEO read-only visibility across all reviews
DROP POLICY IF EXISTS "ceo_reviews_select" ON public.document_reviews;
CREATE POLICY "ceo_reviews_select"
ON public.document_reviews
FOR SELECT
USING (private.has_role(ARRAY['ceo']));

-- CEO has ZERO insert, update, or delete policies on ANY table or storage bucket
