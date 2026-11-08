-- ============================================================================
-- 20261108010000_harden_matrix_rpcs.sql
-- Matrix RPCs trusted a caller-supplied p_caller_id; bind them to auth.uid()
-- ============================================================================

-- 1. Move the existing implementations to the unexposed private schema.
ALTER FUNCTION public.save_matrix_item_atomic(
  UUID, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) SET SCHEMA private;

ALTER FUNCTION public.create_matrix_item_atomic(
  INT, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) SET SCHEMA private;

-- 2. Pin their search_path and make them callable only by the public wrappers below.
ALTER FUNCTION private.save_matrix_item_atomic(
  UUID, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) SET search_path = '';

ALTER FUNCTION private.create_matrix_item_atomic(
  INT, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) SET search_path = '';

REVOKE ALL ON FUNCTION private.save_matrix_item_atomic(
  UUID, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.create_matrix_item_atomic(
  INT, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) FROM PUBLIC, anon, authenticated;

-- 3. Public wrappers keep the original signatures and reject any caller id that is not the JWT user.
CREATE FUNCTION public.save_matrix_item_atomic(
  p_matrix_item_id UUID,
  p_caller_id UUID,
  p_change_summary TEXT,
  p_description TEXT,
  p_stage public.noc_stage,
  p_reviewing_authority_id INT,
  p_submitted_by public.noc_submitter,
  p_blocking_seq INT,
  p_default_fee NUMERIC,
  p_validity_days INT,
  p_requirements JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_caller_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: caller id does not match the authenticated user.';
  END IF;

  RETURN private.save_matrix_item_atomic(
    p_matrix_item_id, p_caller_id, p_change_summary, p_description, p_stage,
    p_reviewing_authority_id, p_submitted_by, p_blocking_seq, p_default_fee,
    p_validity_days, p_requirements
  );
END;
$$;

CREATE FUNCTION public.create_matrix_item_atomic(
  p_master_authority_id INT,
  p_caller_id UUID,
  p_change_summary TEXT,
  p_description TEXT,
  p_stage public.noc_stage,
  p_reviewing_authority_id INT,
  p_submitted_by public.noc_submitter,
  p_blocking_seq INT,
  p_default_fee NUMERIC,
  p_validity_days INT,
  p_requirements JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_caller_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: caller id does not match the authenticated user.';
  END IF;

  RETURN private.create_matrix_item_atomic(
    p_master_authority_id, p_caller_id, p_change_summary, p_description, p_stage,
    p_reviewing_authority_id, p_submitted_by, p_blocking_seq, p_default_fee,
    p_validity_days, p_requirements
  );
END;
$$;

-- 4. The legacy 10-argument wrapper only forwards to save_matrix_item_atomic, so it runs as the caller.
ALTER FUNCTION public.propagate_matrix_item_change(
  UUID, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT
) SECURITY INVOKER SET search_path = '';

-- 5. Only signed-in users and the service role may call the public entry points.
REVOKE ALL ON FUNCTION public.save_matrix_item_atomic(
  UUID, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.create_matrix_item_atomic(
  INT, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.propagate_matrix_item_change(
  UUID, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.save_matrix_item_atomic(
  UUID, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_matrix_item_atomic(
  INT, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT, JSONB
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.propagate_matrix_item_change(
  UUID, UUID, TEXT, TEXT, public.noc_stage, INT, public.noc_submitter, INT, NUMERIC, INT
) TO authenticated, service_role;
