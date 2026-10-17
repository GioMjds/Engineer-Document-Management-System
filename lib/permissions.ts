// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

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

/** Legacy values still present in lib/auth.ts and old profile rows. */
const LEGACY_ROLES = {
  doc_controller: 'dc',
  manager: 'area_manager',
} satisfies Record<string, AppRole>;

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (!role) return null;
  if ((ROLES as readonly string[]).includes(role)) return role as AppRole;
  return LEGACY_ROLES[role as keyof typeof LEGACY_ROLES] ?? null;
}

const ALL = ROLES;

export const PERMISSIONS = {
  'project.viewAll': ['admin', 'ceo', 'area_manager'],
  'project.create': ['admin'],
  // Sets the client and contractor contact emails on a project (proposed: Admin only).
  'project.contacts.manage': ['admin'],

  // Adds or removes master and reviewing authorities
  'authority.master.manage': ['admin'],
  'authority.reviewing.manage': ['admin', 'authority_engineer', 'dc'],

  // Navigation
  'dashboard.view': ALL,

  // Documents
  'document.view': ALL,
  // Upload includes uploading a new revision (R01, R02...) after a rejection.
  'document.upload': [
    'admin',
    'authority_engineer',
    'engineer',
    'dc',
  ],
  // In-place edit or replace of ANY file in scope.
  'document.edit': ['admin', 'dc'],
  // In-place edit or replace of a file the user uploaded. Use canEditDocument(),
  // because this capability alone does not check ownership.
  // Engineers cannot edit/replace; they only upload new revisions or inform DC for adjustments.
  'document.edit.own': ['authority_engineer'],
  // "Delete" is always a restorable archive, never a hard delete.
  'document.archive': ['admin', 'dc'],

  // Archive page
  'archive.view': ['admin', 'dc'],
  'archive.restore': ['admin', 'dc'],
  'archive.purge': ['admin'],

  // Review workflow: RE is first level, AM is second level (flagged or RE absent).
  'review.queue': ['admin', 'resident_engineer', 'area_manager'],
  'review.decide': ['admin', 'resident_engineer', 'area_manager'],
  'review.escalate': ['resident_engineer'],

  // NOC tracker and matrix
  'noc.view': ALL,
  'noc.tracker.update': ['admin', 'authority_engineer', 'dc'], // not AM
  'noc.sequence.override': ['admin'], // reason is mandatory
  'noc.matrix.view': ['admin', 'authority_engineer', 'dc'],
  'noc.matrix.edit': ['admin', 'authority_engineer', 'dc'],

  // Money
  'amount.consultant.view': ['admin', 'ceo', 'area_manager'],
  'amount.contractor.view': ALL,

  // Administration
  'users.manage': ['admin'], // invite users, change roles, assign people to projects
  'audit.view': ['admin'],

  // Notifications
  'expiry.notify': ['authority_engineer', 'engineer', 'dc'],
} as const satisfies Record<string, readonly AppRole[]>;

export type Capability = keyof typeof PERMISSIONS;

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export function can(
  role: string | null | undefined,
  capability: Capability,
): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  return (PERMISSIONS[capability] as readonly AppRole[]).includes(r);
}

/**
 * In-place edit rule for a specific document: DC and Admin edit any file in scope,
 * Engineers only files they uploaded. Pass the current user's id and the file's uploader id.
 */
export function canEditDocument(
  role: string | null | undefined,
  userId: string,
  doc: { uploadedBy: string | null },
): boolean {
  if (can(role, 'document.edit')) return true;
  return can(role, 'document.edit.own') && doc.uploadedBy === userId;
}

/** Roles that hold a capability. Handy for requireRole() arrays and RLS generation. */
export function rolesWith(capability: Capability): AppRole[] {
  return [...(PERMISSIONS[capability] as readonly AppRole[])];
}

/** Which approval level a role acts at. Admin can act at either level. */
export function reviewStageFor(
  role: string | null | undefined,
): 'first' | 'second' | 'any' | null {
  const r = normalizeRole(role);
  if (r === 'admin') return 'any';
  if (r === 'resident_engineer') return 'first';
  if (r === 'area_manager') return 'second';
  return null;
}

// ---------------------------------------------------------------------------
// External notifications (client and contractor never log in)
// ---------------------------------------------------------------------------

export const EXTERNAL_PARTIES = ['client', 'contractor'] as const;
export type ExternalParty = (typeof EXTERNAL_PARTIES)[number];

export const EXTERNAL_EVENTS = [
  'noc.obtained',
  'noc.expiring',
  'noc.rejected',
] as const;
export type ExternalEvent = (typeof EXTERNAL_EVENTS)[number];

/** Days before expiry that triggers the 'noc.expiring' email (same as the internal alert). */
export const EXPIRY_WARNING_DAYS = 14;

/** Confirmed: all three events email both parties. */
export const EXTERNAL_EMAIL_EVENTS: Record<
  ExternalEvent,
  readonly ExternalParty[]
> = {
  'noc.obtained': ['client', 'contractor'],
  'noc.expiring': ['client', 'contractor'],
  'noc.rejected': ['client', 'contractor'],
};

export type AmountKind = 'client_consultant' | 'client_contractor';

/**
 * PROPOSED, not confirmed: a party only sees amounts of contracts it is part of.
 * The client is party to both contracts. The contractor is party only to the
 * client-contractor one, and must never be sent the (confidential) consultant amount.
 */
export const EXTERNAL_EMAIL_AMOUNTS: Record<
  ExternalParty,
  readonly AmountKind[]
> = {
  client: ['client_consultant', 'client_contractor'],
  contractor: ['client_contractor'],
};

export function externalRecipients(
  event: ExternalEvent,
): readonly ExternalParty[] {
  return EXTERNAL_EMAIL_EVENTS[event];
}

export function externalAmountsFor(
  party: ExternalParty,
): readonly AmountKind[] {
  return EXTERNAL_EMAIL_AMOUNTS[party];
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export const NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  capability: Capability;
}> = [
  { href: '/', label: 'Dashboard', capability: 'dashboard.view' },
  { href: '/noc-tracker', label: 'NOC Tracker', capability: 'noc.view' },
  { href: '/noc-matrix', label: 'NOC Matrix', capability: 'noc.matrix.view' },
  { href: '/documents', label: 'Documents', capability: 'document.view' },
  { href: '/review', label: 'Review', capability: 'review.queue' },
  { href: '/archive', label: 'Archive', capability: 'archive.view' },
  { href: '/users', label: 'Users', capability: 'users.manage' },
  { href: '/audit-logs', label: 'Audit Logs', capability: 'audit.view' },
];

export function navFor(role: string | null | undefined) {
  return NAV_ITEMS.filter((item) => can(role, item.capability));
}

// ---------------------------------------------------------------------------
// Matrix export (for tests and for comparing against the client's baseline)
// ---------------------------------------------------------------------------

export function matrixRows(): Array<
  { capability: Capability } & Record<AppRole, boolean>
> {
  return (Object.keys(PERMISSIONS) as Capability[]).map((capability) => {
    const row = { capability } as { capability: Capability } & Record<
      AppRole,
      boolean
    >;
    for (const role of ROLES) row[role] = can(role, capability);
    return row;
  });
}
