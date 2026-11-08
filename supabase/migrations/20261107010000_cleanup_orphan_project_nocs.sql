-- Remove not-started project NOCs whose matrix template was soft-deleted.
DELETE FROM public.project_nocs
WHERE status_code = 'not_started'
  AND matrix_item_id IN (
    SELECT id FROM public.noc_matrix_items WHERE active = false
  );
