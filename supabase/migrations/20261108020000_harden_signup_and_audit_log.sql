-- ============================================================================
-- 20261108020000_harden_signup_and_audit_log.sql
-- Stop trusting user_metadata for roles; stop letting users forge audit rows
-- ============================================================================

-- 1. New profiles always start as engineer; the invite flow sets the real role with the service role.
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
    'engineer'::public.app_role,
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

-- 2. Audit rows must be attributed to the signed-in, active user who writes them.
DROP POLICY IF EXISTS "audit_log_authenticated_insert" ON public.audit_log;
CREATE POLICY "audit_log_authenticated_insert"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = (SELECT auth.uid())
  AND private.has_role(
    ARRAY['admin', 'ceo', 'area_manager', 'resident_engineer', 'authority_engineer', 'engineer', 'dc']
  )
);
