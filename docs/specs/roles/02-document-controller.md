# CVTEC EDMS – Document Controller (DC) Role Specification

**Path**: `docs/specs/roles/02-document-controller.md`  
**Status**: Approved  
**Version**: 1.0  
**Updated**: 2026-10-14

---

## 1. Executive Summary & Scope

The **Document Controller (DC)** manages document records, revisions, archiving, and regulatory NOC tracking within **assigned projects only**. The DC has broad document editing and archiving privileges across all disciplines in assigned projects, but **cannot approve drawings**, **cannot permanently purge files**, and **cannot access confidential consultant financials**.

---

## 2. Capabilities & Permissions

Inherits foundation contracts from [00-foundation.md](./00-foundation.md).

| Capability                 |   Allowed    | Constraint / Note                                                  |
| -------------------------- | :----------: | ------------------------------------------------------------------ |
| Project Scope              | **Assigned** | Strictly limited to projects where assigned in `project_members`   |
| View Documents & NOCs      |    **✓**     | In assigned projects only                                          |
| Upload Documents           |    **✓**     | New documents and revisions                                        |
| Edit Any Document in Scope |    **✓**     | In-place edit or metadata update for any file in assigned projects |
| Soft Delete / Archive      |    **✓**     | Soft deletes file to `/archive` (`archived_at` set)                |
| Restore from Archive       |    **✓**     | Restores archived file back to active project                      |
| Permanent Purge            |    **—**     | Denied. Exclusive to Admin                                         |
| Approve / Reject Drawings  |    **—**     | Denied. Must not decide review stages                              |
| Edit NOC Matrix            |    **✓**     | Requires written justification; propagates to unobtained only      |
| Update NOC Tracker         |    **✓**     | Submissions, status updates, fee payment records, receipts         |
| Override NOC Sequence      |    **—**     | Denied. Sequence check is strictly enforced                        |
| View Contractor Amount     |    **✓**     | Permitted (`projects.client_contractor_amount`)                    |
| View Consultant Amount     |    **—**     | Denied. Hidden at UI, action, and RLS levels                       |
| User Management            |    **—**     | Denied. No access to `/users` or invite actions                    |
| Expiry Alerts              |    **✓**     | Receives email 14 days prior to NOC expiration                     |

---

## 3. UI Navigation & Route Map

### 3.1 Primary Header Navigation

- **Dashboard**: `/dashboard`
- **Documents**: `/documents`
- **NOC Tracker**: `/noc`
- **NOC Matrix**: `/matrix`
- **Archive**: `/archive`
- _Omitted from navigation_: `/users`, `/reviews`, `/projects/new`.

### 3.2 View Specifications & Components

#### `/documents` (Document Library)

- **DocumentTable**: Filterable by assigned project, discipline, and status.
- **UploadButton**: Opens **DocumentUploadModal** allowing upload of R00 or higher revision for any document category.
- **ActionDropdown** (per document row):
  - "Edit Metadata" -> Opens edit modal.
  - "Upload New Revision" -> Increments revision (e.g. R00 -> R01).
  - "Archive Document" -> Triggers soft-delete confirmation modal.
  - _No "Approve" or "Reject" options present._

#### `/archive` (Archive Management)

- **ArchivedList**: Lists soft-deleted documents belonging exclusively to projects where DC is a member.
- **RestoreButton**: Reactivates document (clears `archived_at` and `archived_by`).
- _No "Purge" button rendered._

#### `/noc` (NOC Tracker)

- **NocTrackerGrid**: Displays NOC stages, prerequisites, and statuses for assigned projects.
- **StatusUpdateModal**: Allows setting status to `submitted`, `obtained`, or `rejected`.
- **FeeRecordingModal**: Allows entering fee amount, payer (`client` or `contractor`), receipt number, and attaching payment receipt file.
- **SequenceGuard**: If a prerequisite NOC is unobtained, the action button is disabled with tooltip: _"Prerequisite NOC pending. Admin override required."_

#### `/matrix` (NOC Matrix Editor)

- **MatrixTable**: Displays NOC requirement templates.
- **EditItemModal**: Requires entering updated values plus a mandatory **Justification** string before submitting.

---

## 4. Server Actions & Contracts

All DC actions reside in `app/actions/documents.ts` and `app/actions/noc.ts`.

### 4.1 Document Operations

```typescript
/** Uploads a document to an assigned project */
export async function uploadDocument(
  projectId: string,
  formData: FormData,
): Promise<{ success: boolean; documentId?: string; error?: string }>;

/** Edits or replaces any document within an assigned project */
export async function editDocument(
  documentId: string,
  updates: DocumentUpdateInput,
): Promise<{ success: boolean; error?: string }>;

/** Soft deletes a document (archives it) */
export async function archiveDocument(
  documentId: string,
): Promise<{ success: boolean; error?: string }>;
// Validation:
// 1. requireCan('document.archive')
// 2. verifies private.can_see_project for document's project_id
// 3. sets archived_at = now(), archived_by = auth.uid()

/** Restores an archived document */
export async function restoreDocument(
  documentId: string,
): Promise<{ success: boolean; error?: string }>;
```

### 4.2 NOC Tracking & Fee Recording

```typescript
/** Records fee payment for a NOC */
export async function recordNocFeePayment(
  nocId: string,
  input: {
    amount: number;
    payer: 'client' | 'contractor';
    receiptNumber: string;
    receiptFileUrl?: string;
  },
): Promise<{ success: boolean; error?: string }>;

/** Updates NOC matrix requirement with mandatory justification */
export async function updateNocMatrixItem(
  matrixItemId: string,
  newValue: Record<string, unknown>,
  justification: string,
): Promise<{ success: boolean; error?: string }>;
// Validation:
// 1. requireCan('noc.matrix.edit')
// 2. justification length >= 10 characters
// 3. writes to noc_matrix_revisions
// 4. updates only unobtained project_nocs
```

---

## 5. Database & RLS Policies

```sql
-- DC can read and write documents in assigned projects
create policy "dc_documents_select"
on public.documents
for select
using (
  private.has_role(array['dc'])
  and private.can_see_project(project_id)
);

create policy "dc_documents_insert"
on public.documents
for insert
with check (
  private.has_role(array['dc'])
  and private.can_see_project(project_id)
);

create policy "dc_documents_update"
on public.documents
for update
using (
  private.has_role(array['dc'])
  and private.can_see_project(project_id)
)
with check (
  private.has_role(array['dc'])
  and private.can_see_project(project_id)
);

-- DC has ZERO delete policy on documents (soft delete only)
-- DC has ZERO select policy on project_confidential
```

---

## 6. Acceptance Test Suite

### Positive Tests

- [ ] **TC-DC-01**: DC uploads drawing R00 to assigned Project A; document created with status `submitted`.
- [ ] **TC-DC-02**: DC edits metadata of an existing drawing in Project A uploaded by an engineer; edit succeeds.
- [ ] **TC-DC-03**: DC archives a document in Project A; document moves to `/archive`.
- [ ] **TC-DC-04**: DC restores the archived document from `/archive`; document reappears in active library.
- [ ] **TC-DC-05**: DC updates NOC tracker status and records fee payment with receipt in Project A.
- [ ] **TC-DC-06**: DC edits NOC Matrix item with justification; revision row logged and applied to unobtained NOCs.

### Negative & Security Tests

- [ ] **TC-DC-07**: DC attempts to access documents or NOCs of unassigned Project B; returns 404 / access denied.
- [ ] **TC-DC-08**: DC attempts to call `purgeDocument`; request rejected with 403 Forbidden.
- [ ] **TC-DC-09**: DC attempts to call `reviewDocument` (approve/reject); request rejected with 403 Forbidden.
- [ ] **TC-DC-10**: DC queries `project_confidential` table directly via Supabase client; returns empty/denied.
- [ ] **TC-DC-11**: DC attempts to invite or edit users; request rejected with 403 Forbidden.
