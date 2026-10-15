'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type QueueFilter = 'all' | 'delayed' | 'expiring';

interface AttentionTilesProps {
  totalProjects: number;
  delayedCount: number;
  avgDelayDays: number;
  avgPlanDelayDays: number;
  expiringCount: number;
  approvedNocCount: number;
  totalNocCount: number;
  clearanceRate: number;
  stageDistribution: Record<string, number>;
  activeFilter: QueueFilter;
  onSelectFilter: (filter: QueueFilter) => void;
}

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  unit: string;
  note: string;
  valueClass?: string;
  activeClass?: string;
  active?: boolean;
  onClick?: () => void;
}

function Tile({
  icon: Icon,
  label,
  value,
  unit,
  note,
  valueClass,
  activeClass,
  active,
  onClick,
}: TileProps) {
  const body = (
    <>
      <span className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="mt-1">
        <span className={cn('text-2xl font-bold tabular-nums', valueClass)}>
          {value}
        </span>
        <span className="ml-1.5 text-xs text-muted-foreground">{unit}</span>
      </span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </>
  );
  const base = 'flex flex-col gap-0.5 rounded-lg border p-4 text-left';

  if (!onClick) {
    return <div className={cn(base, 'border-border bg-card')}>{body}</div>;
  }
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        base,
        'cursor-pointer outline-none transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        active ? activeClass : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      {body}
    </button>
  );
}

export function AttentionTiles(p: AttentionTilesProps) {
  const stageNote =
    Object.entries(p.stageDistribution)
      .filter(([, n]) => n > 0)
      .map(([stage, n]) => `${n} ${stage}`)
      .join(' · ') || 'No projects in scope';

  return (
    <section
      aria-label="Key indicators"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <Tile
        icon={Building2}
        label="Active projects"
        value={p.totalProjects}
        unit="in scope"
        note={stageNote}
        active={p.activeFilter === 'all'}
        activeClass="border-primary bg-accent"
        onClick={() => p.onSelectFilter('all')}
      />
      <Tile
        icon={AlertTriangle}
        label="Pending delays"
        value={p.delayedCount}
        unit="submittals"
        note={`Avg ${p.avgDelayDays}d under review${p.avgPlanDelayDays > 0 ? ` · ${p.avgPlanDelayDays}d past plan` : ''}`}
        valueClass="text-destructive"
        active={p.activeFilter === 'delayed'}
        activeClass="border-destructive bg-destructive/10"
        onClick={() => p.onSelectFilter('delayed')}
      />
      <Tile
        icon={Clock}
        label="14-day expiries"
        value={p.expiringCount}
        unit="NOCs"
        note="Renew before they lapse"
        valueClass="text-warning"
        active={p.activeFilter === 'expiring'}
        activeClass="border-warning bg-warning-subtle"
        onClick={() => p.onSelectFilter('expiring')}
      />
      <Tile
        icon={CheckCircle2}
        label="Authority clearance"
        value={`${p.approvedNocCount} of ${p.totalNocCount}`}
        unit="NOCs approved"
        note={`${p.clearanceRate}% clearance`}
        valueClass="text-success"
      />
    </section>
  );
}
