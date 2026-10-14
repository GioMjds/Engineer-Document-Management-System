import {
  ROLES,
  can,
  canEditDocument,
  normalizeRole,
  reviewStageFor,
  navFor,
  type AppRole,
} from '../lib/permissions';

console.log('=== CVTEC EDMS FOUNDATION & ADMIN PERMISSIONS VERIFICATION ===\n');

// 1. Verify 7 Canonical Roles
if (ROLES.length !== 7) {
  throw new Error(`Expected exactly 7 roles, found ${ROLES.length}`);
}
console.log('✓ Canonical Roles verified (7 roles):', ROLES.join(', '));

// 2. Verify Role Normalization (legacy migrations)
if (normalizeRole('doc_controller') !== 'dc') {
  throw new Error('normalizeRole(doc_controller) failed to normalize to dc');
}
if (normalizeRole('manager') !== 'area_manager') {
  throw new Error('normalizeRole(manager) failed to normalize to area_manager');
}
if (normalizeRole('admin') !== 'admin') {
  throw new Error('normalizeRole(admin) failed');
}
if (normalizeRole('invalid_role') !== null) {
  throw new Error('normalizeRole(invalid_role) did not return null');
}
console.log('✓ Role normalization verified (legacy doc_controller -> dc, manager -> area_manager)');

// 3. Verify Admin Capabilities (Full governance)
if (!can('admin', 'users.manage') || !can('admin', 'project.create') || !can('admin', 'archive.purge') || !can('admin', 'noc.sequence.override')) {
  throw new Error('Admin lacks core governance capabilities!');
}
if (reviewStageFor('admin') !== 'any') {
  throw new Error('Admin should be able to review at any stage');
}
console.log('✓ Admin governance capabilities verified');

// 4. Verify CEO Isolation (Strictly read-only)
const ceoForbidden = [
  'document.upload',
  'document.edit',
  'document.archive',
  'archive.purge',
  'review.decide',
  'noc.matrix.edit',
  'noc.tracker.update',
  'noc.sequence.override',
  'users.manage',
] as const;

for (const cap of ceoForbidden) {
  if (can('ceo', cap)) {
    throw new Error(`CEO holds forbidden mutation capability: ${cap}`);
  }
}
if (!can('ceo', 'amount.consultant.view') || !can('ceo', 'amount.contractor.view')) {
  throw new Error('CEO should view both consultant and contractor financial amounts');
}
console.log('✓ CEO read-only isolation verified (zero mutation rights, full financial visibility)');

// 5. Verify Area Manager (Level-2 review, no uploads, no fee recording)
if (!can('area_manager', 'review.decide') || reviewStageFor('area_manager') !== 'second') {
  throw new Error('Area Manager must be level-2 reviewer');
}
if (can('area_manager', 'document.upload') || can('area_manager', 'document.edit') || can('area_manager', 'noc.tracker.update')) {
  throw new Error('Area Manager holds forbidden upload or fee-recording capabilities');
}
if (!can('area_manager', 'amount.consultant.view')) {
  throw new Error('Area Manager must have visibility into confidential consultant amount');
}
console.log('✓ Area Manager capabilities verified (second-level review, zero upload, no fee recording)');

// 6. Verify Resident Engineer (Level-1 review, own uploads only, no confidential amounts)
if (!can('resident_engineer', 'review.decide') || reviewStageFor('resident_engineer') !== 'first') {
  throw new Error('Resident Engineer must be level-1 reviewer');
}
if (can('resident_engineer', 'amount.consultant.view')) {
  throw new Error('Resident Engineer must NOT see confidential consultant amount');
}
if (can('resident_engineer', 'document.archive') || can('resident_engineer', 'archive.purge')) {
  throw new Error('Resident Engineer must NOT archive or purge documents');
}
console.log('✓ Resident Engineer capabilities verified (first-level review, confidential amount hidden)');

// 7. Verify Authority Engineer (NOC pipeline owner, no review rights, no purge)
if (!can('authority_engineer', 'noc.matrix.edit') || !can('authority_engineer', 'noc.tracker.update')) {
  throw new Error('Authority Engineer must be able to edit matrix and tracker');
}
if (can('authority_engineer', 'review.decide')) {
  throw new Error('Authority Engineer must NOT decide drawing reviews');
}
if (can('authority_engineer', 'noc.sequence.override')) {
  throw new Error('Authority Engineer must NOT override NOC sequence (Admin only)');
}
console.log('✓ Authority Engineer permitting capabilities verified');

// 8. Verify Document Controller (Document CRUD & archive, NO user management, NO drawing approval)
if (can('dc', 'users.manage')) {
  throw new Error('DC must NOT have user management privileges!');
}
if (can('dc', 'review.decide')) {
  throw new Error('DC must NOT have drawing review privileges!');
}
if (can('dc', 'archive.purge')) {
  throw new Error('DC must NOT have purge privileges!');
}
if (can('dc', 'amount.consultant.view')) {
  throw new Error('DC must NOT view confidential consultant amounts!');
}
if (!can('dc', 'document.archive') || !can('dc', 'archive.restore') || !can('dc', 'document.edit')) {
  throw new Error('DC must be able to edit, archive, and restore documents');
}
console.log('✓ Document Controller capabilities verified (no user management, no approvals, safe archive/restore)');

// 9. Verify Engineer (Uploads, own edits only, no approvals, no archive)
if (!can('engineer', 'document.upload') || !can('engineer', 'document.edit.own')) {
  throw new Error('Engineer must be able to upload and edit own documents');
}
if (can('engineer', 'document.edit')) {
  throw new Error('Engineer must NOT have generic edit on other users files');
}
if (can('engineer', 'review.decide')) {
  throw new Error('Engineer must NOT approve drawings');
}
console.log('✓ Engineer capabilities verified (own uploads only, no approval rights)');

// 10. Verify canEditDocument Ownership Enforcement
const docOwnedByAlice = { uploadedBy: 'user-alice' };
if (!canEditDocument('engineer', 'user-alice', docOwnedByAlice)) {
  throw new Error('Alice should be allowed to edit her own upload');
}
if (canEditDocument('engineer', 'user-bob', docOwnedByAlice)) {
  throw new Error('Bob must NOT be allowed to edit Alice upload');
}
if (!canEditDocument('dc', 'user-bob', docOwnedByAlice)) {
  throw new Error('DC should be allowed to edit any document in scope');
}
if (!canEditDocument('admin', 'user-bob', docOwnedByAlice)) {
  throw new Error('Admin should be allowed to edit any document');
}
console.log('✓ Document edit ownership guard verified');

// 11. Verify Navigation per Role
const adminNav = navFor('admin').map((n) => n.label);
const ceoNav = navFor('ceo').map((n) => n.label);
const dcNav = navFor('dc').map((n) => n.label);
const engNav = navFor('engineer').map((n) => n.label);

if (!adminNav.includes('Users') || !adminNav.includes('Archive')) {
  throw new Error('Admin navigation missing Users or Archive');
}
if (ceoNav.includes('Users') || ceoNav.includes('Review') || ceoNav.includes('Archive')) {
  throw new Error('CEO navigation contains prohibited tabs');
}
if (dcNav.includes('Users') || dcNav.includes('Review')) {
  throw new Error('DC navigation contains Users or Review tabs');
}
if (engNav.includes('Users') || engNav.includes('Review') || engNav.includes('Archive') || engNav.includes('NOC Matrix')) {
  throw new Error('Engineer navigation contains prohibited tabs');
}
console.log('✓ Navigation menus verified per role');

console.log('\n======================================================');
console.log('ALL FOUNDATION & ADMIN PERMISSION CHECKS PASSED (11/11)');
console.log('======================================================');
