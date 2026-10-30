-- ============================================================================
-- Migration: 20261030010000_lockdown_project_noc_requirements_rls.sql
-- Restricts modification of statutory requirements strictly to Admin, Authority Engineer, and DC
-- ============================================================================

DROP POLICY IF EXISTS "auth_eng_dc_project_noc_requirements" ON public.project_noc_requirements;

CREATE POLICY "auth_eng_dc_project_noc_requirements"
ON public.project_noc_requirements
FOR ALL
TO authenticated
USING (
  private.has_role(ARRAY['admin', 'authority_engineer', 'dc'])
)
WITH CHECK (
  private.has_role(ARRAY['admin', 'authority_engineer', 'dc'])
);
