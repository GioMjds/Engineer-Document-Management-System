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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecret);

const TEST_PASSWORD = process.env.TEST_ACCOUNTS_PASSWORD || 'cvtec123';

const TEST_EMAILS = [
  'admin@test.com',
  'ceo@test.com',
  'am@test.com',
  're@test.com',
  'authority.eng@test.com',
  'engineer@test.com',
  'dc@test.com',
  're2@test.com',
  're3@test.com',
  'ae2@test.com',
  'ae3@test.com',
  'am2@test.com',
  'am3@test.com',
  'dc2@test.com',
  'dc3@test.com',
  'architect@test.com',
  'architect2@test.com',
  'mep@test.com',
  'mep2@test.com',
  'structural@test.com',
  'structural2@test.com',
  'civil@test.com',
  'civil2@test.com',
];

function isTestUser(email: string | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (lower.endsWith('@gmail.com') || lower.endsWith('@cvtec.ae')) {
    return false;
  }
  return lower.endsWith('@test.com') || TEST_EMAILS.includes(lower);
}

async function setTestPasswords() {
  console.log(`Setting password for test accounts to: ${TEST_PASSWORD}\n`);

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data?.users) {
    console.error('Failed to list users:', error?.message);
    process.exit(1);
  }

  const allUsers = data.users;
  const testUsers = allUsers.filter((u) => isTestUser(u.email));
  const nonTestUsers = allUsers.filter((u) => !isTestUser(u.email));

  console.log(`Found ${allUsers.length} total users in Supabase Auth.`);
  console.log(`- Test users to update: ${testUsers.length}`);
  console.log(`- Non-test users preserved (unmodified): ${nonTestUsers.length}`);
  nonTestUsers.forEach((u) => console.log(`  [PRESERVED] ${u.email} (${u.id})`));
  console.log('');

  let updatedCount = 0;
  for (const user of testUsers) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (updateError) {
      console.error(`- Failed to update ${user.email}:`, updateError.message);
    } else {
      console.log(`✓ Updated password for: ${user.email}`);
      updatedCount++;
    }
  }

  console.log(`\nAll ${updatedCount} test accounts are ready for login with password: ${TEST_PASSWORD}`);
}

setTestPasswords().catch(console.error);
