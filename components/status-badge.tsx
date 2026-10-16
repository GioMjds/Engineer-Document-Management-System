import { Badge } from '@/components/ui/badge';

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG = {
  submitted: {
    label: 'Under Review - Resident Engineer',
    className:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  escalated: {
    label: 'Under Review - Area Manager',
    className:
      'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  },
  ready_for_authority: {
    label: 'Approved for Authority Submission',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  approved: {
    label: 'Approved',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  rejected: {
    label: 'Changes Requested',
    className:
      'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  },
  archived: {
    label: 'Archived',
    className:
      'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
  },
  draft: {
    label: 'Draft',
    className:
      'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300',
  },
} satisfies Record<string, StatusConfig>;

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const config = STATUS_CONFIG[key as keyof typeof STATUS_CONFIG] || {
    label: status,
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  return (
    <Badge
      variant="outline"
      className={`border text-[11px] font-medium ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
