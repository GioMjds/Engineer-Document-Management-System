-- ============================================================================
-- 20261108025000_drop_open_documents_policies.sql
-- Removes two dashboard-created policies on public.documents that override the role-scoped ones.
-- Found via live pg_policies; they are not defined in any earlier migration.
-- ============================================================================

-- "documents read" was USING (true): every user could read every document in every project.
-- Each role already has its own select policy (admin, am, auth_eng, ceo, dc, engineer, re).
DROP POLICY IF EXISTS "documents read" ON public.documents;

-- "documents insert" was WITH CHECK (auth.uid() = uploaded_by): any user could insert into any project.
-- Role-scoped inserts remain (admin_documents_all, dc, auth_eng, engineer).
DROP POLICY IF EXISTS "documents insert" ON public.documents;
