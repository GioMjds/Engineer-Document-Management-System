-- ============================================================================
-- 20261022000000_project_milestones.sql
-- Augment projects table with milestones JSONB column for statutory regulatory dates
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '{}'::jsonb;
