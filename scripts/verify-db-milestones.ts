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

async function main() {
  console.log('--- Testing Database Milestones Persistence on Project 26001 ---');

  const testMilestones = {
    preConstruction: {
      kickoffDate: '2026-10-21',
      surveyCompletionDate: '2026-10-21',
      conceptApprovalDate: '2026-10-21',
      commencementDate: '2026-10-21',
      plannedCompletionDate: '2026-10-21',
      buildingPermitDate: '2026-10-21',
    },
    construction: {
      commencementDate: '2026-10-21',
      targetCompletionDate: '2026-10-21',
      extensionOfTimeDate: '2026-10-21',
    },
  };

  // 1. Update project 26001 milestones in Supabase
  const { error: updateError } = await supabase
    .from('projects')
    .update({ milestones: testMilestones })
    .eq('code', '26001');

  if (updateError) {
    console.error('FAIL: Database update error:', updateError.message);
    process.exit(1);
  }
  console.log('PASS: Successfully updated milestones in Supabase');

  // 2. Query project 26001 back from Supabase
  const { data: project, error: selectError } = await supabase
    .from('projects')
    .select('id, code, description, stage, milestones')
    .eq('code', '26001')
    .single();

  if (selectError || !project) {
    console.error('FAIL: Database select error:', selectError?.message);
    process.exit(1);
  }

  const saved = project.milestones as any;
  if (
    saved?.preConstruction?.conceptApprovalDate === '2026-10-21' &&
    saved?.preConstruction?.buildingPermitDate === '2026-10-21'
  ) {
    console.log('PASS: Verified milestones retrieved from Supabase:', JSON.stringify(saved.preConstruction));
  } else {
    console.error('FAIL: Milestones mismatch:', saved);
    process.exit(1);
  }

  console.log('--- ALL DATABASE PERSISTENCE TESTS PASSED ---');
}

main();
