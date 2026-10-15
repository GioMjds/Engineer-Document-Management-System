import { Badge } from '@/components/ui/badge';

const styles = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  archived: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  ready_for_authority: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300',
  escalated: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
} satisfies Record<string, string>;

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase() as keyof typeof styles;
  const styleClass = styles[key] || styles.draft;
  const label =
    key === 'ready_for_authority'
      ? 'Ready for Authority'
      : key === 'escalated'
        ? 'Escalated (AM Queue)'
        : status;

  return (
    <Badge
      variant="outline"
      className={`border-transparent capitalize ${styleClass}`}
    >
      {label}
    </Badge>
  );
}
