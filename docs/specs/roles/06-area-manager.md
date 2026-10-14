# CVTEC EDMS – Area Manager (AM) Role Specification

**Path**: `docs/specs/roles/06-area-manager.md`  
**Status**: Approved  
**Version**: 1.0  
**Updated**: 2026-10-14

---

## 1. Executive Summary & Scope

The **Area Manager (AM)** oversees engineering operations across **all projects** (`project.viewAll`). The AM acts as the **second-level technical reviewer**, resolving escalated engineering drawings and directly reviewing submissions on projects where no Resident Engineer is assigned (RE absent). The AM has full visibility into both contractor and confidential consultant contract amounts, but **cannot upload or edit documents** and **cannot record NOC fees**.

---

## 2. Capabilities & Permissions

Inherits foundation contracts from [00-foundation.md](./00-foundation.md).

| Capability               | Allowed | Constraint / Note                                                    |
| ------------------------ | :-----: | -------------------------------------------------------------------- |
| Project Scope            | **All** | Full cross-project visibility (`project.viewAll`)                    |
| Second-Level Review      |  **✓**  | Reviews `escalated` drawings and `submitted` drawings when RE absent |
| Approve Drawing          |  **✓**  | Transitions drawing directly to `ready_for_authority`                |
| Reject Drawing           |  **✓**  | Requires mandatory comment; transitions to `rejected`                |
| View Documents & NOCs    |  **✓**  | Across all projects                                                  |
| Upload Documents         |  **—**  | Denied (oversight and review role only)                              |
| Edit / Replace Documents |  **—**  | Denied                                                               |
| Archive / Soft Delete    |  **—**  | Denied                                                               |
| Permanent Purge          |  **—**  | Denied                                                               |
| Edit NOC Matrix          |  **—**  | Denied                                                               |
| Record NOC Fees          |  **—**  | Denied (exclusive to Auth Eng, DC, and Admin)                        |
| Update NOC Tracker       |  **—**  | Denied (read-only view)                                              |
| View Contractor Amount   |  **✓**  | Permitted (`projects.client_contractor_amount`)                      |
| View Consultant Amount   |  **✓**  | Permitted (`project_confidential.client_consultant_amount`)          |
| User Management          |  **—**  | Denied                                                               |
| Expiry Alerts            |  **—**  | Not subscribed to operational expiry emails                          |

---

## 3. UI Navigation & Route Map

### 3.1 Primary Header Navigation

- **Dashboard**: `/dashboard`
- **Documents**: `/documents`
- **Review Queue**: `/reviews`
- **NOC Tracker**: `/noc` (view-only)
- _Omitted from navigation_: `/users`, `/matrix`, `/archive`, `/projects/new`.

### 3.2 View Specifications & Components

#### `/reviews` (Area Manager Review Queue)

- **ReviewQueueTable**: Fetches items satisfying either of two conditions:
  1. `status === 'escalated'` across any project.
  2. `status === 'submitted'` on projects where `resident_engineer` is not present in `project_members` (RE absent fallback).
- **EscalationBadge**: Shows _"Escalated by RE [Name]"_ along with the RE's escalation notes.
- **DrawingReviewModal**:
  - Embedded PDF/DWG drawing viewer.
  - Previous revision comments and RE escalation rationale.
  - **Decision Controls**:
    - **Approve**: Transitions status to `ready_for_authority`.
    - **Reject**: Requires non-empty **Reviewer Comment** textarea. Transitions status to `rejected` (returns to drawing author).

#### `/dashboard`

- Regional overview: Total active projects, escalated drawings count, pending authority approvals.
- Financial overview: Shows Contractor Amount and Consultant Amount side-by-side.

#### `/documents` & `/noc`

- Global read-only views. Upload buttons, in-place edit buttons, and fee payment modals are completely removed from the DOM.

---

## 4. Server Actions & Contracts

All AM review actions use the unified review action defined in `app/actions/reviews.ts`.

### 4.1 Second-Level Review Action

```typescript
export interface AreaManagerReviewInput {
  documentId: string;
  revisionId: string;
  decision: 'approve' | 'reject';
  comment?: string;
}

export async function submitAreaManagerReview(
  input: AreaManagerReviewInput,
): Promise<{ success: boolean; newStatus?: string; error?: string }>;
// Validation:
// 1. requireCan('review.decide')
// 2. verifies caller has role 'area_manager' (or 'admin')
// 3. checks document.status is either 'escalated' OR ('submitted' and isReAbsent(document.project_id))
// 4. if decision === 'reject':
//      ensures comment.trim().length >= 5
//      updates document.status = 'rejected'
// 5. if decision === 'approve':
//      updates document.status = 'ready_for_authority'
// 6. inserts row into public.document_reviews (level: 'am', decision, comment)
```

### 4.2 RE Absent Check Helper

```typescript
export async function isResidentEngineerAbsent(
  projectId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('project_members')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('role', 'resident_engineer');
  return count === 0;
}
```

---

## 5. Database & RLS Policies

```sql
-- AM can view all projects and confidential financials
create policy "am_projects_select"
on public.projects
for select
using (private.has_role(array['area_manager']));

create policy "am_confidential_select"
on public.project_confidential
for select
using (private.has_role(array['area_manager']));

-- AM can view all documents
create policy "am_documents_select"
on public.documents
for select
using (private.has_role(array['area_manager']));

-- Insert review records at 'am' level
create policy "am_reviews_insert"
on public.document_reviews
for insert
with check (
  private.has_role(array['area_manager'])
  and level = 'am'
  and reviewer_id = (select auth.uid())
);

-- Update document status via review decision
create policy "am_documents_status_update"
on public.documents
for update
using (
  private.has_role(array['area_manager'])
  and (
    status = 'escalated'
    or (
      status = 'submitted'
      and not exists (
        select 1 from public.project_members pm
        join public.profiles p on p.id = pm.user_id
        where pm.project_id = documents.project_id
          and p.role = 'resident_engineer'
      )
    )
  )
)
with check (
  private.has_role(array['area_manager'])
  and status in ('ready_for_authority', 'rejected')
);

-- AM has ZERO insert or delete policies on public.documents
```

---

## 6. Acceptance Test Suite

### Positive Tests

- [ ] **TC-AM-01**: Drawing escalated by RE appears in AM review queue across any project.
- [ ] **TC-AM-02**: Project with no assigned RE shows submitted drawings directly in AM review queue.
- [ ] **TC-AM-03**: AM approves escalated drawing; status transitions to `ready_for_authority`.
- [ ] **TC-AM-04**: AM rejects drawing with comment; status transitions to `rejected` and author sees feedback.
- [ ] **TC-AM-05**: AM views both contractor amount and confidential consultant amount across all projects.

### Negative & Security Tests

- [ ] **TC-AM-06**: Drawing approved by RE without escalation does NOT appear in AM review queue.
- [ ] **TC-AM-07**: AM attempts to upload a new document; rejected with 403 Forbidden.
- [ ] **TC-AM-08**: AM attempts to edit or archive a document; rejected with 403 Forbidden.
- [ ] **TC-AM-09**: AM attempts to call `recordNocFeePayment`; rejected with 403 Forbidden.
- [ ] **TC-AM-10**: AM attempts to invite users or edit roles; rejected with 403 Forbidden.
