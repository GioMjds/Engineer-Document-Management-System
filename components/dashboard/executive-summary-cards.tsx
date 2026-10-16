'use client';

import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutiveSummaryCardsProps {
  activeProjectsCount: number;
  nocCompletionPercentage: number;
  criticalDelaysCount: number;
  expiringNocsCount: number;
  reviewBacklogCount: number;
}

interface ExecutiveCardItem {
  label: string;
  value: string | number;
  unit: string;
  note: string;
  icon: LucideIcon;
  valueClass?: string;
  color: string;
}

export function ExecutiveSummaryCards({
  activeProjectsCount,
  nocCompletionPercentage,
  criticalDelaysCount,
  expiringNocsCount,
  reviewBacklogCount,
}: ExecutiveSummaryCardsProps) {
  const cards: ExecutiveCardItem[] = [
    {
      label: 'Active Projects',
      value: activeProjectsCount,
      unit: 'in portfolio',
      note: 'Cross-project strategic oversight',
      icon: Building2,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      label: 'NOC Completion',
      value: `${nocCompletionPercentage}%`,
      unit: 'statutory rate',
      note: 'Obtained vs required authority permits',
      icon: CheckCircle2,
      valueClass: 'text-success',
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      label: 'Critical Delays',
      value: criticalDelaysCount,
      unit: 'NOC milestones',
      note: 'Past scheduled submission target',
      icon: AlertTriangle,
      valueClass: criticalDelaysCount > 0 ? 'text-destructive' : 'text-foreground',
      color:
        criticalDelaysCount > 0
          ? 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400'
          : 'text-muted-foreground bg-muted',
    },
    {
      label: 'Upcoming Expiries',
      value: expiringNocsCount,
      unit: 'next 14 days',
      note: 'Permits requiring renewal action',
      icon: Clock,
      valueClass: expiringNocsCount > 0 ? 'text-warning' : 'text-foreground',
      color:
        expiringNocsCount > 0
          ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400'
          : 'text-muted-foreground bg-muted',
    },
    {
      label: 'Review Backlog',
      value: reviewBacklogCount,
      unit: 'drawings',
      note: 'Pending RE or AM determination',
      icon: Inbox,
      valueClass: reviewBacklogCount > 0 ? 'text-[#02a9d3]' : 'text-foreground',
      color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400',
    },
  ];

  return (
    <section aria-label="Executive KPI Summary" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Executive Portfolio Performance
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Real-time strategic overview
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 text-left shadow-xs transition hover:border-(--site-cyan)/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </span>
                  <div className={cn('rounded-md p-1.5', card.color)}>
                    <Icon className="size-4" aria-hidden />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      'font-mono text-2xl font-bold tabular-nums',
                      card.valueClass || 'text-foreground',
                    )}
                  >
                    {card.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {card.unit}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {card.note}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
