-- ============================================================================
-- 20261014000000_shared_foundation.sql
-- CVTEC EDMS Shared Foundation (F1 - F10)
-- ============================================================================

-- 1. Create private schema for security definer helpers
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Augment projects table with contract amounts, contractor name, contact emails
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS contractor_name TEXT,
  ADD COLUMN IF NOT EXISTS client_emails TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contractor_emails TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS client_contractor_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00;

-- 3. Augment project_members table with engineering discipline
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS discipline TEXT CHECK (discipline IN ('mep', 'architect', 'structure', 'civil'));

-- 4. Create project_confidential table for confidential consultant amounts
CREATE TABLE IF NOT EXISTS public.project_confidential (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  client_consultant_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Augment documents table for soft-delete archive
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id);

-- 6. Create document_reviews table with mandatory rejection comment constraint
CREATE TABLE IF NOT EXISTS public.document_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  revision_label TEXT NOT NULL DEFAULT 'R00',
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  level TEXT NOT NULL CHECK (level IN ('re', 'am', 'admin')),
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rejection_comment_required CHECK (
    decision != 'reject' OR (comment IS NOT NULL AND length(trim(comment)) > 0)
  )
);

-- 7. Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Security Definer Helper: private.has_role
CREATE OR REPLACE FUNCTION private.has_role(allowed_roles TEXT[])
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = ''
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role::text = ANY(allowed_roles)
      AND active = true
  );
$$;

-- 9. Security Definer Helper: private.can_see_project
CREATE OR REPLACE FUNCTION private.can_see_project(p_project UUID)
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = ''
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.active = true
      AND (
        p.role IN ('admin', 'ceo', 'area_manager')
        OR EXISTS (
          SELECT 1
          FROM public.project_members pm
          WHERE pm.project_id = p_project
            AND pm.user_id = p.id
        )
      )
  );
$$;

-- 10. Enable Row Level Security on newly created tables
ALTER TABLE public.project_confidential ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 11. Policies for project_confidential: Admin, CEO, and Area Manager only
DROP POLICY IF EXISTS "confidential_amounts_select" ON public.project_confidential;
CREATE POLICY "confidential_amounts_select"
ON public.project_confidential
FOR SELECT
USING (
  private.has_role(ARRAY['admin', 'ceo', 'area_manager'])
);

DROP POLICY IF EXISTS "confidential_amounts_admin_all" ON public.project_confidential;
CREATE POLICY "confidential_amounts_admin_all"
ON public.project_confidential
FOR ALL
USING (
  private.has_role(ARRAY['admin'])
)
WITH CHECK (
  private.has_role(ARRAY['admin'])
);

-- 12. Policies for document_reviews
DROP POLICY IF EXISTS "reviews_select" ON public.document_reviews;
CREATE POLICY "reviews_select"
ON public.document_reviews
FOR SELECT
USING (
  private.has_role(ARRAY['admin', 'ceo', 'area_manager'])
  OR EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id
      AND private.can_see_project(d.project_id)
  )
);

DROP POLICY IF EXISTS "reviews_insert_re" ON public.document_reviews;
CREATE POLICY "reviews_insert_re"
ON public.document_reviews
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['resident_engineer'])
  AND level = 're'
  AND reviewer_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_id
      AND private.can_see_project(d.project_id)
  )
);

DROP POLICY IF EXISTS "reviews_insert_am" ON public.document_reviews;
CREATE POLICY "reviews_insert_am"
ON public.document_reviews
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['area_manager'])
  AND level = 'am'
  AND reviewer_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "reviews_insert_admin" ON public.document_reviews;
CREATE POLICY "reviews_insert_admin"
ON public.document_reviews
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['admin'])
  AND reviewer_id = (SELECT auth.uid())
);

-- 13. Policies for audit_log: Admin SELECT only
DROP POLICY IF EXISTS "audit_log_admin_select" ON public.audit_log;
CREATE POLICY "audit_log_admin_select"
ON public.audit_log
FOR SELECT
USING (
  private.has_role(ARRAY['admin'])
);

DROP POLICY IF EXISTS "audit_log_authenticated_insert" ON public.audit_log;
CREATE POLICY "audit_log_authenticated_insert"
ON public.audit_log
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 14. Trigger on auth.users for safe profile creation without user_metadata trust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, active, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'engineer')::public.app_role,
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
