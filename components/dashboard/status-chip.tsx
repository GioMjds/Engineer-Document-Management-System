import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES = {
  success: { cls: 'bg-success-subtle text-success-fg', Icon: CheckCircle2 },
  warning: { cls: 'bg-warning-subtle text-warning-fg', Icon: Clock },
  danger: { cls: 'bg-danger-subtle text-danger-fg', Icon: AlertTriangle },
  info: { cls: 'bg-info-subtle text-info-fg', Icon: Info },
  neutral: { cls: 'bg-muted text-foreground/75', Icon: Circle },
} as const;

/** Maps free-text workflow statuses to a tone. Adjust once the status enums are final. */
export function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (/(reject|fail|lapse|expire)/.test(s)) return 'danger';
  if (/(approv|complete|done|issued|obtained)/.test(s)) return 'success';
  if (/(not started|unassigned)/.test(s)) return 'neutral';
  if (/(review|submit|upload|progress|pending|with)/.test(s)) return 'info';
  return 'neutral';
}

/** Never color-only: every tone carries an icon and a text label. */
export function StatusChip({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  const { cls, Icon } = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium tabular-nums',
        cls,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  );
}
