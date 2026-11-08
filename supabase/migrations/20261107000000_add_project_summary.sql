-- ============================================================================
-- 20261107000000_add_project_summary.sql
-- Add optional free-text summary to projects, separate from the project name
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS summary text;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_summary_length_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_summary_length_check
  CHECK (summary IS NULL OR char_length(summary) <= 500);
