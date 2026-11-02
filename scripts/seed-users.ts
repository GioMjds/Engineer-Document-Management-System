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
const TEST_PASSWORD = process.env.TEST_ACCOUNTS_PASSWORD || 'cvtec123';

export interface SeedUser {
  email: string;
  fullName: string;
  role: 'admin' | 'ceo' | 'area_manager' | 'resident_engineer' | 'authority_engineer' | 'engineer' | 'dc';
}

export const SEED_USERS: SeedUser[] = [
  { email: 'admin@test.com', fullName: 'System Administrator', role: 'admin' },
  { email: 'ceo@test.com', fullName: 'Chief Executive Officer', role: 'ceo' },
  { email: 'am@test.com', fullName: 'Regional Area Manager', role: 'area_manager' },
  { email: 're@test.com', fullName: 'Resident Engineer', role: 'resident_engineer' },
  { email: 'authority.eng@test.com', fullName: 'Authority Engineer', role: 'authority_engineer' },
  { email: 'dc@test.com', fullName: 'Document Controller', role: 'dc' },
  { email: 'engineer@test.com', fullName: 'Discipline Engineer', role: 'engineer' },
];

async function seedUsers() {
  console.log('=== SEEDING CVTEC EDMS CANONICAL USERS ===\n');
  console.log(`Default password: ${TEST_PASSWORD}\n`);

  const { data: authData, error: authListError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authListError) {
    console.error('Failed to list auth users:', authListError.message);
    process.exit(1);
  }

  const existingAuthMap = new Map(authData.users.map((u) => [u.email?.toLowerCase(), u]));

  for (const item of SEED_USERS) {
    const emailKey = item.email.toLowerCase();
    let userId: string;

    const existingUser = existingAuthMap.get(emailKey);
    if (!existingUser) {
      console.log(`Creating auth user: ${item.email}...`);
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: item.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: item.role,
          full_name: item.fullName,
        },
      });

      if (createError || !created.user) {
        console.error(`- Error creating ${item.email}:`, createError?.message);
        continue;
      }
      userId = created.user.id;
    } else {
      userId = existingUser.id;
      await supabase.auth.admin.updateUserById(userId, {
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: item.role,
          full_name: item.fullName,
        },
      });
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        email: item.email,
        full_name: item.fullName,
        role: item.role,
        active: true,
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      console.error(`- Profile upsert error for ${item.email}:`, profileError.message);
    } else {
      console.log(`✓ Seeded ${item.role.padEnd(18)} : ${item.email} (${item.fullName})`);
    }
  }

  console.log('\nCanonical users ready! Password:', TEST_PASSWORD);
}

seedUsers().catch(console.error);
