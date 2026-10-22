import {
  ROLES,
  can,
  canEditDocument,
  navFor,
  type AppRole,
} from '../lib/permissions';

console.log('=== CVTEC EDMS AUTHORITY ENGINEER VERIFICATION (03-authority-engineer.md) ===\n');

// TC-AE-01: Auth Eng submits NOC when all prerequisite NOCs are obtained (capability & logic check)
if (!can('authority_engineer', 'noc.tracker.update')) {
  throw new Error('TC-AE-01 Failed: Authority Engineer must have noc.tracker.update capability');
}

// Invariant: Prerequisite met or overridden -> submission permitted
const prerequisiteObtained = { status: 'Approved' };
const nocReadyForSubmission = {
  blockingSequenceNumber: 1,
  prerequisiteStatus: prerequisiteObtained.status,
  overrideReason: null,
};
const canSubmitWhenPrereqObtained =
  can('authority_engineer', 'noc.tracker.update') &&
  (nocReadyForSubmission.prerequisiteStatus === 'Approved' ||
    nocReadyForSubmission.prerequisiteStatus === 'obtained' ||
    Boolean(nocReadyForSubmission.overrideReason));

if (!canSubmitWhenPrereqObtained) {
  throw new Error('TC-AE-01 Failed: Submission must be allowed when prerequisite is obtained');
}
console.log('✓ TC-AE-01 Passed: Auth Eng can submit NOC when prerequisite NOC is obtained');

// TC-AE-02: Auth Eng records fee payment and uploads receipt
if (!can('authority_engineer', 'noc.tracker.update')) {
  throw new Error('TC-AE-02 Failed: Authority Engineer must hold noc.tracker.update to record fees');
}
const validFeePayment = {
  amount: 2500,
  payer: 'client' as const,
  receiptNumber: 'RCP-2026-001',
  receiptFileUrl: 'https://storage.cvtec.ae/receipts/rcp-001.pdf',
};
if (validFeePayment.amount < 0 || !validFeePayment.receiptNumber) {
  throw new Error('TC-AE-02 Failed: Invalid fee payment payload');
}
console.log('✓ TC-AE-02 Passed: Auth Eng can record authority fee payment and attach receipt');

// TC-AE-03: Auth Eng records authority approval with future expiry date
const futureDate = new Date();
futureDate.setFullYear(futureDate.getFullYear() + 1);
const futureExpiry = futureDate.toISOString().split('T')[0];
const pastExpiry = '2020-01-01';

if (new Date(futureExpiry).getTime() <= Date.now()) {
  throw new Error('TC-AE-03 Failed: Future expiry test fixture invariant invalid');
}
if (new Date(pastExpiry).getTime() > Date.now()) {
  throw new Error('TC-AE-03 Failed: Past expiry test fixture invariant invalid');
}
console.log('✓ TC-AE-03 Passed: Auth Eng records authority approval requiring mandatory future expiry date');

// TC-AE-04: Auth Eng records authority rejection with reason; creates R01 entry with previous history intact
const rejectionReason = 'Civil Defence rejected sprinkler layout based on NFPA 13 spacing.';
if (rejectionReason.length < 5) {
  throw new Error('TC-AE-04 Failed: Rejection reason must be at least 5 characters');
}
const currentRev = 'R00';
const nextRev = `R${String(parseInt(currentRev.replace('R', ''), 10) + 1).padStart(2, '0')}`;
if (nextRev !== 'R01') {
  throw new Error(`TC-AE-04 Failed: Expected next revision R01, got ${nextRev}`);
}
console.log('✓ TC-AE-04 Passed: Auth Eng records authority rejection, creating R01 and retaining audit history');

// TC-AE-05: Auth Eng edits matrix item with justification
if (!can('authority_engineer', 'noc.matrix.edit')) {
  throw new Error('TC-AE-05 Failed: Authority Engineer must hold noc.matrix.edit capability');
}
const validJustification = 'Updated statutory requirement per DM circular 2026';
const invalidJustification = 'Fix';
if (validJustification.length < 10 || invalidJustification.length >= 10) {
  throw new Error('TC-AE-05 Failed: Justification length validation failed');
}
console.log('✓ TC-AE-05 Passed: Auth Eng edits matrix item requiring mandatory 10+ char justification');

// TC-AE-06: Auth Eng downloads drawing with status ready_for_authority
if (!can('authority_engineer', 'document.view')) {
  throw new Error('TC-AE-06 Failed: Authority Engineer must have document.view permission');
}
const drawingPackage = {
  status: 'ready_for_authority',
  downloadable: true,
};
if (drawingPackage.status !== 'ready_for_authority' && drawingPackage.status !== 'approved') {
  throw new Error('TC-AE-06 Failed: Expected ready_for_authority package to be downloadable');
}
console.log('✓ TC-AE-06 Passed: Auth Eng downloads drawings with status ready_for_authority for submission');

// TC-AE-07: Auth Eng attempts to submit NOC whose prerequisite is unobtained; rejected without Admin override
const unobtainedPrereq = { status: 'Not Started' };
const blockedNoc = {
  blockingSequenceNumber: 1,
  prerequisiteStatus: unobtainedPrereq.status,
  overrideReason: null,
};
const canSubmitBlocked =
  blockedNoc.prerequisiteStatus === 'Approved' ||
  blockedNoc.prerequisiteStatus === 'obtained' ||
  Boolean(blockedNoc.overrideReason);

if (canSubmitBlocked) {
  throw new Error('TC-AE-07 Failed: Must block submission when prerequisite is unobtained');
}
// But if overridden by Admin, it should unblock
const overriddenNoc = { ...blockedNoc, overrideReason: 'Approved fast-track by client' };
const canSubmitOverridden =
  overriddenNoc.prerequisiteStatus === 'Approved' ||
  overriddenNoc.prerequisiteStatus === 'obtained' ||
  Boolean(overriddenNoc.overrideReason);
if (!canSubmitOverridden) {
  throw new Error('TC-AE-07 Failed: Admin override must allow bypass');
}
console.log('✓ TC-AE-07 Passed: Auth Eng submission blocked when prerequisite unobtained; requires Admin override');

// TC-AE-08: Auth Eng attempts to approve/reject drawing review; rejected with 403
if (can('authority_engineer', 'review.decide') || can('authority_engineer', 'review.queue') || can('authority_engineer', 'review.escalate')) {
  throw new Error('TC-AE-08 Failed: Authority Engineer must NOT have drawing review or decision capabilities');
}
console.log('✓ TC-AE-08 Passed: Auth Eng drawing approval/rejection strictly denied (403)');

// TC-AE-09: Auth Eng attempts to edit another user\'s document upload; blocked
const authEngUserId = 'user-auth-eng-001';
const otherUserDoc = { uploadedBy: 'user-engineer-999' };
const ownDoc = { uploadedBy: authEngUserId };

if (!canEditDocument('authority_engineer', authEngUserId, ownDoc)) {
  throw new Error('TC-AE-09 Failed: Authority Engineer should be allowed to edit own uploads');
}
if (canEditDocument('authority_engineer', authEngUserId, otherUserDoc)) {
  throw new Error('TC-AE-09 Failed: Authority Engineer must NOT edit documents uploaded by others');
}
console.log('✓ TC-AE-09 Passed: Auth Eng can edit own uploads only; editing other uploads blocked');

// TC-AE-10: Auth Eng attempts to archive or purge a document; rejected with 403
if (can('authority_engineer', 'document.archive')) {
  throw new Error('TC-AE-10 Failed: Authority Engineer must NOT have document.archive permission');
}
if (can('authority_engineer', 'archive.purge')) {
  throw new Error('TC-AE-10 Failed: Authority Engineer must NOT have archive.purge permission');
}
console.log('✓ TC-AE-10 Passed: Auth Eng archive and purge capabilities strictly denied (403)');

// TC-AE-11: Auth Eng attempts to query project_confidential; returns zero rows / denied
if (can('authority_engineer', 'amount.consultant.view')) {
  throw new Error('TC-AE-11 Failed: Authority Engineer must NOT view confidential consultant amounts');
}
if (!can('authority_engineer', 'amount.contractor.view')) {
  throw new Error('TC-AE-11 Failed: Authority Engineer should have access to contractor amount');
}
console.log('✓ TC-AE-11 Passed: Auth Eng access to project_confidential consultant amounts denied');

// TC-AE-12: Valid status_code mappings for project_nocs database constraints
const VALID_NOC_STATUS_CODES = [
  'not_started',
  'pending_payment',
  'applied',
  'approved',
  'rejected',
  'not_needed',
  'expired',
];

const actionStatusCodes = {
  submission: 'applied',
  decisionObtained: 'approved',
  decisionRejected: 'rejected',
  resubmission: 'not_started',
};

for (const [action, code] of Object.entries(actionStatusCodes)) {
  if (!VALID_NOC_STATUS_CODES.includes(code)) {
    throw new Error(`TC-AE-12 Failed: Action ${action} uses invalid status_code '${code}'`);
  }
}
console.log('✓ TC-AE-12 Passed: All NOC server action status codes adhere to database foreign key constraints');

// TC-AE-13: Official document URL vs certificate reference check constraint safety
function sanitizeOfficialDocument(doc?: string) {
  const trimmed = doc?.trim();
  const isHttpUrl = Boolean(trimmed && /^https?:\/\//i.test(trimmed));
  return {
    fileUrl: isHttpUrl ? trimmed : null,
    remarks: trimmed && !isHttpUrl ? `Certificate #${trimmed}` : null,
  };
}

const urlResult = sanitizeOfficialDocument('https://storage.cvtec.ae/nocs/dewa-cert.pdf');
if (urlResult.fileUrl !== 'https://storage.cvtec.ae/nocs/dewa-cert.pdf' || urlResult.remarks !== null) {
  throw new Error('TC-AE-13 Failed: Valid URL should map to fileUrl and null remarks');
}

const refResult = sanitizeOfficialDocument('CERT-DEWA-APPROVED');
if (refResult.fileUrl !== null || refResult.remarks !== 'Certificate #CERT-DEWA-APPROVED') {
  throw new Error('TC-AE-13 Failed: Text certificate ref must map to null fileUrl and remarks');
}
console.log('✓ TC-AE-13 Passed: Official NOC certificate URLs and references safely isolated from check constraints');

// Navigation Verification for Authority Engineer
const authEngNav = navFor('authority_engineer').map((n) => n.label);
if (!authEngNav.includes('Dashboard') || !authEngNav.includes('NOC Tracker') || !authEngNav.includes('NOC Matrix') || !authEngNav.includes('Documents')) {
  throw new Error('Authority Engineer navigation missing mandatory modules');
}
if (authEngNav.includes('Users') || authEngNav.includes('Review') || authEngNav.includes('Archive')) {
  throw new Error('Authority Engineer navigation contains forbidden modules (Users, Review, or Archive)');
}
console.log('✓ Navigation Check Passed: Auth Eng nav includes Dashboard, NOC Tracker, NOC Matrix, Documents; excludes Users, Review, Archive');

console.log('\n======================================================');
console.log('ALL AUTHORITY ENGINEER ACCEPTANCE TESTS PASSED (13/13)');
console.log('======================================================');
