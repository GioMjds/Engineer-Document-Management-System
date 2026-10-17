// Helper functions for statutory NOC matrix blueprint classifications and badge styles.

import { ROLE_LABEL } from "@/lib/noc-constants";
import { NocMatrixRevision } from "@/types/noc";

export function getDisciplineTag(title: string): string {
  const lower = (title || '').toLowerCase();
  if (
    lower.includes('mep') ||
    lower.includes('electrical') ||
    lower.includes('plumbing') ||
    lower.includes('substation') ||
    lower.includes('hvac')
  ) {
    return 'MEP';
  }
  if (
    lower.includes('struct') ||
    lower.includes('soil') ||
    lower.includes('foundation') ||
    lower.includes('shoring') ||
    lower.includes('piling')
  ) {
    return 'STRUCTURAL';
  }
  if (
    lower.includes('arch') ||
    lower.includes('elevation') ||
    lower.includes('layout') ||
    lower.includes('aesthetic')
  ) {
    return 'ARCHITECTURAL';
  }
  if (
    lower.includes('civil') ||
    lower.includes('road') ||
    lower.includes('traffic') ||
    lower.includes('drainage') ||
    lower.includes('sewer')
  ) {
    return 'CIVIL';
  }
  if (
    lower.includes('fire') ||
    lower.includes('dcd') ||
    lower.includes('safety') ||
    lower.includes('evacuation')
  ) {
    return 'LIFE SAFETY';
  }
  return 'AUTHORITY';
}

export { getAuthorityBadgeStyle, getSubmitterBadgeStyle } from '@/lib/noc-constants';

// Maps discipline names to high-contrast tag styling.
export function getDisciplineBadgeClass(discipline: string): string {
  switch (discipline) {
    case 'MEP':
      return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
    case 'STRUCTURAL':
      return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30';
    case 'ARCHITECTURAL':
      return 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30';
    case 'CIVIL':
      return 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30';
    case 'LIFE SAFETY':
      return 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30';
    default:
      return 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-300 border-zinc-500/30';
  }
}

// Maps revision actions to badge styles.
export function getActionBadgeClass(action: string): string {
  return getActionBadgeStyle(action as NocMatrixRevision['action']);
}

// Formats timestamp deterministically across client and server.
export function formatUtcTimestamp(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  } catch {
    return dateStr;
  }
}

export function formatRevisionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function getActionBadgeStyle(action: NocMatrixRevision['action']): string {
  switch (action) {
    case 'CREATE':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    case 'UPDATE':
      return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    case 'DELETE':
      return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    case 'REORDER':
      return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
}

export function formatRoleName(role?: string): string {
  if (!role) return 'Authority Engineer';
  return (ROLE_LABEL as Record<string, string>)[role] || role;
}