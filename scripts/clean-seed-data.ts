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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseSecret) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecret);

async function cleanStorage() {
  console.log('Cleaning storage bucket: documents...');
  const { data: topItems } = await supabase.storage.from('documents').list();
  if (topItems && topItems.length > 0) {
    for (const item of topItems) {
      if (item.id === null || !item.name) continue;
      // If it's a folder (like user UUID), list files inside
      const { data: subItems } = await supabase.storage.from('documents').list(item.name);
      if (subItems && subItems.length > 0) {
        const filePaths = subItems.map((f) => `${item.name}/${f.name}`);
        const { error } = await supabase.storage.from('documents').remove(filePaths);
        if (error) console.error(`Error deleting files in ${item.name}:`, error.message);
        else console.log(`Deleted ${filePaths.length} files in folder ${item.name}`);
      }
      // Also attempt to delete item directly
      await supabase.storage.from('documents').remove([item.name]);
    }
  }
  console.log('Storage clean complete.');
}

async function main() {
  console.log('=== CLEANING SEEDED DATA FROM SUPABASE ===\n');

  // 1. Delete storage files
  await cleanStorage();

  // 2. Delete reviews
  console.log('Deleting reviews...');
  const { error: revErr } = await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (revErr) console.warn('reviews delete notice:', revErr.message);

  // 3. Delete document_reviews (if table exists)
  const { error: docRevErr } = await supabase.from('document_reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (docRevErr) console.warn('document_reviews delete notice:', docRevErr.message);

  // 4. Delete documents
  console.log('Deleting documents...');
  const { error: docErr } = await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (docErr) console.error('Error deleting documents:', docErr.message);
  else console.log('✓ Documents deleted.');

  // 5. Delete project_noc_requirements
  console.log('Deleting project_noc_requirements...');
  const { error: reqErr } = await supabase.from('project_noc_requirements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (reqErr) console.warn('project_noc_requirements delete notice:', reqErr.message);

  // 6. Delete noc_resubmission_history
  console.log('Deleting noc_resubmission_history...');
  const { error: resubErr } = await supabase.from('noc_resubmission_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (resubErr) console.warn('noc_resubmission_history delete notice:', resubErr.message);

  // 7. Delete project_nocs
  console.log('Deleting project_nocs...');
  const { error: nocErr } = await supabase.from('project_nocs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (nocErr) console.error('Error deleting project_nocs:', nocErr.message);
  else console.log('✓ Project NOCs deleted.');

  // 8. Delete project_confidential
  console.log('Deleting project_confidential...');
  const { error: confErr } = await supabase.from('project_confidential').delete().neq('project_id', '00000000-0000-0000-0000-000000000000');
  if (confErr) console.warn('project_confidential delete notice:', confErr.message);

  // 9. Delete project_members
  console.log('Deleting project_members...');
  const { error: memErr } = await supabase.from('project_members').delete().neq('project_id', '00000000-0000-0000-0000-000000000000');
  if (memErr) console.error('Error deleting project_members:', memErr.message);
  else console.log('✓ Project members deleted.');

  // 10. Delete projects
  console.log('Deleting projects (23015, 23016)...');
  const { error: projErr } = await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (projErr) console.error('Error deleting projects:', projErr.message);
  else console.log('✓ Projects deleted.');

  // 11. Clear audit_log of test records
  console.log('Clearing audit_log...');
  const { error: auditErr } = await supabase.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (auditErr) console.warn('audit_log delete notice:', auditErr.message);

  console.log('\n--- VERIFYING CLEAN DATABASE STATE ---');
  const tables = [
    'projects',
    'project_members',
    'project_confidential',
    'project_nocs',
    'documents',
    'reviews',
    'profiles',
    'master_authorities',
    'reviewing_authorities',
    'noc_matrix_items',
  ];

  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`${t}: ${count} rows`);
  }

  console.log('\nSeeded data removal completed successfully.');
}

main().catch(console.error);
