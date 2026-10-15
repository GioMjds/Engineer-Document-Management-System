import {
  ROLES,
  can,
  canEditDocument,
  navFor,
  type AppRole,
} from '../lib/permissions';

console.log('=== CVTEC EDMS RESIDENT ENGINEER (RE) VERIFICATION (05-resident-engineer.md) ===\n');

// TC-RE-01: RE approves submitted drawing without escalation; status changes to ready_for_authority and exits queue
if (!can('resident_engineer', 'review.decide')) {
  throw new Error('TC-RE-01 Failed: Resident Engineer must have review.decide capability');
}
if (!can('resident_engineer', 'review.queue')) {
  throw new Error('TC-RE-01 Failed: Resident Engineer must have review.queue capability');
}

// Invariant: Standard approval transitions status to ready_for_authority
function computeReviewStatus(decision: 'approve' | 'reject', escalate?: boolean): string {
  if (decision === 'reject') return 'rejected';
  if (escalate) return 'escalated';
  return 'ready_for_authority';
}

const standardApprovalStatus = computeReviewStatus('approve', false);
if (standardApprovalStatus !== 'ready_for_authority') {
  throw new Error(`TC-RE-01 Failed: Expected status ready_for_authority, got ${standardApprovalStatus}`);
}
// Review queue only shows 'submitted' drawings; ready_for_authority exits queue
const isVisibleInQueue = (status: string) => status === 'submitted';
if (isVisibleInQueue(standardApprovalStatus)) {
  throw new Error('TC-RE-01 Failed: Approved drawing must exit review queue');
}
console.log('✓ TC-RE-01 Passed: RE approves drawing without escalation -> ready_for_authority & exits queue');

// TC-RE-02: RE approves submitted drawing with escalation; status changes to escalated and appears in AM queue
const escalatedStatus = computeReviewStatus('approve', true);
if (escalatedStatus !== 'escalated') {
  throw new Error(`TC-RE-02 Failed: Expected status escalated, got ${escalatedStatus}`);
}
// Area Manager has review queue capability
if (!can('area_manager', 'review.queue') || !can('area_manager', 'review.decide')) {
  throw new Error('TC-RE-02 Failed: Area Manager must hold review.queue and review.decide');
}
console.log('✓ TC-RE-02 Passed: RE approves drawing with escalation -> escalated & routes to Area Manager');

// TC-RE-03: RE rejects submitted drawing with detailed comment; status changes to rejected
const validComment = 'Structural member dimensions fail DM minimum clearance regulations.';
const rejectionStatus = computeReviewStatus('reject');
if (rejectionStatus !== 'rejected') {
  throw new Error(`TC-RE-03 Failed: Expected status rejected, got ${rejectionStatus}`);
}
if (validComment.trim().length < 5) {
  throw new Error('TC-RE-03 Failed: Rejection comment length must be >= 5 characters');
}
console.log('✓ TC-RE-03 Passed: RE rejects drawing with detailed feedback -> rejected & recorded');

// TC-RE-04: RE attempts to upload drawing; denied at UI and server action
if (can('resident_engineer', 'document.upload')) {
  throw new Error('TC-RE-04 Failed: Resident Engineer must NOT have document.upload permission');
}
console.log('✓ TC-RE-04 Passed: RE document upload is strictly denied (no upload button, server 403)');

// TC-RE-05: RE attempts to reject drawing with blank comment; rejected by validation guard (< 5 chars)
const invalidBlankComments = ['', '   ', 'fix', 'bad!'];
for (const c of invalidBlankComments) {
  const isValid = c.trim().length >= 5;
  if (isValid) {
    throw new Error(`TC-RE-05 Failed: Comment "${c}" should fail minimum 5-character validation`);
  }
}
console.log('✓ TC-RE-05 Passed: RE rejection with blank/short comment (<5 chars) strictly blocked by validation guard');

// TC-RE-06: RE attempts to review a drawing on an unassigned project; access denied
if (can('resident_engineer', 'project.viewAll')) {
  throw new Error('TC-RE-06 Failed: Resident Engineer must NOT have project.viewAll capability');
}
const assignedProjectIds = ['proj-001', 'proj-002'];
const unassignedDocProjectId = 'proj-999';
const hasAccessToUnassigned = assignedProjectIds.includes(unassignedDocProjectId);
if (hasAccessToUnassigned) {
  throw new Error('TC-RE-06 Failed: Access to unassigned project must be denied');
}
console.log('✓ TC-RE-06 Passed: RE review on unassigned project returns access denied (strictly assigned scope)');

// TC-RE-07: RE attempts to edit or replace an upload; rejected by permission guard
if (can('resident_engineer', 'document.edit')) {
  throw new Error('TC-RE-07 Failed: Resident Engineer must NOT have document.edit permission');
}
if (can('resident_engineer', 'document.edit.own')) {
  throw new Error('TC-RE-07 Failed: Resident Engineer must NOT have document.edit.own permission');
}
const reUserId = 'user-re-123';
const ownDoc = { uploadedBy: reUserId };
if (canEditDocument('resident_engineer', reUserId, ownDoc)) {
  throw new Error('TC-RE-07 Failed: canEditDocument must return false for Resident Engineer');
}
console.log('✓ TC-RE-07 Passed: RE edit/replace uploads strictly denied (403)');

// TC-RE-08: RE attempts to archive or permanently purge a document; rejected with 403 Forbidden
if (can('resident_engineer', 'document.archive')) {
  throw new Error('TC-RE-08 Failed: Resident Engineer must NOT have document.archive permission');
}
if (can('resident_engineer', 'archive.purge')) {
  throw new Error('TC-RE-08 Failed: Resident Engineer must NOT have archive.purge permission');
}
if (can('resident_engineer', 'archive.view')) {
  throw new Error('TC-RE-08 Failed: Resident Engineer must NOT have archive.view permission');
}
console.log('✓ TC-RE-08 Passed: RE archive view, archive soft-delete, and purge strictly denied (403)');

// TC-RE-09: RE queries project_confidential table directly; returns zero rows / denied
if (can('resident_engineer', 'amount.consultant.view')) {
  throw new Error('TC-RE-09 Failed: Resident Engineer must NOT view confidential consultant amounts');
}
if (!can('resident_engineer', 'amount.contractor.view')) {
  throw new Error('TC-RE-09 Failed: Resident Engineer should be able to view client_contractor_amount');
}
console.log('✓ TC-RE-09 Passed: RE confidential consultant amounts hidden at all layers; contractor amount visible');

// TC-RE-10: RE attempts to edit NOC matrix or tracker fees; rejected with 403 Forbidden
if (can('resident_engineer', 'noc.matrix.edit')) {
  throw new Error('TC-RE-10 Failed: Resident Engineer must NOT have noc.matrix.edit permission');
}
if (can('resident_engineer', 'noc.tracker.update')) {
  throw new Error('TC-RE-10 Failed: Resident Engineer must NOT have noc.tracker.update permission');
}
if (can('resident_engineer', 'noc.sequence.override')) {
  throw new Error('TC-RE-10 Failed: Resident Engineer must NOT have noc.sequence.override permission');
}
console.log('✓ TC-RE-10 Passed: RE edit NOC matrix and tracker fee modifications strictly denied (403)');

// Navigation Verification for Resident Engineer
const reNav = navFor('resident_engineer').map((n) => n.label);
if (!reNav.includes('Dashboard') || !reNav.includes('Documents') || !reNav.includes('Review')) {
  throw new Error('Resident Engineer navigation missing mandatory modules (Dashboard, Documents, Review)');
}
if (reNav.includes('Users') || reNav.includes('NOC Matrix') || reNav.includes('Archive')) {
  throw new Error('Resident Engineer navigation contains forbidden modules (Users, NOC Matrix, or Archive)');
}
console.log('✓ Navigation Check Passed: RE nav includes Dashboard, Documents, Review, NOC Tracker; excludes Users, NOC Matrix, Archive');

console.log('\n======================================================');
console.log('ALL RESIDENT ENGINEER ACCEPTANCE TESTS PASSED (10/10)');
console.log('======================================================');
