-- ============================================================================
-- 20261106000000_admin_projects_rls.sql
-- CVTEC EDMS Admin Full Management RLS Policy on public.projects
-- ============================================================================

-- 1. Ensure RLS is active on public.projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Admin full access policy (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "admin_projects_all" ON public.projects;
CREATE POLICY "admin_projects_all"
ON public.projects
FOR ALL
TO authenticated
USING (
  private.has_role(ARRAY['admin'])
)
WITH CHECK (
  private.has_role(ARRAY['admin'])
);
