# CVTEC EDMS – Engineer Role Specification

**Path**: `docs/specs/roles/04-engineer.md`  
**Status**: Approved  
**Version**: 1.0  
**Updated**: 2026-10-14

---

## 1. Executive Summary & Scope

The **Engineer** (MEP, Architect, Structure, Civil) creates and submits technical engineering drawings and design documentation within **assigned projects only**. An engineer's discipline is assigned per project membership. Engineers upload initial drawings (R00) and address reviewer rejection feedback by uploading successive revisions (R01, R02). Engineers cannot edit or replace existing drawing files directly; any file or metadata adjustments must be routed through the Document Controller (DC).

---

## 2. Capabilities & Permissions

Inherits foundation contracts from [00-foundation.md](./00-foundation.md).

| Capability                |     Allowed     | Constraint / Note                                                            |
| ------------------------- | :-------------: | ---------------------------------------------------------------------------- |
| Project Scope             |  **Assigned**   | Accessible strictly within assigned projects                                 |
| Discipline Assignment     | **Per-Project** | Stored on `project_members.discipline` (MEP / Architect / Structure / Civil) |
| View Documents & NOCs     |      **✓**      | View assigned projects and drawings                                          |
| Upload Drawings           |      **✓**      | Uploads R00; auto-sets status to `submitted`                                 |
| Edit / Replace Uploads    |      **—**      | Denied. Must inform Document Controller (DC) for adjustments                 |
| Upload Revisions          |      **✓**      | Permitted after rejection (R00 -> R01); resets status to `submitted`         |
| Archive / Soft Delete     |      **—**      | Denied                                                                       |
| Permanent Purge           |      **—**      | Denied                                                                       |
| Approve / Reject Drawings |      **—**      | Denied (drawings reviewed by Resident Engineer and Area Manager)             |
| Edit NOC Matrix           |      **—**      | Denied                                                                       |
| Update NOC Tracker        |      **—**      | Denied (view-only summary available)                                         |
| View Contractor Amount    |      **✓**      | Permitted (`projects.client_contractor_amount`)                              |
| View Consultant Amount    |      **—**      | Denied. Hidden at all layers                                                 |
| User Management           |      **—**      | Denied                                                                       |
| Expiry Alerts             |      **✓**      | Receives email 14 days prior to NOC expiration                               |

---

## 3. UI Navigation & Route Map

### 3.1 Primary Header Navigation

- **Dashboard**: `/dashboard`
- **Documents**: `/documents`
- _Omitted from navigation_: `/users`, `/reviews`, `/matrix`, `/archive`, `/projects/new`.

### 3.2 View Specifications & Components

#### `/documents` (Engineering Drawing Library)

- **DrawingTable**: Lists drawings filtered by assigned project and discipline.
- **StatusBadges**:
  - `submitted`: Yellow badge ("Under Review - Resident Engineer").
  - `escalated`: Orange badge ("Under Review - Area Manager").
  - `ready_for_authority`: Green badge ("Approved for Authority Submission").
  - `rejected`: Red badge ("Changes Requested").
- **UploadDrawingButton**: Opens **DrawingUploadModal**:
  - Project selector (assigned projects only).
  - Discipline selector (auto-populated with user's assigned discipline).
  - Title, drawing sheet number, category.
  - File upload (PDF / DWG / BIM).
  - Submits initial revision R00 with status `submitted`.
- **RejectionFeedbackCard**: Rendered when a drawing is rejected. Displays:
  - Reviewer name, review level (`re` or `am`), timestamp, and explicit **Rejection Comment**.
  - **UploadRevisionButton**: Opens **RevisionUploadModal** (increments revision to R01, accepts file and changelog notes).

#### `/dashboard`

- Summary cards: My Uploaded Drawings, Drawings Under Review, Drawings Requiring Revision.
- Project NOC milestones overview (read-only progress bar).

---

## 4. Server Actions & Contracts

All Engineer actions reside in `app/actions/documents.ts`.

### 4.1 Drawing Submission & Revision Actions

```typescript
export interface UploadDrawingInput {
  projectId: string;
  discipline: 'mep' | 'architect' | 'structure' | 'civil';
  drawingNumber: string;
  title: string;
  file: File;
}

/** Initial drawing upload creates R00 */
export async function uploadDrawing(
  input: UploadDrawingInput,
): Promise<{ success: boolean; documentId?: string; error?: string }>;
// Validation:
// 1. requireCan('document.upload')
// 2. verifies private.can_see_project(input.projectId)
// 3. sets uploaded_by = auth.uid(), status = 'submitted', revision = 'R00'

/** Uploads successive revision (e.g. R01) after reviewer rejection */
export async function uploadDocumentRevision(
  documentId: string,
  newFile: File,
  changeSummary: string,
): Promise<{ success: boolean; newRevisionId?: string; error?: string }>;
// Validation:
// 1. requireCan('document.upload')
// 2. checks document.uploaded_by === auth.uid()
// 3. checks document.status === 'rejected'
// 4. increments revision label (e.g. R00 -> R01)
// 5. transitions document.status = 'submitted'
```

---

## 5. Database & RLS Policies

```sql
-- Read drawings in assigned projects
create policy "engineer_documents_select"
on public.documents
for select
using (
  private.has_role(array['engineer'])
  and private.can_see_project(project_id)
);

-- Insert drawing: must be assigned to project and uploaded_by must be self
create policy "engineer_documents_insert"
on public.documents
for insert
with check (
  private.has_role(array['engineer'])
  and private.can_see_project(project_id)
  and uploaded_by = (select auth.uid())
);

-- Engineer has ZERO update policy on documents (adjustments/edits performed by DC)
-- Engineer has ZERO delete policy on documents
-- Engineer has ZERO select policy on project_confidential
```

---

## 6. Acceptance Test Suite

### Positive Tests

- [ ] **TC-ENG-01**: Engineer uploads drawing R00 in assigned Project A; document created with status `submitted`.
- [ ] **TC-ENG-02**: Following drawing rejection, Engineer inspects rejection comment and uploads R01; status transitions back to `submitted`.
- [ ] **TC-ENG-03**: Engineer views contractor amount on assigned project dashboard.
- [ ] **TC-ENG-04**: Engineer receives 14-day expiry email for project NOCs.

### Negative & Security Tests

- [ ] **TC-ENG-05**: Engineer attempts to edit or replace a drawing directly; denied at UI (no edit button) and server action (`canEditDocument('engineer')` returns false; `requireCan('document.edit.own')` throws 403).
- [ ] **TC-ENG-06**: Engineer attempts to access unassigned Project B documents; returns 404 / access denied.
- [ ] **TC-ENG-07**: Engineer attempts to approve/reject drawings or update review queue; rejected with 403 Forbidden.
- [ ] **TC-ENG-08**: Engineer attempts to archive or purge a document; rejected with 403 Forbidden.
- [ ] **TC-ENG-09**: Engineer queries `project_confidential` table directly; returns zero rows.
