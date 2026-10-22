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
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
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

const REVIEWING_AUTH_NAMES = [
  'Trakhees',
  'Nakheel',
  'DEWA',
  'Empower',
  'RTA',
  'EHS',
  'DCAA',
  'DM',
  'DU',
  'Etisalat',
  'Green Building',
  'Third Party',
  'DCD',
  'DDA',
];

async function main() {
  console.log('Seeding reviewing authorities...');
  const revAuthMap = new Map<string, number>();

  for (const name of REVIEWING_AUTH_NAMES) {
    const { data: existing } = await supabase.from('reviewing_authorities').select('id, name').eq('name', name).maybeSingle();
    if (existing) {
      revAuthMap.set(name, existing.id);
    } else {
      const { data: inserted, error } = await supabase.from('reviewing_authorities').insert({ name }).select('id, name').single();
      if (error) {
        console.error('Error inserting reviewing authority', name, error.message);
      } else if (inserted) {
        revAuthMap.set(name, inserted.id);
      }
    }
  }

  console.log('Reviewing authorities mapped:', Array.from(revAuthMap.entries()));

  const { data: p } = await supabase.from('projects').select('id, code').eq('code', '26001').single();
  if (!p) {
    console.error('Project 26001 not found');
    return;
  }
  console.log('Project 26001 found:', p.id);

  // Check if NOCs exist for 26001
  const { data: existingNocs } = await supabase.from('project_nocs').select('id').eq('project_id', p.id);
  if (existingNocs && existingNocs.length > 0) {
    console.log(`Project 26001 already has ${existingNocs.length} NOCs.`);
    return;
  }

  console.log('Inserting statutory NOCs for Project 26001...');
  const nocDefs = [
    {
      sequence_no: 1,
      stage: 'design',
      authName: 'DEWA',
      description: 'DEWA Substation & Electrical Load NOC',
      submitted_by: 'consultant',
      status_code: 'not_started',
      payment_fee: 15000,
      is_paid: false,
      plan_date: '2026-10-25',
      blocking_sequence_no: null,
      current_revision: 'R00',
      reqs: [
        'Electrical Load Schedule',
        'Substation & Main Electrical Incomer Layout (MEP-E-101)',
        'Consultant NOC Authorization Letter',
      ],
    },
    {
      sequence_no: 2,
      stage: 'design',
      authName: 'RTA',
      description: 'RTA Traffic Impact & Right-of-Way Permit',
      submitted_by: 'specialist',
      status_code: 'not_started',
      payment_fee: 5000,
      is_paid: false,
      plan_date: '2026-10-28',
      blocking_sequence_no: 1,
      current_revision: 'R00',
      reqs: [
        'Traffic Impact Study Report',
        'Road Tie-in & Access Layout',
        'Master Concept Plan & Elevations (ARC-P-001)',
      ],
    },
    {
      sequence_no: 3,
      stage: 'design',
      authName: 'Trakhees',
      description: 'Master Authority Structural Engineering NOC',
      submitted_by: 'consultant',
      status_code: 'not_started',
      payment_fee: 25000,
      is_paid: false,
      plan_date: '2026-11-05',
      blocking_sequence_no: 2,
      current_revision: 'R00',
      reqs: [
        'Geotechnical Soil Investigation Report',
        'Structural Design Calculations & Foundation Drawings',
        'Boundary Affection Survey Coordinates',
      ],
    },
    {
      sequence_no: 4,
      stage: 'construction',
      authName: 'DEWA',
      description: 'Site Temporary Power & Dewatering NOC',
      submitted_by: 'contractor',
      status_code: 'not_started',
      payment_fee: 3500,
      is_paid: false,
      plan_date: '2026-11-20',
      blocking_sequence_no: 3,
      current_revision: 'R00',
      reqs: [
        'Site Dewatering Discharge Scheme',
        'Contractor Temporary Power Connection Demand',
      ],
    },
    {
      sequence_no: 5,
      stage: 'construction',
      authName: 'Trakhees',
      description: 'Core & Structural Superstructure Inspection NOC',
      submitted_by: 'consultant',
      status_code: 'not_started',
      payment_fee: 12000,
      is_paid: false,
      plan_date: '2027-01-15',
      blocking_sequence_no: 4,
      current_revision: 'R00',
      reqs: [
        'Superstructure Concrete Pour Inspection Records',
        'Third-Party Steel Core Ultrasonic Testing Report',
      ],
    },
    {
      sequence_no: 6,
      stage: 'handover',
      authName: 'DCD',
      description: 'Final Civil Defence (DCD) Inspection & BCC NOC',
      submitted_by: 'consultant',
      status_code: 'not_started',
      payment_fee: 7500,
      is_paid: false,
      plan_date: '2027-06-30',
      blocking_sequence_no: 5,
      current_revision: 'R00',
      reqs: [
        'As-Built Fire Protection & Smoke Extraction Certificate',
        'Civil Defence Site Completion Audit Sign-off',
      ],
    },
  ];

  for (const n of nocDefs) {
    const reviewing_authority_id = revAuthMap.get(n.authName);
    if (!reviewing_authority_id) {
      console.error('Missing reviewing authority id for', n.authName);
      continue;
    }
    const { reqs, authName, ...nocData } = n;
    const { data: inserted, error: iErr } = await supabase.from('project_nocs').insert({
      project_id: p.id,
      reviewing_authority_id,
      ...nocData,
    }).select('id').single();

    if (iErr) {
      console.error('Error inserting NOC seq', n.sequence_no, iErr.message);
      continue;
    }

    if (inserted && reqs.length > 0) {
      const reqRows = reqs.map((title) => ({
        project_noc_id: inserted.id,
        title,
        is_satisfied: false,
      }));
      await supabase.from('project_noc_requirements').insert(reqRows);
    }
  }

  console.log('Successfully seeded NOCs for Project 26001!');
}

main().catch(console.error);
