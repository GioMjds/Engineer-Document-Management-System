'use client';

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EscalationBadgeProps {
  reviewerName?: string | null;
  notes?: string | null;
  className?: string;
}

// Visual badge indicating drawing was escalated to second-level review by RE.
export function EscalationBadge({
  reviewerName,
  notes,
  className,
}: EscalationBadgeProps) {
  const label = reviewerName
    ? `Escalated by RE ${reviewerName}`
    : 'Escalated by RE';

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60 text-[10px] font-semibold py-0.5"
        title={notes ? `Escalation Notes: ${notes}` : label}
      >
        <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>{label}</span>
      </Badge>
      {notes && (
        <span className="text-[11px] text-muted-foreground italic truncate max-w-[200px]" title={notes}>
          &quot;{notes}&quot;
        </span>
      )}
    </div>
  );
}
