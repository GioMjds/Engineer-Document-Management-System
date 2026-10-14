# CVTEC EDMS – Foundation Architecture Specification

**Path**: `docs/specs/roles/00-foundation.md`  
**Status**: Approved  
**Version**: 1.0  
**Updated**: 2026-10-14

---

## 1. Scope & Purpose

This document establishes the shared architectural foundation for the CVTEC Engineering Document Management System (EDMS). Every individual role specification (`01-admin.md` through `07-ceo.md`) inherits and enforces the contracts defined here.

---

## 2. Identity & Role Architecture

### 2.1 Role Enum

The system defines exactly seven active roles:

```typescript
export const ROLES = [
  'admin',
  'ceo',
  'area_manager',
  'resident_engineer',
  'authority_engineer',
  'engineer',
  'dc',
] as const;

export type AppRole = (typeof ROLES)[number];
```

### 2.2 Profile Storage & Identity Provisioning

1. User roles are stored in `public.profiles.role`.
2. Roles are **never** trusted from `user_metadata` or client-supplied JWT claims without server validation.
3. A Postgres trigger on `auth.users` creates the `profiles` row upon invitation/signup:

```sql
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = ''
language plpgsql as $$
begin
  insert into public.profiles (id, email, role, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'engineer')::public.app_role,
    now(),
    now()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 2.3 Engineering Disciplines

- Disciplines (`mep`, `architect`, `structure`, `civil`) are **not** system roles.
- Disciplines are stored per project assignment on `public.project_members.discipline`.

---

## 3. Authorization Layer (`lib/permissions.ts`)

`lib/permissions.ts` is the single source of truth for authorization across UI and server actions.

### 3.1 Capability Matrix

```typescript
export const PERMISSIONS = {
  // Project Scope
  'project.viewAll': ['admin', 'ceo', 'area_manager'],
  'project.create': ['admin'],
  'project.contacts.manage': ['admin'],

  // Navigation
  'dashboard.view': [
    'admin',
    'ceo',
    'area_manager',
    'resident_engineer',
    'authority_engineer',
    'engineer',
    'dc',
  ],

  // Documents
  'document.view': [
    'admin',
    'ceo',
    'area_manager',
    'resident_engineer',
    'authority_engineer',
    'engineer',
    'dc',
  ],
  'document.upload': [
    'admin',
    'resident_engineer',
    'authority_engineer',
    'engineer',
    'dc',
  ],
  'document.edit': ['admin', 'dc'],
  'document.edit.own': ['resident_engineer', 'authority_engineer', 'engineer'],
  'document.archive': ['admin', 'dc'],

  // Archive Management
  'archive.view': ['admin', 'dc'],
  'archive.restore': ['admin', 'dc'],
  'archive.purge': ['admin'],

  // Review Workflow
  'review.queue': ['admin', 'resident_engineer', 'area_manager'],
  'review.decide': ['admin', 'resident_engineer', 'area_manager'],

  // NOC Matrix & Tracker
  'noc.matrix.view': [
    'admin',
    'ceo',
    'area_manager',
    'resident_engineer',
    'authority_engineer',
    'engineer',
    'dc',
  ],
  'noc.matrix.edit': ['admin', 'authority_engineer', 'dc'],
  'noc.tracker.view': [
    'admin',
    'ceo',
    'area_manager',
    'resident_engineer',
    'authority_engineer',
    'engineer',
    'dc',
  ],
  'noc.tracker.update': ['admin', 'authority_engineer', 'dc'],
  'noc.sequence.override': ['admin'],

  // Confidential Financials
  'amounts.consultant.view': ['admin', 'ceo', 'area_manager'],
  'amounts.contractor.view': [
    'admin',
    'ceo',
    'area_manager',
    'resident_engineer',
    'authority_engineer',
    'engineer',
    'dc',
  ],

  // Administration
  'users.manage': ['admin'],
  'assignments.manage': ['admin'],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
```

### 3.2 Authorization Helpers

- `can(role: AppRole | null | undefined, capability: PermissionKey): boolean`
- `requireCan(capability: PermissionKey): Promise<Profile>`: server-side guard throwing `UnauthorizedError` if permission check fails.

---

## 4. Database Security Helpers & RLS Architecture

All database tables enforce row-level security through private security-definer helper functions with an empty `search_path`.

### 4.1 Security Definer Functions

```sql
create schema if not exists private;

-- Role check function
create or replace function private.has_role(allowed_roles text[])
returns boolean
security definer set search_path = ''
language sql stable as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = any(allowed_roles)
  );
$$;

-- Project visibility function
create or replace function private.can_see_project(target_project_id uuid)
returns boolean
security definer set search_path = ''
language sql stable as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role in ('admin', 'ceo', 'area_manager')
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = target_project_id
            and pm.user_id = p.id
        )
      )
  );
$$;
```

---

## 5. Financial Confidentiality Split

To ensure strict database-level isolation, contract amounts are split across two tables:

1. `public.projects`:
   - Contains `client_contractor_amount numeric(14,2)`.
   - Readable by any user where `private.can_see_project(id)` evaluates to `true`.

2. `public.project_confidential`:
   - Contains `project_id uuid primary key references public.projects(id) on delete cascade`.
   - Contains `client_consultant_amount numeric(14,2)`.
   - RLS Policy:

```sql
create policy "confidential_amounts_select"
on public.project_confidential
for select
using (
  private.has_role(array['admin', 'ceo', 'area_manager'])
);
```

---

## 6. Document Review State Machine

### 6.1 Status Enum & State Transitions

- Statuses: `submitted`, `escalated`, `ready_for_authority`, `rejected`.
- Workflow transitions:
  - Initial upload: R00 created with status `submitted`.
  - RE review:
    - Approve (no escalation) -> `ready_for_authority`.
    - Approve (escalate) -> `escalated`.
    - Reject (comment required) -> `rejected`.
  - AM review (for `escalated` or RE absent):
    - Approve -> `ready_for_authority`.
    - Reject (comment required) -> `rejected`.
  - Rejection recovery:
    - Author uploads R01 -> transitions back to `submitted`.

### 6.2 `document_reviews` Table Schema

```sql
create table public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  revision_id uuid not null references public.document_revisions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  level text not null check (level in ('re', 'am', 'admin')),
  decision text not null check (decision in ('approve', 'reject')),
  comment text,
  created_at timestamptz not null default now(),
  constraint rejection_comment_required check (
    decision != 'reject' or (comment is not null and length(trim(comment)) > 0)
  )
);
```

---

## 7. Soft Delete & Audit Logging

### 7.1 Soft Delete Policy

- Documents table includes `archived_at timestamptz` and `archived_by uuid references public.profiles(id)`.
- No `DELETE` policies exist on `public.documents` for non-admin roles.
- Purge is an explicit server action executable only by `admin`.

### 7.2 Audit Log Schema

```sql
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log_admin_select"
on public.audit_log
for select
using (private.has_role(array['admin']));
```

---

## 8. Shared Acceptance Criteria

- [ ] Unauthenticated requests are rejected with 401 across all server actions.
- [ ] Users without required capability fail at server action layer via `requireCan`.
- [ ] Direct Supabase queries bypassing server actions fail at database RLS layer.
- [ ] Rejection without comment is blocked at both client, server action, and database constraint.
- [ ] Consultant amount is inaccessible to DC, Engineer, RE, and Auth Eng via direct SQL or API payloads.
