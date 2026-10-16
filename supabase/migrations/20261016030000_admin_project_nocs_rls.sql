-- ============================================================================
-- 20261016030000_admin_project_nocs_rls.sql
-- CVTEC EDMS Admin Full Management Policies on project_nocs & project_noc_requirements
-- ============================================================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.project_nocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_noc_requirements ENABLE ROW LEVEL SECURITY;

-- 2. Admin full management on project_nocs
DROP POLICY IF EXISTS "admin_project_nocs_all" ON public.project_nocs;
CREATE POLICY "admin_project_nocs_all"
ON public.project_nocs
FOR ALL
USING (private.has_role(ARRAY['admin']))
WITH CHECK (private.has_role(ARRAY['admin']));

-- 3. Admin full management on project_noc_requirements
DROP POLICY IF EXISTS "admin_project_noc_requirements_all" ON public.project_noc_requirements;
CREATE POLICY "admin_project_noc_requirements_all"
ON public.project_noc_requirements
FOR ALL
USING (private.has_role(ARRAY['admin']))
WITH CHECK (private.has_role(ARRAY['admin']));
