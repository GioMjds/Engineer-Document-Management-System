-- ============================================================================
-- Supabase Database Seed File: Authority NOC Statutory Framework Defaults
-- ============================================================================

-- 1. Master Authorities Baseline (Jurisdictions in Dubai)
INSERT INTO public.master_authorities (id, name, jurisdiction)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Nakheel & Trakhees', 'JAFZA & Coastal Zones'),
  (2, 'Dubai Municipality', 'Mainland Dubai & Al Safat'),
  (3, 'Dubai Development Authority', 'TECOM & Free Zones')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, jurisdiction = EXCLUDED.jurisdiction;

-- 2. Reviewing Authorities Baseline
INSERT INTO public.reviewing_authorities (id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Trakhees'),
  (2, 'Nakheel'),
  (3, 'DEWA'),
  (4, 'Empower'),
  (5, 'RTA'),
  (6, 'EHS'),
  (7, 'DCAA'),
  (8, 'DM'),
  (9, 'DU'),
  (10, 'Etisalat'),
  (11, 'Green Building'),
  (12, 'Third Party'),
  (13, 'DCD'),
  (14, 'DDA')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- 3. Reset primary key sequence values to highest ID
SELECT setval(pg_get_serial_sequence('public.master_authorities', 'id'), coalesce(max(id), 1)) FROM public.master_authorities;
SELECT setval(pg_get_serial_sequence('public.reviewing_authorities', 'id'), coalesce(max(id), 1)) FROM public.reviewing_authorities;
