# CVTEC EDMS – Authority Engineer Role Specification

**Path**: `docs/specs/roles/03-authority-engineer.md`  
**Status**: Approved  
**Version**: 1.0  
**Updated**: 2026-10-14

---

## 1. Executive Summary & Scope

The **Authority Engineer** acts as the primary liaison between CVTEC and government/utility statutory authorities. Assigned to specific projects, the Authority Engineer manages the **NOC Matrix** requirements, submits applications on authority portals, tracks statutory approval milestones, records authority fee payments and receipts, and logs obtained NOCs with expiration dates.

---

## 2. Capabilities & Permissions

Inherits foundation contracts from [00-foundation.md](./00-foundation.md).

| Capability                |     Allowed      | Constraint / Note                                                   |
| ------------------------- | :--------------: | ------------------------------------------------------------------- |
| Project Scope             |   **Assigned**   | Accessible strictly within assigned projects                        |
| View Documents & NOCs     |      **✓**       | In assigned projects only                                           |
| Upload Documents          |      **✓**       | Permitted for own files                                             |
| Edit Documents            | **✓ (Own only)** | Strictly restricted to files where `uploaded_by = auth.uid()`       |
| Archive / Soft Delete     |      **—**       | Denied                                                              |
| Permanent Purge           |      **—**       | Denied                                                              |
| Approve / Reject Drawings |      **—**       | Denied (drawings approved by RE / AM prior to authority submission) |
| Edit NOC Matrix           |      **✓**       | Mandatory justification; creates revision; updates unobtained NOCs  |
| Update NOC Tracker        |      **✓**       | Statuses, submission tracking numbers, fee records, receipts        |
| Override NOC Sequence     |      **—**       | Denied (Admin only)                                                 |
| View Contractor Amount    |      **✓**       | Permitted (`projects.client_contractor_amount`)                     |
| View Consultant Amount    |      **—**       | Denied. Hidden at all layers                                        |
| User Management           |      **—**       | Denied                                                              |
| Expiry Alerts             |      **✓**       | Receives email 14 days prior to NOC expiration                      |

---

## 3. UI Navigation & Route Map

### 3.1 Primary Header Navigation

- **Dashboard**: `/dashboard`
- **NOC Tracker**: `/noc`
- **NOC Matrix**: `/matrix`
- **Documents**: `/documents`
- _Omitted from navigation_: `/users`, `/reviews`, `/archive`, `/projects/new`.

### 3.2 View Specifications & Components

#### `/noc` (Authority Permitting & Tracker)

- **NocPipelineView**: Kanban/grid view of NOC items categorized by stage (`pre_construction`, `construction`, `handover`).
- **PrerequisiteIndicator**: Visual indicator showing prerequisite chain. If prerequisites are not in `obtained` state:
  - Submit button is disabled.
  - Hover tooltip displays: _"Prerequisite NOC [ID/Name] not yet obtained."_
- **SubmissionModal**:
  - Authority tracking/reference number.
  - Submission date.
  - Upload authority submission receipt/slip.
  - Automatically transitions NOC status to `submitted`.
- **FeePaymentModal**:
  - Fee amount, payer selector (`client` / `contractor`), receipt number, receipt upload.
- **AuthorityResultModal**:
  - **Option 1: Approved / Obtained**:
    - Sets status to `obtained`.
    - Mandatory **Expiry Date** input.
    - Triggers automated 14-day expiry scheduler.
  - **Option 2: Rejected**:
    - Sets status to `rejected`.
    - Mandatory **Authority Rejection Reason** text field.
    - Creates revision R01 in tracker, retaining R00 history.

#### `/matrix` (NOC Matrix Requirements)

- **MatrixEditorGrid**: Editable list of required NOCs per project type and authority.
- **RevisionModal**: Pops up automatically on edit requiring non-empty **Justification** string before saving changes.

#### `/documents` (Documents Library)

- Can view approved drawings with status `ready_for_authority` to download packages for statutory submission.
- Can upload and edit **own documents only**.

---

## 4. Server Actions & Contracts

All Authority Engineer actions reside in `app/actions/noc.ts` and `app/actions/documents.ts`.

### 4.1 NOC Lifecycle Actions

```typescript
/** Submits an application to statutory authority */
export async function submitNocApplication(
  nocId: string,
  input: {
    authorityReference: string;
    submittedAt: string;
    submissionProofUrl?: string;
  },
): Promise<{ success: boolean; error?: string }>;
// Validation:
// 1. requireCan('noc.tracker.update')
// 2. verifies all prerequisite NOCs have status === 'obtained' (or sequence_overridden === true)
// 3. updates status = 'submitted'

/** Records authority decision (Obtained or Rejected) */
export async function recordAuthorityDecision(
  nocId: string,
  input: {
    decision: 'obtained' | 'rejected';
    expiryDate?: string;
    rejectionReason?: string;
    officialDocumentUrl?: string;
  },
): Promise<{ success: boolean; error?: string }>;
// Validation:
// 1. If decision === 'obtained', expiryDate is required and must be in future.
// 2. If decision === 'rejected', rejectionReason is required (min 5 chars).
// 3. Updates project_nocs row and logs to audit_log.
```

### 4.2 Matrix Revisioning Action

```typescript
export async function updateNocMatrixItem(
  matrixItemId: string,
  updates: Record<string, unknown>,
  justification: string,
): Promise<{ success: boolean; revisionId?: string; error?: string }>;
// Validation:
// 1. requireCan('noc.matrix.edit')
// 2. justification length >= 10
// 3. inserts row into public.noc_matrix_revisions
// 4. updates unobtained NOCs only
```

---

## 5. Database & RLS Policies

```sql
-- Read NOCs in assigned projects
create policy "auth_eng_noc_select"
on public.project_nocs
for select
using (
  private.has_role(array['authority_engineer'])
  and private.can_see_project(project_id)
);

-- Update NOC tracker in assigned projects
create policy "auth_eng_noc_update"
on public.project_nocs
for update
using (
  private.has_role(array['authority_engineer'])
  and private.can_see_project(project_id)
)
with check (
  private.has_role(array['authority_engineer'])
  and private.can_see_project(project_id)
);

-- Manage Matrix revisions
create policy "auth_eng_matrix_revisions_insert"
on public.noc_matrix_revisions
for insert
with check (
  private.has_role(array['authority_engineer'])
  and actor_id = (select auth.uid())
);

-- Documents: select in assigned project, insert/update own uploads only
create policy "auth_eng_documents_select"
on public.documents
for select
using (
  private.has_role(array['authority_engineer'])
  and private.can_see_project(project_id)
);

create policy "auth_eng_documents_insert"
on public.documents
for insert
with check (
  private.has_role(array['authority_engineer'])
  and private.can_see_project(project_id)
  and uploaded_by = (select auth.uid())
);

create policy "auth_eng_documents_update"
on public.documents
for update
using (
  private.has_role(array['authority_engineer'])
  and uploaded_by = (select auth.uid())
);
```

---

## 6. Acceptance Test Suite

### Positive Tests

- [ ] **TC-AE-01**: Auth Eng submits NOC when all prerequisite NOCs are obtained; status changes to `submitted`.
- [ ] **TC-AE-02**: Auth Eng records fee payment and uploads receipt; details persist on NOC record.
- [ ] **TC-AE-03**: Auth Eng records authority approval with future expiry date; status changes to `obtained`.
- [ ] **TC-AE-04**: Auth Eng records authority rejection with reason; creates R01 entry with previous history intact.
- [ ] **TC-AE-05**: Auth Eng edits matrix item with justification; revision row logged and applied to unobtained NOCs.
- [ ] **TC-AE-06**: Auth Eng downloads drawing with status `ready_for_authority` for authority submission.

### Negative & Security Tests

- [ ] **TC-AE-07**: Auth Eng attempts to submit NOC whose prerequisite is unobtained; rejected without Admin override.
- [ ] **TC-AE-08**: Auth Eng attempts to approve/reject drawing review; rejected with 403 Forbidden.
- [ ] **TC-AE-09**: Auth Eng attempts to edit another user's document upload; blocked by RLS.
- [ ] **TC-AE-10**: Auth Eng attempts to archive or purge a document; rejected with 403 Forbidden.
- [ ] **TC-AE-11**: Auth Eng attempts to query `project_confidential`; returns zero rows.
