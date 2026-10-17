import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { can, navFor, ROLES } from '../lib/permissions';

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

console.log('=== CVTEC EDMS AUDIT LOG & COMPLIANCE VERIFICATION ===\n');

// 1. Verify Permissions
console.log('1. Checking audit.view permissions across all roles...');
if (!can('admin', 'audit.view')) {
  throw new Error('Admin MUST have audit.view capability!');
}

const nonAdminRoles = ROLES.filter((r) => r !== 'admin');
for (const role of nonAdminRoles) {
  if (can(role, 'audit.view')) {
    throw new Error(`Role "${role}" must NOT have audit.view capability!`);
  }
}
console.log('✓ audit.view capability is strictly restricted to Admin only');

// 2. Verify Navigation Items
console.log('2. Checking navigation for admin vs non-admin roles...');
const adminNav = navFor('admin');
if (!adminNav.some((item) => item.href === '/audit-logs')) {
  throw new Error('Admin navigation MUST include /audit-logs');
}

for (const role of nonAdminRoles) {
  const roleNav = navFor(role);
  if (roleNav.some((item) => item.href === '/audit-logs')) {
    throw new Error(`Role "${role}" navigation must NOT include /audit-logs`);
  }
}
console.log('✓ /audit-logs route is only visible in Admin navigation menu');

// 3. Database Audit Record Insertion and Query
console.log('3. Checking audit_log database operations...');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseSecret);

async function verifyDatabaseAudit() {
  const testId = 'test-doc-' + Date.now();
  
  // Insert test audit record
  const { data: inserted, error: insertError } = await supabase
    .from('audit_log')
    .insert({
      action: 'DOCUMENT_ARCHIVE',
      entity: 'documents',
      entity_id: testId,
      metadata: {
        title: 'Architectural Floor Plan Level 01',
        doc_number: 'CVTEC-ARC-101',
        previous_status: 'submitted',
        reason: 'Superseded by R01 revision',
      },
    })
    .select('id, action, entity, entity_id, metadata, created_at')
    .single();

  if (insertError) {
    throw new Error(`Failed to insert audit_log row: ${insertError.message}`);
  }
  console.log('✓ Inserted test audit record for DOCUMENT_ARCHIVE:', inserted.id);

  // Query audit record with profile relation
  const { data: queried, error: queryError } = await supabase
    .from('audit_log')
    .select('id, action, entity, entity_id, metadata, created_at, actor:profiles(id, full_name, email, role)')
    .eq('id', inserted.id)
    .single();

  if (queryError) {
    throw new Error(`Failed to query audit_log row: ${queryError.message}`);
  }

  if (queried.action !== 'DOCUMENT_ARCHIVE' || queried.entity_id !== testId) {
    throw new Error('Audit log queried record mismatch!');
  }
  console.log('✓ Successfully retrieved audit record with relation');

  // Insert second test record for USER_ROLE_UPDATE
  const { data: userAudit, error: userAuditErr } = await supabase
    .from('audit_log')
    .insert({
      action: 'USER_ROLE_UPDATE',
      entity: 'profiles',
      entity_id: 'test-user-id',
      metadata: {
        target_email: 'engineer@cvtec.ae',
        previous_role: 'engineer',
        new_role: 'resident_engineer',
      },
    })
    .select('id')
    .single();

  if (userAuditErr) {
    throw new Error(`Failed to insert USER_ROLE_UPDATE audit record: ${userAuditErr.message}`);
  }
  console.log('✓ Inserted test audit record for USER_ROLE_UPDATE:', userAudit.id);

  // Clean up test records
  await supabase.from('audit_log').delete().in('id', [inserted.id, userAudit.id]);
  console.log('✓ Cleaned up test audit records');

  console.log('\n=== ALL AUDIT LOG VERIFICATIONS PASSED SUCCESSFULLY ===');
}

verifyDatabaseAudit().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
