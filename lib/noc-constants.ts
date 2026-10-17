import type { Enums } from '@/types/database';

export type NocStage = Enums<'noc_stage'>;
export type NocSubmitter = Enums<'noc_submitter'>;
export type AppRole = Enums<'app_role'>;

export const STAGE_ORDER = [
  'design',
  'information',
  'construction',
  'handover',
] satisfies readonly NocStage[];

export const STAGE_LABEL = {
  design: 'Design NOC',
  information: 'Information NOC',
  construction: 'Construction NOC',
  handover: 'Handover NOC',
} satisfies Record<NocStage, string>;

export const SUBMITTER_ORDER = [
  'consultant',
  'client',
  'contractor',
  'specialist',
] satisfies readonly NocSubmitter[];

export const SUBMITTER_LABEL = {
  consultant: 'Consultant',
  client: 'Client',
  contractor: 'Contractor',
  specialist: 'Specialist',
} satisfies Record<NocSubmitter, string>;

export const ROLE_LABEL = {
  admin: 'Administrator',
  dc: 'Document Controller',
  authority_engineer: 'Authority Engineer',
  engineer: 'Engineer',
  resident_engineer: 'Resident Engineer',
  area_manager: 'Area Manager',
  ceo: 'CEO',
} satisfies Record<AppRole, string>;

export const MATRIX_EDIT_ROLES = [
  'admin',
  'authority_engineer',
  'dc',
] satisfies readonly AppRole[];

export const canEditMatrix = (role?: string | null): boolean =>
  Boolean(role && (MATRIX_EDIT_ROLES as readonly string[]).includes(role));

export const AUTHORITY_BADGE_PALETTE = [
  'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
] as const;

// Hashes reviewing authority ID or name into a deterministic palette index.
export function getAuthorityBadgeStyle(
  authorityIdOrName?: number | string | null,
): string {
  if (!authorityIdOrName) {
    return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
  if (typeof authorityIdOrName === 'number') {
    if (authorityIdOrName <= 0) {
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    }
    const index = Math.abs(authorityIdOrName - 1) % AUTHORITY_BADGE_PALETTE.length;
    return AUTHORITY_BADGE_PALETTE[index];
  }
  const str = authorityIdOrName.trim();
  if (!str) {
    return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AUTHORITY_BADGE_PALETTE.length;
  return AUTHORITY_BADGE_PALETTE[index];
}

// Maps statutory submitter to high-contrast badge styling.
export function getSubmitterBadgeStyle(submitter?: string | null): string {
  const norm = (submitter || '').toLowerCase();
  switch (norm) {
    case 'consultant':
      return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    case 'client':
      return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    case 'contractor':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    case 'specialist':
    case 'specialists':
      return 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
}

// Formats fee using en-AE locale to prevent server-client hydration mismatch.
export function formatAed(amount: number): string {
  return `${new Intl.NumberFormat('en-AE').format(amount)} AED`;
}
