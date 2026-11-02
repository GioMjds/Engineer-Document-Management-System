-- ============================================================================
-- 20261102000000_enable_projects_realtime_and_milestones_rls.sql
-- Enable Realtime publication & RLS policies for projects milestone updates
-- ============================================================================

-- 1. Enable Supabase Realtime publication on public.projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
END $$;

-- 2. Ensure REPLICA IDENTITY FULL for detailed change payloads & column filtering
ALTER TABLE public.projects REPLICA IDENTITY FULL;

-- 3. RLS SELECT policy on public.projects for Resident Engineer (assigned projects)
DROP POLICY IF EXISTS "re_projects_select" ON public.projects;
CREATE POLICY "re_projects_select"
ON public.projects
FOR SELECT
USING (
  private.has_role(ARRAY['resident_engineer'])
  AND private.can_see_project(id)
);

-- 4. RLS UPDATE policy on public.projects for Admin, Area Manager, and assigned Resident Engineer
DROP POLICY IF EXISTS "re_am_admin_projects_update" ON public.projects;
CREATE POLICY "re_am_admin_projects_update"
ON public.projects
FOR UPDATE
USING (
  private.has_role(ARRAY['admin', 'area_manager'])
  OR (
    private.has_role(ARRAY['resident_engineer'])
    AND private.can_see_project(id)
  )
)
WITH CHECK (
  private.has_role(ARRAY['admin', 'area_manager'])
  OR (
    private.has_role(ARRAY['resident_engineer'])
    AND private.can_see_project(id)
  )
);
