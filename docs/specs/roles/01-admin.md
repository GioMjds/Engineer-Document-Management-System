# CVTEC EDMS – Admin Role Specification

**Path**: `docs/specs/roles/01-admin.md`  
**Status**: Approved  
**Version**: 1.0  
**Updated**: 2026-10-14

---

## 1. Executive Summary & Scope

The **Admin** possesses full operational and governance control over the system. Admin has unrestricted visibility across all projects (`project.viewAll`), configures projects and team assignments, manages user lifecycle, exercises overriding review authority, and manages data archiving and permanent purging.

---

## 2. Capabilities & Permissions

Inherits foundation contracts from [00-foundation.md](./00-foundation.md).

| Capability                 | Allowed | Constraint / Note                                      |
| -------------------------- | :-----: | ------------------------------------------------------ |
| Project Scope              | **All** | Unrestricted access across all existing projects       |
| Register New Projects      |  **✓**  | Exclusive authority (`/projects/new`)                  |
| Assign Users & Disciplines |  **✓**  | Manages `project_members` and discipline tags          |
| User Lifecycle Management  |  **✓**  | Invite, role change, deactivation                      |
| View Documents & NOCs      |  **✓**  | Full visibility                                        |
| Upload & Edit Any Document |  **✓**  | In-place edit or new revisions across all projects     |
| Document Review            |  **✓**  | Can decide at either RE or AM level                    |
| Edit NOC Matrix & Tracker  |  **✓**  | Full edit authority                                    |
| Override NOC Sequence      |  **✓**  | Exclusive authority; mandatory written justification   |
| Soft Delete / Archive      |  **✓**  | Soft deletes files into `/archive`                     |
| Permanent Purge            |  **✓**  | Exclusive authority; permanently deletes record + blob |
| View Financial Amounts     |  **✓**  | Both Consultant and Contractor amounts                 |

---

## 3. UI Navigation & Route Map

### 3.1 Primary Header Navigation

- **Dashboard**: `/dashboard`
- **Projects**: `/projects` (includes "New Project" button -> `/projects/new`)
- **Documents**: `/documents`
- **Review Queue**: `/reviews`
- **NOC Matrix**: `/matrix`
- **NOC Tracker**: `/noc`
- **Users**: `/users`
- **Archive**: `/archive`

### 3.2 View Specifications & Components

#### `/users` (User Management)

- **UserTable**: Lists all users, emails, current role, assignment count, status (`active` / `invited` / `deactivated`).
- **InviteUserModal**: Input for email address and target role selection.
- **RoleSelectorDropdown**: Inline role update.
  - _Guard_: Disables selector if user is the last remaining Admin.
  - _Guard_: Disables selector if target user matches currently logged-in Admin (prevents self-demotion).

#### `/projects/new` (Project Registration)

- **ProjectForm**:
  - Name, client name, contractor name.
  - Stage selector (`pre_construction`, `construction`, `handover`).
  - Contact emails: `client_emails` (text array), `contractor_emails` (text array).
  - Financial amounts: `client_contractor_amount` and `client_consultant_amount`.

#### `/projects/[id]/team` (Project Assignments)

- **MemberAssignmentGrid**: Add/remove Resident Engineer, Authority Engineer, Document Controller, and Engineers.
- **DisciplineDropdown**: Per assigned Engineer, assign discipline (`mep`, `architect`, `structure`, `civil`).

#### `/archive` (Archive & Purge)

- **ArchivedDocumentsTable**: Displays soft-deleted documents with `archived_at` and `archived_by`.
- **RestoreButton**: Calls `restoreDocument(docId)`.
- **PurgeButton**: Opens **PurgeConfirmationModal**. Requires typing the document title or "CONFIRM PURGE" before firing `purgeDocument(docId)`.

#### `/noc` (Sequence Override Modal)

- **OverridePrerequisiteModal**: Appears when attempting to advance a NOC whose prerequisites are unfulfilled.
- Requires non-empty `reason` string before enabling the submission button.

---

## 4. Server Actions & Contracts

All Admin server actions reside in `app/actions/admin.ts` and verify `await requireCan(...)`.

### 4.1 User Administration

```typescript
/** Invites a new user via Supabase Auth Admin API */
export async function inviteUser(
  email: string,
  role: AppRole,
): Promise<{ success: boolean; userId?: string; error?: string }>;

/** Updates user role with safety guards */
export async function updateUserRole(
  targetUserId: string,
  newRole: AppRole,
): Promise<{ success: boolean; error?: string }>;
// Validation:
// 1. If target user is only remaining active admin and newRole != 'admin' -> throw error.
// 2. If targetUserId === currentUser.id and newRole != 'admin' -> throw error.

/** Deactivates user account */
export async function deactivateUser(
  targetUserId: string,
): Promise<{ success: boolean; error?: string }>;
```

### 4.2 Project & Assignment Administration

```typescript
export interface CreateProjectInput {
  name: string;
  clientName: string;
  contractorName: string;
  stage: 'pre_construction' | 'construction' | 'handover';
  clientEmails: string[];
  contractorEmails: string[];
  clientContractorAmount: number;
  clientConsultantAmount: number;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<{ success: boolean; projectId?: string; error?: string }>;

export async function updateProjectMembers(
  projectId: string,
  assignments: Array<{
    userId: string;
    discipline?: 'mep' | 'architect' | 'structure' | 'civil';
  }>,
): Promise<{ success: boolean; error?: string }>;
```

### 4.3 NOC Sequence Override

```typescript
export async function overrideNocSequence(
  nocId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }>;
// Validation:
// 1. requireCan('noc.sequence.override')
// 2. reason must be non-empty string trimmed length >= 5
// 3. Inserts row into public.audit_log (action: 'NOC_SEQUENCE_OVERRIDE')
// 4. Sets public.project_nocs.sequence_overridden = true
```

### 4.4 Permanent Purge

```typescript
export async function purgeDocument(
  docId: string,
): Promise<{ success: boolean; error?: string }>;
// Validation:
// 1. requireCan('archive.purge')
// 2. Deletes storage object from Supabase Storage bucket 'documents'
// 3. Deletes row from public.documents where id = docId
// 4. Logs to public.audit_log (action: 'DOCUMENT_PERMANENT_PURGE')
```

---

## 5. Database & RLS Policies

```sql
-- Full CRUD policies for Admin role across core tables

create policy "admin_all_projects"
on public.projects
for all
using (private.has_role(array['admin']))
with check (private.has_role(array['admin']));

create policy "admin_all_confidential"
on public.project_confidential
for all
using (private.has_role(array['admin']))
with check (private.has_role(array['admin']));

create policy "admin_all_documents"
on public.documents
for all
using (private.has_role(array['admin']))
with check (private.has_role(array['admin']));

create policy "admin_all_noc"
on public.project_nocs
for all
using (private.has_role(array['admin']))
with check (private.has_role(array['admin']));

create policy "admin_all_reviews"
on public.document_reviews
for all
using (private.has_role(array['admin']))
with check (private.has_role(array['admin']));
```

---

## 6. Acceptance Test Suite

### Positive Tests

- [ ] **TC-ADM-01**: Admin invites new user with role `dc`; user appears in user table with status `invited`.
- [ ] **TC-ADM-02**: Admin registers new project with contract amounts; amounts populate in `projects` and `project_confidential`.
- [ ] **TC-ADM-03**: Admin assigns Engineer to project with discipline `mep`; verified in `project_members`.
- [ ] **TC-ADM-04**: Admin approves submitted drawing at RE level, and another drawing at AM level.
- [ ] **TC-ADM-05**: Admin overrides unfulfilled NOC prerequisite with valid reason string; audit log row recorded.
- [ ] **TC-ADM-06**: Admin permanently purges archived document; database row and storage file are both deleted.

### Negative & Security Tests

- [ ] **TC-ADM-07**: Admin attempts to demote sole active Admin account; request rejected with error message.
- [ ] **TC-ADM-08**: Admin attempts to demote own account; request rejected.
- [ ] **TC-ADM-09**: Admin submits NOC override with blank/whitespace reason; rejected by validation guard.
- [ ] **TC-ADM-10**: Non-admin calling `purgeDocument` or `inviteUser` rejected with 403 Forbidden.
