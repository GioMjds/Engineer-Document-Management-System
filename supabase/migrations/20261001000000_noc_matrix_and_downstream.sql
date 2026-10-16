-- 1. Augment project_nocs with Phase 1 fee and audit columns
ALTER TABLE public.project_nocs
  ADD COLUMN IF NOT EXISTS payment_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payer_type TEXT CHECK (payer_type IN ('client', 'contractor', 'consultant_advance')),
  ADD COLUMN IF NOT EXISTS receipt_file_url TEXT,
  ADD COLUMN IF NOT EXISTS blocking_sequence_no INT,
  ADD COLUMN IF NOT EXISTS current_revision TEXT NOT NULL DEFAULT 'R00',
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS overridden_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ;

-- 2. Augment noc_matrix_items with sequence and fee columns
ALTER TABLE public.noc_matrix_items
  ADD COLUMN IF NOT EXISTS blocking_sequence_no INT,
  ADD COLUMN IF NOT EXISTS validity_days INT NOT NULL DEFAULT 365,
  ADD COLUMN IF NOT EXISTS default_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- 3. Create noc_matrix_requirements table
CREATE TABLE IF NOT EXISTS public.noc_matrix_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_item_id UUID NOT NULL REFERENCES public.noc_matrix_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create noc_matrix_revisions table
CREATE TABLE IF NOT EXISTS public.noc_matrix_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_authority_id INT NOT NULL REFERENCES public.master_authorities(id),
  matrix_item_id UUID REFERENCES public.noc_matrix_items(id),
  action TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  change_summary TEXT NOT NULL,
  previous_data JSONB,
  new_data JSONB,
  propagated_projects_count INT NOT NULL DEFAULT 0,
  propagated_nocs_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create project_noc_requirements table
CREATE TABLE IF NOT EXISTS public.project_noc_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_noc_id UUID NOT NULL REFERENCES public.project_nocs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_satisfied BOOLEAN NOT NULL DEFAULT FALSE,
  file_url TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create noc_resubmission_history table
CREATE TABLE IF NOT EXISTS public.noc_resubmission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_noc_id UUID NOT NULL REFERENCES public.project_nocs(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  rejection_reason TEXT NOT NULL,
  rejection_date TIMESTAMPTZ NOT NULL,
  resubmission_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  resubmitted_by UUID NOT NULL REFERENCES public.profiles(id)
);

ALTER TABLE public.noc_matrix_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_matrix_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_noc_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noc_resubmission_history ENABLE ROW LEVEL SECURITY;

-- Read policies: authenticated users
DROP POLICY IF EXISTS "Allow read matrix requirements" ON public.noc_matrix_requirements;
CREATE POLICY "Allow read matrix requirements" ON public.noc_matrix_requirements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read matrix revisions" ON public.noc_matrix_revisions;
CREATE POLICY "Allow read matrix revisions" ON public.noc_matrix_revisions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read project requirements" ON public.project_noc_requirements;
CREATE POLICY "Allow read project requirements" ON public.project_noc_requirements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read resubmission history" ON public.noc_resubmission_history;
CREATE POLICY "Allow read resubmission history" ON public.noc_resubmission_history
  FOR SELECT TO authenticated USING (true);

-- Write policies: restricted to authority_engineer, dc, admin
DROP POLICY IF EXISTS "Allow write matrix requirements" ON public.noc_matrix_requirements;
CREATE POLICY "Allow write matrix requirements" ON public.noc_matrix_requirements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'authority_engineer', 'dc')));

CREATE OR REPLACE FUNCTION public.propagate_matrix_item_change(
  p_matrix_item_id UUID,
  p_caller_id UUID,
  p_change_summary TEXT,
  p_description TEXT,
  p_stage public.noc_stage,
  p_reviewing_authority_id INT,
  p_submitted_by public.noc_submitter,
  p_blocking_seq INT,
  p_default_fee NUMERIC,
  p_validity_days INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_master_auth_id INT;
  v_old_data JSONB;
  v_new_data JSONB;
  v_projects_updated INT := 0;
  v_nocs_updated INT := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_caller_id AND role IN ('admin', 'authority_engineer', 'dc')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only Admin, Authority Engineer, or DC can modify matrix templates.';
  END IF;

  SELECT master_authority_id, to_jsonb(m) INTO v_master_auth_id, v_old_data
  FROM public.noc_matrix_items m WHERE id = p_matrix_item_id;

  UPDATE public.noc_matrix_items
  SET description = p_description,
      stage = p_stage,
      reviewing_authority_id = p_reviewing_authority_id,
      submitted_by = p_submitted_by,
      blocking_sequence_no = p_blocking_seq,
      default_fee = p_default_fee,
      validity_days = p_validity_days,
      updated_at = now()
  WHERE id = p_matrix_item_id;

  v_new_data := jsonb_build_object(
    'description', p_description,
    'stage', p_stage,
    'reviewing_authority_id', p_reviewing_authority_id,
    'submitted_by', p_submitted_by,
    'blocking_sequence_no', p_blocking_seq,
    'default_fee', p_default_fee,
    'validity_days', p_validity_days
  );

  WITH updated_rows AS (
    UPDATE public.project_nocs pn
    SET description = p_description,
        stage = p_stage,
        reviewing_authority_id = p_reviewing_authority_id,
        submitted_by = p_submitted_by,
        blocking_sequence_no = p_blocking_seq,
        payment_fee = CASE WHEN pn.is_paid THEN pn.payment_fee ELSE p_default_fee END,
        updated_at = now(),
        updated_by = p_caller_id
    FROM public.projects p
    WHERE pn.project_id = p.id
      AND p.master_authority_id = v_master_auth_id
      AND p.archived_at IS NULL
      AND p.stage != 'completed'
      AND pn.matrix_item_id = p_matrix_item_id
      AND pn.status_code != 'approved'
    RETURNING pn.id, pn.project_id
  )
  SELECT COUNT(*), COUNT(DISTINCT project_id)
  INTO v_nocs_updated, v_projects_updated
  FROM updated_rows;

  INSERT INTO public.noc_matrix_revisions (
    master_authority_id,
    matrix_item_id,
    action,
    changed_by,
    change_summary,
    previous_data,
    new_data,
    propagated_projects_count,
    propagated_nocs_count
  ) VALUES (
    v_master_auth_id,
    p_matrix_item_id,
    'UPDATE',
    p_caller_id,
    p_change_summary,
    v_old_data,
    v_new_data,
    v_projects_updated,
    v_nocs_updated
  );

  RETURN jsonb_build_object(
    'success', true,
    'projects_updated', v_projects_updated,
    'nocs_updated', v_nocs_updated
  );
END;
$$;
