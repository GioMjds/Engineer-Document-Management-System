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
  discipline?: 'architect' | 'mep' | 'structure' | 'civil';
}

export const SEED_USERS: SeedUser[] = [
  // --- Canonical Core Users ---
  { email: 'admin@test.com', fullName: 'System Administrator', role: 'admin' },
  { email: 'ceo@test.com', fullName: 'Chief Executive Officer', role: 'ceo' },
  { email: 'am@test.com', fullName: 'Regional Area Manager', role: 'area_manager' },
  { email: 're@test.com', fullName: 'Resident Engineer Lead', role: 'resident_engineer' },
  { email: 'authority.eng@test.com', fullName: 'Statutory Authority Engineer', role: 'authority_engineer' },
  { email: 'dc@test.com', fullName: 'Principal Document Controller', role: 'dc' },
  { email: 'engineer@test.com', fullName: 'Lead Discipline Engineer', role: 'engineer' },

  // --- Management & Permitting Oversight ---
  { email: 're2@test.com', fullName: 'Tariq Al-Mansoor (Resident Engineer)', role: 'resident_engineer' },
  { email: 're3@test.com', fullName: 'Sarah Jenkins (Senior Resident Engineer)', role: 'resident_engineer' },
  { email: 'ae2@test.com', fullName: 'Fatima Al-Zahra (Authority Engineer)', role: 'authority_engineer' },
  { email: 'ae3@test.com', fullName: 'Zayed Al-Hashimi (Statutory Liaison)', role: 'authority_engineer' },
  { email: 'am2@test.com', fullName: 'Marcus Vance (Area Manager)', role: 'area_manager' },
  { email: 'am3@test.com', fullName: 'Hassan Al-Maktoum (Operations Area Manager)', role: 'area_manager' },
  { email: 'dc2@test.com', fullName: 'Elena Rostova (Document Controller)', role: 'dc' },
  { email: 'dc3@test.com', fullName: 'Rashid Al-Khouri (Lead Document Controller)', role: 'dc' },

  // --- Discipline Engineers ---
  { email: 'architect@test.com', fullName: 'Liam Thorne (Architectural Engineer)', role: 'engineer', discipline: 'architect' },
  { email: 'architect2@test.com', fullName: 'Nour El-Din (Senior Architect)', role: 'engineer', discipline: 'architect' },
  { email: 'mep@test.com', fullName: 'Omar Farooq (MEP Engineer)', role: 'engineer', discipline: 'mep' },
  { email: 'mep2@test.com', fullName: 'Kavita Sharma (Senior MEP Engineer)', role: 'engineer', discipline: 'mep' },
  { email: 'structural@test.com', fullName: 'David Chen (Structural Engineer)', role: 'engineer', discipline: 'structure' },
  { email: 'structural2@test.com', fullName: 'Youssef Mansoor (Senior Structural Engineer)', role: 'engineer', discipline: 'structure' },
  { email: 'civil@test.com', fullName: 'Aisha Al-Nuaimi (Civil Engineer)', role: 'engineer', discipline: 'civil' },
  { email: 'civil2@test.com', fullName: 'Carlos Rivera (Infrastructure Civil Engineer)', role: 'engineer', discipline: 'civil' },
];

async function seedUsers() {
  console.log('=== SEEDING CVTEC EDMS USERS ===\n');
  console.log(`Default password: ${TEST_PASSWORD}\n`);

  // Fetch all existing auth users
  const { data: authData, error: authListError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authListError) {
    console.error('Failed to list auth users:', authListError.message);
    process.exit(1);
  }

  const existingAuthMap = new Map(authData.users.map((u) => [u.email?.toLowerCase(), u]));
  const userResults: Array<{ id: string; email: string; role: string; fullName: string; discipline?: string }> = [];

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
      // Ensure password and confirmation are up-to-date
      await supabase.auth.admin.updateUserById(userId, {
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: item.role,
          full_name: item.fullName,
        },
      });
    }

    // Upsert public.profiles
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
      userResults.push({ id: userId, email: item.email, role: item.role, fullName: item.fullName, discipline: item.discipline });
    }
  }

  // Assign team to active projects if available
  const { data: projects } = await supabase.from('projects').select('id, code, description');
  if (projects && projects.length > 0) {
    console.log(`\nFound ${projects.length} project(s) in database. Ensuring team assignments for active projects...`);
    for (const proj of projects) {
      // Check existing members
      const { data: existingMembers } = await supabase.from('project_members').select('user_id').eq('project_id', proj.id);
      if (!existingMembers || existingMembers.length === 0) {
        console.log(`Assigning full multidisciplinary team to project ${proj.code} (${proj.description})...`);
        const initialTeamEmails = [
          're@test.com',
          'authority.eng@test.com',
          'am@test.com',
          'dc@test.com',
          'architect@test.com',
          'mep@test.com',
          'structural@test.com',
          'civil@test.com',
        ];

        const memberRows = initialTeamEmails
          .map((e) => userResults.find((u) => u.email === e))
          .filter((u): u is NonNullable<typeof u> => Boolean(u))
          .map((u) => ({
            project_id: proj.id,
            user_id: u.id,
            discipline: u.discipline ?? null,
          }));

        if (memberRows.length > 0) {
          const { error: assignError } = await supabase.from('project_members').insert(memberRows);
          if (assignError) {
            console.error(`- Error assigning team to project ${proj.code}:`, assignError.message);
          } else {
            console.log(`✓ Assigned ${memberRows.length} members to project ${proj.code}`);
          }
        }
      } else {
        console.log(`Project ${proj.code} already has ${existingMembers.length} assigned member(s).`);
      }
    }
  }

  console.log('\nUser seeding complete! All users can log in with password:', TEST_PASSWORD);
}

seedUsers().catch(console.error);
