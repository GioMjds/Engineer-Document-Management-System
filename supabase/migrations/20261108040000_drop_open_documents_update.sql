-- ============================================================================
-- 20261108040000_drop_open_documents_update.sql
-- Removes a dashboard-created policy on public.documents found via live pg_policies.
-- ============================================================================

-- "documents update" was USING (true) for authenticated: any user could update any document row.
-- Role-scoped updates remain: admin_documents_all, dc_documents_update, auth_eng_documents_update,
-- re_documents_status_update, am_documents_status_update.
DROP POLICY IF EXISTS "documents update" ON public.documents;
