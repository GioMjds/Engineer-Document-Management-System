import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[trimmed.slice(0, eqIdx).trim()]) {
            process.env[trimmed.slice(0, eqIdx).trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('--- SEEDING PROJECT 26002 (MVP WORKFLOW TESTBED) ---');

  // 1. Get Master Authority
  const { data: masterAuths } = await supabase.from('master_authorities').select('id, name');
  const masterAuth = masterAuths?.find(a => a.name.includes('Nakheel') || a.name.includes('Trakhees')) || masterAuths?.[0];
  if (!masterAuth) {
    throw new Error('No master authority found in database.');
  }
  console.log('Master Authority:', masterAuth.name, '(ID:', masterAuth.id, ')');

  // 2. Fetch User Profiles
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, email, full_name, role');
  if (profErr || !profiles) {
    throw new Error('Failed to fetch user profiles: ' + profErr?.message);
  }

  const findProfile = (email: string) => profiles.find(p => p.email?.toLowerCase() === email.toLowerCase());
  const adminUser = findProfile('admin@test.com');
  const reUser = findProfile('re@test.com');
  const amUser = findProfile('am3@test.com') || findProfile('am@test.com');
  const aeUser = findProfile('ae3@test.com') || findProfile('authority.eng@test.com');
  const dcUser = findProfile('dc@test.com');
  const archUser = findProfile('architect@test.com');
  const mepUser = findProfile('mep@test.com');
  const structUser = findProfile('structural@test.com');
  const civilUser = findProfile('civil@test.com');

  console.log('Profiles mapped for team staffing.');

  // 3. Check / Delete existing 26002 to reset
  const { data: existingProj } = await supabase.from('projects').select('id').eq('code', '26002').maybeSingle();
  if (existingProj) {
    console.log('Project 26002 already exists. Cleaning up existing project records...');
    await supabase.from('documents').delete().eq('project_id', existingProj.id);
    await supabase.from('project_nocs').delete().eq('project_id', existingProj.id);
    await supabase.from('project_members').delete().eq('project_id', existingProj.id);
    await supabase.from('project_confidential').delete().eq('project_id', existingProj.id);
    await supabase.from('projects').delete().eq('id', existingProj.id);
  }

  // 4. Create Project 26002
  const milestoneBaseline = {
    preConstruction: {
      kickoffDate: '2026-10-14',
      surveyCompletionDate: '2026-10-16',
      conceptApprovalDate: '2026-10-18',
      commencementDate: '2026-10-19',
      plannedCompletionDate: '2026-10-21',
      buildingPermitDate: '2026-10-22',
    },
    construction: {
      commencementDate: '2026-10-22',
      targetCompletionDate: '2026-11-15',
    },
    handover: {
      commissioningDate: '2026-11-20',
      civilDefenceInspectionDate: '2026-11-25',
      bccIssuanceDate: '2026-11-30',
      targetCompletionDate: '2026-12-15',
    },
  };

  const { data: newProj, error: projErr } = await supabase.from('projects').insert({
    code: '26002',
    description: 'Dubai Hills Commercial Pavilion',
    stage: 'design', // Maps to Pre-Construction
    client_name: 'Emaar Properties PJSC',
    contractor_name: 'Al Futtaim Construction',
    client_contractor_amount: 28000000,
    master_authority_id: masterAuth.id,
    client_emails: ['client@emaar.ae'],
    contractor_emails: ['contractor@alfuttaim.com'],
    created_by: adminUser?.id,
    milestones: milestoneBaseline,
  }).select('id').single();

  if (projErr || !newProj) {
    throw new Error('Failed to create Project 26002: ' + projErr?.message);
  }

  const projectId = newProj.id;
  console.log('Project 26002 created successfully (ID:', projectId, ')');

  // 5. Insert Confidential Consultant Amount (AED 2,100,000)
  await supabase.from('project_confidential').insert({
    project_id: projectId,
    client_consultant_amount: 2100000,
  });
  console.log('Confidential consultant sum inserted (AED 2,100,000)');

  // 6. Assign Team Members
  const teamAssignments = [
    { user: reUser, discipline: null },
    { user: amUser, discipline: null },
    { user: aeUser, discipline: null },
    { user: dcUser, discipline: null },
    { user: archUser, discipline: 'architect' },
    { user: mepUser, discipline: 'mep' },
    { user: structUser, discipline: 'structure' },
    { user: civilUser, discipline: 'civil' },
  ].filter(t => Boolean(t.user));

  const memberRows = teamAssignments.map(t => ({
    project_id: projectId,
    user_id: t.user!.id,
    discipline: t.discipline,
  }));

  await supabase.from('project_members').insert(memberRows);
  console.log('Assigned 8 team leads to Project 26002');

  // 7. Map Reviewing Authorities
  const { data: revAuths } = await supabase.from('reviewing_authorities').select('id, name');
  const getRevAuthId = (name: string) => revAuths?.find(r => r.name.toLowerCase() === name.toLowerCase())?.id || 1;

  // 8. Seed Statutory NOCs
  const nocRows = [
    {
      project_id: projectId,
      sequence_no: 1,
      stage: 'design',
      reviewing_authority_id: getRevAuthId('DEWA'),
      description: 'DEWA Substation & Electrical Load NOC',
      submitted_by: 'consultant',
      status_code: 'approved',
      payment_fee: 12000,
      is_paid: true,
      payer_type: 'contractor',
      receipt_file_url: 'https://storage.cvtec.ae/receipts/dewa-rcp-081.pdf',
      plan_date: '2026-10-16',
      apply_date: '2026-10-18',
      receive_date: '2026-10-20',
      expiry_date: '2027-10-20',
      reference_no: 'DEWA-SUB-2026-081',
      blocking_sequence_no: null,
      current_revision: 'R00',
    },
    {
      project_id: projectId,
      sequence_no: 2,
      stage: 'design',
      reviewing_authority_id: getRevAuthId('RTA'),
      description: 'RTA Traffic Impact & Right-of-Way Permit',
      submitted_by: 'specialist',
      status_code: 'approved',
      payment_fee: 4500,
      is_paid: true,
      payer_type: 'contractor',
      receipt_file_url: 'https://storage.cvtec.ae/receipts/rta-rcp-902.pdf',
      plan_date: '2026-10-18',
      apply_date: '2026-10-19',
      receive_date: '2026-10-21',
      expiry_date: '2026-11-04', // 13 days to expiry from 22 Oct 2026 -> TRIGGERS 14-DAY ALERT
      reference_no: 'RTA-ROW-2026-902',
      blocking_sequence_no: 1,
      current_revision: 'R00',
    },
    {
      project_id: projectId,
      sequence_no: 3,
      stage: 'design',
      reviewing_authority_id: getRevAuthId('Trakhees'),
      description: 'Master Authority Structural Engineering NOC',
      submitted_by: 'consultant',
      status_code: 'approved',
      payment_fee: 18000,
      is_paid: true,
      payer_type: 'contractor',
      receipt_file_url: 'https://storage.cvtec.ae/receipts/trk-rcp-441.pdf',
      plan_date: '2026-10-19',
      apply_date: '2026-10-20',
      receive_date: '2026-10-22',
      expiry_date: '2027-10-22',
      reference_no: 'TRK-STR-2026-441',
      blocking_sequence_no: 2,
      current_revision: 'R00',
    },
    {
      project_id: projectId,
      sequence_no: 4,
      stage: 'construction',
      reviewing_authority_id: getRevAuthId('DEWA'),
      description: 'Site Temporary Power & Dewatering NOC',
      submitted_by: 'contractor',
      status_code: 'not_started',
      payment_fee: 3000,
      is_paid: false,
      plan_date: '2026-10-24',
      blocking_sequence_no: 3,
      current_revision: 'R00',
    },
    {
      project_id: projectId,
      sequence_no: 5,
      stage: 'construction',
      reviewing_authority_id: getRevAuthId('Trakhees'),
      description: 'Core & Structural Superstructure Inspection NOC',
      submitted_by: 'consultant',
      status_code: 'not_started',
      payment_fee: 9500,
      is_paid: false,
      plan_date: '2026-11-05',
      blocking_sequence_no: 4,
      current_revision: 'R00',
    },
    {
      project_id: projectId,
      sequence_no: 6,
      stage: 'handover',
      reviewing_authority_id: getRevAuthId('DCD'),
      description: 'Final Civil Defence (DCD) Inspection & BCC NOC',
      submitted_by: 'consultant',
      status_code: 'not_started',
      payment_fee: 6000,
      is_paid: false,
      plan_date: '2026-11-25',
      blocking_sequence_no: 5,
      current_revision: 'R00',
    },
  ];

  await supabase.from('project_nocs').insert(nocRows);
  console.log('Inserted 6 lifecycle NOCs for Project 26002');

  // 9. Seed Project Documents
  const defaultUploader = civilUser?.id || adminUser?.id || profiles[0].id;

  const docRows = [
    {
      project_id: projectId,
      doc_number: '26002-TOPO-001',
      title: 'Topographical Affection Survey & Ground Benchmark Report',
      description: 'Site boundary affection and elevation survey benchmark coordinates',
      discipline: 'civil',
      revision: 'R00',
      status: 'approved',
      file_name: '26002-TOPO-001-SURVEY.pdf',
      file_path: '26002/civil/26002-TOPO-001-SURVEY.pdf',
      file_size: 2450000,
      mime_type: 'application/pdf',
      uploaded_by: civilUser?.id || defaultUploader,
    },
    {
      project_id: projectId,
      doc_number: '26002-GEO-002',
      title: 'Geotechnical Soil Investigation & Borehole Analysis',
      description: 'Deep borehole analysis and foundation soil bearing capacity report',
      discipline: 'civil',
      revision: 'R00',
      status: 'approved',
      file_name: '26002-GEO-002-REPORT.pdf',
      file_path: '26002/civil/26002-GEO-002-REPORT.pdf',
      file_size: 4890000,
      mime_type: 'application/pdf',
      uploaded_by: civilUser?.id || defaultUploader,
    },
    {
      project_id: projectId,
      doc_number: '26002-ARC-201',
      title: 'Pavilion Ground Floor Architecture & Elevation Layout',
      description: 'General architectural plan showing entrance, atrium and setbacks',
      discipline: 'architect',
      revision: 'R00',
      status: 'submitted', // In RE review queue!
      file_name: '26002-ARC-201-GROUND-PLAN.dwg',
      file_path: '26002/architect/26002-ARC-201-GROUND-PLAN.dwg',
      file_size: 3200000,
      mime_type: 'application/acad',
      uploaded_by: archUser?.id || defaultUploader,
    },
    {
      project_id: projectId,
      doc_number: '26002-STR-301',
      title: 'Steel Canopy Structural Connection Details',
      description: 'Special cantilever connection requiring Area Manager technical sign-off',
      discipline: 'structure',
      revision: 'R00',
      status: 'escalated', // In AM review queue!
      file_name: '26002-STR-301-STEEL-DETAILS.pdf',
      file_path: '26002/structure/26002-STR-301-STEEL-DETAILS.pdf',
      file_size: 1980000,
      mime_type: 'application/pdf',
      uploaded_by: structUser?.id || defaultUploader,
    },
    {
      project_id: projectId,
      doc_number: '26002-MEP-102',
      title: 'Substation Incomer & Electrical Distribution',
      description: 'Approved electrical load layout ready for authority submission package',
      discipline: 'mep',
      revision: 'R00',
      status: 'ready_for_authority', // Ready for Auth Eng submission!
      file_name: '26002-MEP-102-ELECTRICAL-INCOMER.pdf',
      file_path: '26002/mep/26002-MEP-102-ELECTRICAL-INCOMER.pdf',
      file_size: 1540000,
      mime_type: 'application/pdf',
      uploaded_by: mepUser?.id || defaultUploader,
    },
    {
      project_id: projectId,
      doc_number: '26002-ARC-099',
      title: 'Preliminary Concept Sketch (Superseded)',
      description: 'Draft concept sketch for DC archive & restore workflow demo',
      discipline: 'architect',
      revision: 'R00',
      status: 'draft',
      file_name: '26002-ARC-099-CONCEPT-SKETCH.pdf',
      file_path: '26002/architect/26002-ARC-099-CONCEPT-SKETCH.pdf',
      file_size: 850000,
      mime_type: 'application/pdf',
      uploaded_by: dcUser?.id || defaultUploader,
    },
  ];

  const { data: insertedDocs, error: docErr } = await supabase.from('documents').insert(docRows).select('id, doc_number');
  if (docErr) {
    console.error('Error inserting documents:', docErr.message);
  } else {
    console.log(`Seeded ${insertedDocs?.length} engineering drawings & specialist studies`);
  }

  console.log('--- SEEDING COMPLETE FOR PROJECT 26002 ---');
}

main().catch(console.error);
