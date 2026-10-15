# CVTEC EDMS – Resident Engineer (RE) Role Specification

**Path**: `docs/specs/roles/05-resident-engineer.md`  
**Status**: Approved  
**Version**: 1.0  
**Updated**: 2026-10-14

---

## 1. Executive Summary & Scope

The **Resident Engineer (RE)** serves as the **first-level technical reviewer** on assigned construction and engineering projects. The RE evaluates submitted engineering drawings for technical compliance, approves standard drawings directly for statutory submission, flags and escalates complex drawings to the Area Manager (AM), or rejects non-compliant drawings with mandatory technical feedback.

---

## 2. Capabilities & Permissions

Inherits foundation contracts from [00-foundation.md](./00-foundation.md).

| Capability                |     Allowed      | Constraint / Note                                             |
| ------------------------- | :--------------: | ------------------------------------------------------------- |
| Project Scope             |   **Assigned**   | Accessible strictly within assigned projects                  |
| First-Level Review        |      **✓**       | Primary reviewer for drawings with status `submitted`         |
| Approve (Standard)        |      **✓**       | Transitions drawing directly to `ready_for_authority`         |
| Approve (Escalate)        |      **✓**       | Flags drawing for Area Manager; transitions to `escalated`    |
| Reject Drawing            |      **✓**       | Requires mandatory comment; transitions to `rejected`         |
| View Documents & NOCs     |      **✓**       | In assigned projects only                                     |
| Upload Documents          |      **—**       | Denied. Drawings submitted by Engineer and DC for RE review  |
| Edit Documents            |      **—**       | Denied                                                        |
| Archive / Soft Delete     |      **—**       | Denied                                                        |
| Permanent Purge           |      **—**       | Denied                                                        |
| Edit NOC Matrix / Tracker |      **—**       | Denied                                                        |
| Override NOC Sequence     |      **—**       | Denied                                                        |
| View Contractor Amount    |      **✓**       | Permitted (`projects.client_contractor_amount`)               |
| View Consultant Amount    |      **—**       | Denied. Hidden at all layers                                  |
| User Management           |      **—**       | Denied                                                        |
| Expiry Alerts             |      **—**       | Denied (only Auth Eng, Engineer, DC receive expiry alerts)    |

---

## 3. UI Navigation & Route Map

### 3.1 Primary Header Navigation

- **Dashboard**: `/dashboard`
- **Documents**: `/documents`
- **Review Queue**: `/reviews`
- _Omitted from navigation_: `/users`, `/matrix`, `/archive`, `/projects/new`.

### 3.2 View Specifications & Components

#### `/reviews` (Review Queue)

- **ReviewQueueTable**: Lists drawings requiring review in assigned projects. Filtered strictly to `status === 'submitted'`.
- Columns: Project, Sheet Number, Title, Discipline, Author, Submission Date, Revision (R00, R01...).
- **DrawingReviewModal**:
  - Embedded PDF/DWG drawing viewer.
  - Previous revision comments and revision changelog.
  - **Decision Panel**:
    - **Approve (Direct)** Button: Marks technical approval; transitions status to `ready_for_authority`.
    - **Approve & Escalate** Button (or checkbox _"Escalate to Area Manager"_): Marks approval; transitions status to `escalated` (appears in AM queue).
    - **Reject** Button: Expands required **Reviewer Comment** textarea. Reject button is disabled until non-whitespace text is entered.

#### `/documents`

- Full view of assigned project drawings.
- Upload button for own technical submissions.
- Edit button available only for rows where `uploaded_by === auth.uid()`.

---

## 4. Server Actions & Contracts

All RE review actions use the unified review action defined in `app/actions/reviews.ts`.

### 4.1 Review Decision Action

```typescript
export interface ResidentEngineerReviewInput {
  documentId: string;
  revisionId: string;
  decision: 'approve' | 'reject';
  escalateToAreaManager?: boolean;
  comment?: string;
}

export async function submitResidentEngineerReview(
  input: ResidentEngineerReviewInput,
): Promise<{ success: boolean; newStatus?: string; error?: string }>;
// Validation:
// 1. requireCan('review.decide')
// 2. verifies private.can_see_project on document.project_id
// 3. checks document.status === 'submitted'
// 4. if decision === 'reject':
//      ensures comment.trim().length >= 5
//      updates document.status = 'rejected'
// 5. if decision === 'approve' and input.escalateToAreaManager === true:
//      updates document.status = 'escalated'
// 6. if decision === 'approve' and not escalate:
//      updates document.status = 'ready_for_authority'
// 7. inserts row into public.document_reviews (level: 're', decision, comment)
```

---

## 5. Database & RLS Policies

```sql
-- Read drawings in assigned projects
create policy "re_documents_select"
on public.documents
for select
using (
  private.has_role(array['resident_engineer'])
  and private.can_see_project(project_id)
);

-- Insert review records at 're' level
create policy "re_reviews_insert"
on public.document_reviews
for insert
with check (
  private.has_role(array['resident_engineer'])
  and level = 're'
  and reviewer_id = (select auth.uid())
  and exists (
    select 1
    from public.documents d
    where d.id = document_id
      and private.can_see_project(d.project_id)
  )
);

-- Update document status via review decision
create policy "re_documents_status_update"
on public.documents
for update
using (
  private.has_role(array['resident_engineer'])
  and private.can_see_project(project_id)
  and status = 'submitted'
)
with check (
  private.has_role(array['resident_engineer'])
  and private.can_see_project(project_id)
  and status in ('escalated', 'ready_for_authority', 'rejected')
);

-- RE has ZERO select policy on project_confidential
```

---

## 6. Acceptance Test Suite

### Positive Tests

- [ ] **TC-RE-01**: RE approves submitted drawing without escalation; status changes to `ready_for_authority` and drawing exits review queue.
- [ ] **TC-RE-02**: RE approves submitted drawing with escalation; status changes to `escalated` and drawing appears in Area Manager review queue.
- [ ] **TC-RE-03**: RE rejects submitted drawing with detailed comment; status changes to `rejected` and rejection comment displays to author.

### Negative & Security Tests

- [ ] **TC-RE-04**: RE attempts to upload drawing; denied at UI (no upload button) and server action (`requireCan('document.upload')` throws 403).
- [ ] **TC-RE-05**: RE attempts to reject drawing with blank comment; rejected by validation guard and database check constraint.
- [ ] **TC-RE-06**: RE attempts to review a drawing on an unassigned project; returns 404 / access denied.
- [ ] **TC-RE-07**: RE attempts to edit or replace an upload; rejected by permission guard (`requireCan('document.edit.own')` throws 403).
- [ ] **TC-RE-08**: RE attempts to archive or permanently purge a document; rejected with 403 Forbidden.
- [ ] **TC-RE-09**: RE queries `project_confidential` table directly; returns zero rows.
- [ ] **TC-RE-10**: RE attempts to edit NOC matrix or tracker fees; rejected with 403 Forbidden.
