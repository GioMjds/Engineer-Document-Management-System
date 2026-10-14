import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseSecret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecret);

const TEST_PASSWORD = process.env.TEST_ACCOUNTS_PASSWORD || 'cvtec123456';

const TEST_EMAILS = [
  'admin@test.com',
  'ceo@test.com',
  'am@test.com',
  're@test.com',
  'authority.eng@test.com',
  'engineer@test.com',
  'dc@test.com',
];

async function setTestPasswords() {
  console.log(`Setting password for test accounts to: ${TEST_PASSWORD}\n`);

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error || !data?.users) {
    console.error('Failed to list users:', error?.message);
    process.exit(1);
  }

  for (const email of TEST_EMAILS) {
    const user = data.users.find((u) => u.email === email);
    if (!user) {
      console.log(`- User not found: ${email}`);
      continue;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (updateError) {
      console.error(`- Failed to update ${email}:`, updateError.message);
    } else {
      console.log(`✓ Updated password for: ${email}`);
    }
  }

  console.log('\nAll test accounts are ready for login!');
}

setTestPasswords();
