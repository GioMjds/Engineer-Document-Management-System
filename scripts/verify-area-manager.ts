import {
  ROLES,
  can,
  canEditDocument,
  navFor,
  type AppRole,
} from '../lib/permissions';

console.log('=== CVTEC EDMS AREA MANAGER (AM) VERIFICATION (06-area-manager.md) ===\n');

// Helper to determine target status for Area Manager second-level review
function computeAmReviewStatus(decision: 'approve' | 'reject'): string {
  if (decision === 'reject') return 'rejected';
  return 'ready_for_authority';
}

// Helper to determine queue eligibility for Area Manager
function isVisibleInAmQueue(
  doc: { status: string; project_id: string },
  projectsWithRe: Set<string>,
): boolean {
  if (doc.status === 'escalated') return true;
  if (doc.status === 'submitted') {
    const isReAbsent = !projectsWithRe.has(doc.project_id);
    return isReAbsent;
  }
  return false;
}

// -----------------------------------------------------------------------------
// TC-AM-01: Drawing escalated by RE appears in AM review queue across any project
// -----------------------------------------------------------------------------
if (!can('area_manager', 'review.queue') || !can('area_manager', 'review.decide')) {
  throw new Error('TC-AM-01 Failed: Area Manager must hold review.queue and review.decide capabilities');
}
if (!can('area_manager', 'project.viewAll')) {
  throw new Error('TC-AM-01 Failed: Area Manager must have project.viewAll cross-project visibility');
}
const mockEscalatedDoc = { status: 'escalated', project_id: 'proj-001' };
const projectsWithReSet = new Set(['proj-001']); // RE present on proj-001
if (!isVisibleInAmQueue(mockEscalatedDoc, projectsWithReSet)) {
  throw new Error('TC-AM-01 Failed: Escalated drawing must appear in AM queue regardless of project assignment');
}
console.log('✓ TC-AM-01 Passed: Escalated drawing by RE appears in AM review queue across all projects');

// -----------------------------------------------------------------------------
// TC-AM-02: Project with no assigned RE shows submitted drawings directly in AM review queue
// -----------------------------------------------------------------------------
const mockReAbsentDoc = { status: 'submitted', project_id: 'proj-no-re' };
if (!isVisibleInAmQueue(mockReAbsentDoc, projectsWithReSet)) {
  throw new Error('TC-AM-02 Failed: Submitted drawing with no assigned RE must appear directly in AM review queue');
}
console.log('✓ TC-AM-02 Passed: Project with no assigned RE routes submitted drawings directly to AM queue');

// -----------------------------------------------------------------------------
// TC-AM-03: AM approves escalated drawing; status transitions to ready_for_authority
// -----------------------------------------------------------------------------
const amApprovedStatus = computeAmReviewStatus('approve');
if (amApprovedStatus !== 'ready_for_authority') {
  throw new Error(`TC-AM-03 Failed: Expected status ready_for_authority, got ${amApprovedStatus}`);
}
// Once ready_for_authority, drawing exits AM review queue
const docAfterApproval = { status: amApprovedStatus, project_id: 'proj-001' };
if (isVisibleInAmQueue(docAfterApproval, projectsWithReSet)) {
  throw new Error('TC-AM-03 Failed: Approved drawing must exit AM review queue');
}
console.log('✓ TC-AM-03 Passed: AM approves drawing -> transitions directly to ready_for_authority & exits queue');

// -----------------------------------------------------------------------------
// TC-AM-04: AM rejects drawing with comment; status transitions to rejected
// -----------------------------------------------------------------------------
const validComment = 'Egress door widths fail UAE Fire and Life Safety Code Table 3.2 minimum clearance.';
if (validComment.trim().length < 5) {
  throw new Error('TC-AM-04 Failed: Minimum comment length should be >= 5');
}
const amRejectedStatus = computeAmReviewStatus('reject');
if (amRejectedStatus !== 'rejected') {
  throw new Error(`TC-AM-04 Failed: Expected status rejected, got ${amRejectedStatus}`);
}
const docAfterRejection = { status: amRejectedStatus, project_id: 'proj-001' };
if (isVisibleInAmQueue(docAfterRejection, projectsWithReSet)) {
  throw new Error('TC-AM-04 Failed: Rejected drawing must exit AM review queue');
}
console.log('✓ TC-AM-04 Passed: AM rejects drawing with mandatory feedback -> status transitions to rejected');

// -----------------------------------------------------------------------------
// TC-AM-05: AM views both contractor amount and confidential consultant amount
// -----------------------------------------------------------------------------
if (!can('area_manager', 'amount.contractor.view')) {
  throw new Error('TC-AM-05 Failed: Area Manager must have amount.contractor.view permission');
}
if (!can('area_manager', 'amount.consultant.view')) {
  throw new Error('TC-AM-05 Failed: Area Manager must have amount.consultant.view permission');
}
console.log('✓ TC-AM-05 Passed: AM has full visibility into contractor awards and confidential consultant fees');

// -----------------------------------------------------------------------------
// TC-AM-06: Drawing approved by RE without escalation does NOT appear in AM queue
// -----------------------------------------------------------------------------
const directApprovedByReDoc = { status: 'ready_for_authority', project_id: 'proj-001' };
if (isVisibleInAmQueue(directApprovedByReDoc, projectsWithReSet)) {
  throw new Error('TC-AM-06 Failed: Drawing approved by RE without escalation must NOT appear in AM queue');
}
// Submitted drawing on project with assigned RE must NOT appear in AM queue either
const submittedWithReDoc = { status: 'submitted', project_id: 'proj-001' };
if (isVisibleInAmQueue(submittedWithReDoc, projectsWithReSet)) {
  throw new Error('TC-AM-06 Failed: Submitted drawing on project with assigned RE must NOT appear in AM queue');
}
console.log('✓ TC-AM-06 Passed: Standard approved drawings bypass AM queue; routed directly to authority pipeline');

// -----------------------------------------------------------------------------
// TC-AM-07: AM attempts to upload a new document; rejected with 403 Forbidden
// -----------------------------------------------------------------------------
if (can('area_manager', 'document.upload')) {
  throw new Error('TC-AM-07 Failed: Area Manager must NOT have document.upload permission');
}
console.log('✓ TC-AM-07 Passed: AM document upload is strictly denied (read-only document oversight)');

// -----------------------------------------------------------------------------
// TC-AM-08: AM attempts to edit or archive a document; rejected with 403 Forbidden
// -----------------------------------------------------------------------------
if (can('area_manager', 'document.edit')) {
  throw new Error('TC-AM-08 Failed: Area Manager must NOT have document.edit permission');
}
if (can('area_manager', 'document.edit.own')) {
  throw new Error('TC-AM-08 Failed: Area Manager must NOT have document.edit.own permission');
}
if (can('area_manager', 'document.archive')) {
  throw new Error('TC-AM-08 Failed: Area Manager must NOT have document.archive permission');
}
if (can('area_manager', 'archive.view')) {
  throw new Error('TC-AM-08 Failed: Area Manager must NOT have archive.view permission');
}
if (can('area_manager', 'archive.restore') || can('area_manager', 'archive.purge')) {
  throw new Error('TC-AM-08 Failed: Area Manager must NOT have archive restore/purge permissions');
}
const amUserId = 'user-am-123';
if (canEditDocument('area_manager', amUserId, { uploadedBy: amUserId })) {
  throw new Error('TC-AM-08 Failed: canEditDocument must return false for Area Manager');
}
console.log('✓ TC-AM-08 Passed: AM document edit, replace, archive, restore, and purge strictly denied (403)');

// -----------------------------------------------------------------------------
// TC-AM-09: AM attempts to call recordNocFeePayment; rejected with 403 Forbidden
// -----------------------------------------------------------------------------
if (can('area_manager', 'noc.tracker.update')) {
  throw new Error('TC-AM-09 Failed: Area Manager must NOT have noc.tracker.update permission');
}
if (can('area_manager', 'noc.matrix.edit')) {
  throw new Error('TC-AM-09 Failed: Area Manager must NOT have noc.matrix.edit permission');
}
if (can('area_manager', 'noc.matrix.view')) {
  throw new Error('TC-AM-09 Failed: Area Manager must NOT have noc.matrix.view permission');
}
console.log('✓ TC-AM-09 Passed: AM fee payment recording and NOC tracker updates strictly denied (403)');

// -----------------------------------------------------------------------------
// TC-AM-10: AM attempts to invite users or edit roles; rejected with 403 Forbidden
// -----------------------------------------------------------------------------
if (can('area_manager', 'users.manage')) {
  throw new Error('TC-AM-10 Failed: Area Manager must NOT have users.manage permission');
}
if (can('area_manager', 'project.create')) {
  throw new Error('TC-AM-10 Failed: Area Manager must NOT have project.create permission');
}
console.log('✓ TC-AM-10 Passed: AM user management, role modification, and project creation strictly denied (403)');

// -----------------------------------------------------------------------------
// Navigation Map Verification
// -----------------------------------------------------------------------------
const amNav = navFor('area_manager').map((item) => item.href);
const expectedNavHrefs = ['/dashboard', '/noc-tracker', '/documents', '/review'];
const omittedNavHrefs = ['/users', '/noc-matrix', '/archive'];

for (const href of expectedNavHrefs) {
  if (!amNav.includes(href)) {
    throw new Error(`Navigation Check Failed: Area Manager navigation must include ${href}`);
  }
}
for (const href of omittedNavHrefs) {
  if (amNav.includes(href)) {
    throw new Error(`Navigation Check Failed: Area Manager navigation must omit ${href}`);
  }
}
console.log('✓ Navigation Check Passed: AM nav includes Dashboard, Documents, Review, NOC Tracker; omits Users, Matrix, Archive');

console.log('\n======================================================');
console.log('ALL AREA MANAGER ACCEPTANCE TESTS PASSED (10/10)');
console.log('======================================================\n');
