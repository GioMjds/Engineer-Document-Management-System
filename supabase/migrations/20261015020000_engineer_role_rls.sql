DROP POLICY IF EXISTS "engineer_documents_select" ON public.documents;
CREATE POLICY "engineer_documents_select"
ON public.documents
FOR SELECT
USING (
  private.has_role(ARRAY['engineer'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
);

DROP POLICY IF EXISTS "engineer_documents_insert" ON public.documents;
CREATE POLICY "engineer_documents_insert"
ON public.documents
FOR INSERT
WITH CHECK (
  private.has_role(ARRAY['engineer'])
  AND (project_id IS NULL OR private.can_see_project(project_id))
  AND uploaded_by = (SELECT auth.uid())
);
