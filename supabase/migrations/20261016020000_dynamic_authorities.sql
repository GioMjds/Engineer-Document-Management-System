-- ============================================================================
-- 20261016020000_dynamic_authorities.sql
-- CVTEC EDMS Dynamic Master and Reviewing Authorities
-- ============================================================================

-- 1. Augment master_authorities table with optional jurisdiction column
ALTER TABLE public.master_authorities
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT;

-- 2. Ensure RLS is enabled on master and reviewing authority lookup tables
ALTER TABLE public.master_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewing_authorities ENABLE ROW LEVEL SECURITY;

-- 3. Read policies: all authenticated users can view authorities
DROP POLICY IF EXISTS "master_authorities_select" ON public.master_authorities;
CREATE POLICY "master_authorities_select"
ON public.master_authorities
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "reviewing_authorities_select" ON public.reviewing_authorities;
CREATE POLICY "reviewing_authorities_select"
ON public.reviewing_authorities
FOR SELECT
TO authenticated
USING (true);

-- 4. Write policies for master_authorities: strictly admin
DROP POLICY IF EXISTS "master_authorities_admin_all" ON public.master_authorities;
CREATE POLICY "master_authorities_admin_all"
ON public.master_authorities
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  )
);

-- 5. Write policies for reviewing_authorities: admin, authority_engineer, dc
DROP POLICY IF EXISTS "reviewing_authorities_write" ON public.reviewing_authorities;
CREATE POLICY "reviewing_authorities_write"
ON public.reviewing_authorities
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'authority_engineer', 'dc') AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'authority_engineer', 'dc') AND active = true
  )
);
