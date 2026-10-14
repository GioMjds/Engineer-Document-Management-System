# CVTEC EDMS – Chief Executive Officer (CEO) Role Specification

**Path**: `docs/specs/roles/07-ceo.md`  
**Status**: Approved  
**Version**: 1.0  
**Updated**: 2026-10-14

---

## 1. Executive Summary & Scope

The **Chief Executive Officer (CEO)** maintains high-level strategic visibility across **all projects** (`project.viewAll`). The CEO role is **strictly read-only**. The CEO monitors project progress, regulatory NOC approvals, delivery delays, and both contractor and confidential consultant contract amounts. The CEO possesses zero mutation privileges: no document uploads, no review decisions, no administrative settings, and no NOC modifications.

---

## 2. Capabilities & Permissions

Inherits foundation contracts from [00-foundation.md](./00-foundation.md).

| Capability                | Allowed | Constraint / Note                                            |
| ------------------------- | :-----: | ------------------------------------------------------------ |
| Project Scope             | **All** | Read-only visibility across all projects (`project.viewAll`) |
| View Documents & NOCs     |  **✓**  | View metadata and download files across all projects         |
| Upload Documents          |  **—**  | Denied (strictly read-only)                                  |
| Edit / Replace Documents  |  **—**  | Denied                                                       |
| Archive / Soft Delete     |  **—**  | Denied                                                       |
| Permanent Purge           |  **—**  | Denied                                                       |
| Approve / Reject Drawings |  **—**  | Denied                                                       |
| Edit NOC Matrix           |  **—**  | Denied                                                       |
| Update NOC Tracker        |  **—**  | Denied (read-only view)                                      |
| Override NOC Sequence     |  **—**  | Denied                                                       |
| View Contractor Amount    |  **✓**  | Permitted (`projects.client_contractor_amount`)              |
| View Consultant Amount    |  **✓**  | Permitted (`project_confidential.client_consultant_amount`)  |
| User Management           |  **—**  | Denied                                                       |
| Expiry Alerts             |  **—**  | Not subscribed to operational emails                         |

---

## 3. UI Navigation & Route Map

### 3.1 Primary Header Navigation

- **Dashboard**: `/dashboard`
- **NOC Tracker**: `/noc` (view-only)
- **Documents**: `/documents` (view & download only)
- _Omitted from navigation_: `/users`, `/reviews`, `/matrix`, `/archive`, `/projects/new`.

### 3.2 View Specifications & Components

#### `/dashboard` (Executive KPI Dashboard)

- **ExecutiveSummaryCards**:
  - Total Active Projects.
  - Overall NOC Completion Rate (% obtained vs required).
  - Critical Delays: Count of NOCs past scheduled submission target.
  - Upcoming Expiries: NOCs expiring within next 14 days.
  - Review Backlog: Drawings currently in `submitted` or `escalated` status.
- **FinancialPortfolioWidget**:
  - Total Contractor Contract Sum.
  - Total Consultant Contract Sum.
  - Per-project financial breakdown table.

#### `/noc` (Executive Permitting Tracker)

- Read-only pipeline and timeline view of all statutory milestones.
- Can inspect authority submission reference, approval date, and fee audit history.
- Fee recording modals, status change dropdowns, and prerequisite override buttons are excluded from the DOM.

#### `/documents` (Executive Document Library)

- Searchable catalog of drawings and project documents across all disciplines and projects.
- "Download Original" / "Download Approved PDF" actions enabled.
- "Upload Drawing", "Edit Metadata", "Upload Revision", and "Archive" buttons are excluded from the DOM.

---

## 4. Server Actions & Contracts

The CEO role executes zero mutating actions. All data retrieval queries run through read-only server loaders.

### 4.1 Executive Data Loaders (`app/loaders/ceo.ts`)

```typescript
export interface ExecutiveKpiSummary {
  activeProjectsCount: number;
  nocCompletionPercentage: number;
  criticalDelaysCount: number;
  expiringNocsCount: number;
  reviewBacklogCount: number;
  totalContractorAmount: number;
  totalConsultantAmount: number;
  projectFinancials: Array<{
    projectId: string;
    projectName: string;
    stage: string;
    contractorAmount: number;
    consultantAmount: number;
  }>;
}

export async function getExecutiveDashboardSummary(): Promise<ExecutiveKpiSummary>;
```

### 4.2 Universal Mutation Rejection

Every mutating server action in the codebase verifies authorization via `await requireCan(...)`. Because the `ceo` role is omitted from all write capabilities in `PERMISSIONS`, calling any mutation action as CEO automatically rejects with `UnauthorizedError`.

---

## 5. Database & RLS Policies

```sql
-- Read-only project and financial visibility
create policy "ceo_projects_select"
on public.projects
for select
using (private.has_role(array['ceo']));

create policy "ceo_confidential_select"
on public.project_confidential
for select
using (private.has_role(array['ceo']));

create policy "ceo_documents_select"
on public.documents
for select
using (private.has_role(array['ceo']));

create policy "ceo_noc_select"
on public.project_nocs
for select
using (private.has_role(array['ceo']));

create policy "ceo_reviews_select"
on public.document_reviews
for select
using (private.has_role(array['ceo']));

-- CEO has ZERO insert, update, or delete policies on ANY table or storage bucket
```

---

## 6. Acceptance Test Suite

### Positive Tests

- [ ] **TC-CEO-01**: CEO logs in; navigation displays only Dashboard, NOC Tracker, and Documents.
- [ ] **TC-CEO-02**: CEO views projects they are not explicitly assigned to in `project_members`.
- [ ] **TC-CEO-03**: CEO views both Contractor and Consultant amounts across all projects.
- [ ] **TC-CEO-04**: CEO downloads drawing files and inspects NOC historical audit trails.

### Negative & Security Tests

- [ ] **TC-CEO-05**: CEO calls `uploadDocument` or `editDocument`; rejected with 403 Forbidden.
- [ ] **TC-CEO-06**: CEO directly attempts SQL INSERT / UPDATE on `documents` using Supabase client session; rejected by RLS.
- [ ] **TC-CEO-07**: CEO calls `reviewDocument` (approve/reject); rejected with 403 Forbidden.
- [ ] **TC-CEO-08**: CEO calls `recordNocFeePayment` or `updateNocStatus`; rejected with 403 Forbidden.
- [ ] **TC-CEO-09**: CEO attempts to access `/users` or invite users; rejected with 403 Forbidden.
- [ ] **TC-CEO-10**: CEO calls `purgeDocument` or `archiveDocument`; rejected with 403 Forbidden.
