import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { navFor } from '../lib/permissions';

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
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
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

async function main() {
  console.log('=== CVTEC EDMS AUTHORITIES GOVERNANCE TEST ===\n');

  // 1. Navigation verification
  console.log('1. Verifying admin navigation item...');
  const adminNav = navFor('admin');
  const authoritiesNav = adminNav.find((item) => item.href === '/authorities');
  if (!authoritiesNav || authoritiesNav.label !== 'Authorities') {
    throw new Error(
      `Expected admin navigation to have { href: '/authorities', label: 'Authorities' }, got: ${JSON.stringify(authoritiesNav)}`,
    );
  }
  console.log('✓ Admin navigation includes Authorities (/authorities)');

  // 2. Database client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminClient = createClient(supabaseUrl, supabaseSecret);

  // 3. Query existing Master Authorities and Reviewing Authorities
  console.log('\n2. Querying database tables for master and reviewing authorities...');
  const { data: masters, error: mErr } = await adminClient
    .from('master_authorities')
    .select('id, name, jurisdiction')
    .order('id', { ascending: true });

  if (mErr) throw new Error(`Failed to query master_authorities: ${mErr.message}`);
  console.log(`✓ Master authorities found: ${masters?.length || 0}`);

  const { data: reviewing, error: rErr } = await adminClient
    .from('reviewing_authorities')
    .select('id, name')
    .order('id', { ascending: true });

  if (rErr) throw new Error(`Failed to query reviewing_authorities: ${rErr.message}`);
  console.log(`✓ Reviewing authorities found: ${reviewing?.length || 0}`);

  // 4. Test dynamic create, update, delete for reviewing authority
  const testName = `TEST_REV_${Date.now()}`;
  console.log(`\n3. Dynamically inserting reviewing authority: "${testName}"...`);
  const { data: inserted, error: insErr } = await adminClient
    .from('reviewing_authorities')
    .insert({ name: testName })
    .select('id, name')
    .single();

  if (insErr || !inserted) {
    throw new Error(`Failed to insert reviewing authority: ${insErr?.message}`);
  }
  console.log(`✓ Created reviewing authority ID #${inserted.id} ("${inserted.name}")`);

  const updatedName = `${testName}_UPDATED`;
  console.log(`4. Dynamically updating reviewing authority to "${updatedName}"...`);
  const { error: updErr } = await adminClient
    .from('reviewing_authorities')
    .update({ name: updatedName })
    .eq('id', inserted.id);

  if (updErr) throw new Error(`Failed to update reviewing authority: ${updErr.message}`);
  console.log(`✓ Updated reviewing authority ID #${inserted.id}`);

  console.log(`5. Dynamically deleting test reviewing authority...`);
  const { error: delErr } = await adminClient
    .from('reviewing_authorities')
    .delete()
    .eq('id', inserted.id);

  if (delErr) throw new Error(`Failed to delete reviewing authority: ${delErr.message}`);
  console.log(`✓ Deleted test reviewing authority ID #${inserted.id}`);

  console.log('\n======================================================');
  console.log('ALL AUTHORITIES GOVERNANCE CHECKS PASSED');
  console.log('======================================================');
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
