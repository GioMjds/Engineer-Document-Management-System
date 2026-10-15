import Link from 'next/link';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { calculateDaysRemaining } from '@/lib/noc-tracker';
import { cn } from '@/lib/utils';
import type { ProjectNocItem, SubmittalDelayItem } from '@/types/noc';
import { StatusChip, type Tone } from './status-chip';
import type { QueueFilter } from './attention-tiles';

interface Row {
  id: string;
  kind: 'Delay' | 'Expiry';
  tone: Tone;
  label: string;
  rank: number;
  projectCode: string;
  authority: string;
  title: string;
  meta: string;
  action: string;
}

function buildRows(
  delayItems: SubmittalDelayItem[],
  expiringNocs: ProjectNocItem[],
  filter: QueueFilter,
): Row[] {
  const rows: Row[] = [];

  if (filter !== 'expiring') {
    for (const d of delayItems) {
      const unsubmitted = d.delayType === 'Unsubmitted Delay';
      const critical = d.daysDelayed >= 14;
      const pastPlan =
        typeof d.planDelayDays === 'number' ? d.planDelayDays : 0;
      rows.push({
        id: `delay-${d.nocId}`,
        kind: 'Delay',
        tone: critical ? 'danger' : 'warning',
        label: unsubmitted
          ? `+${d.daysDelayed}d past plan`
          : `${d.daysDelayed}d with authority`,
        rank: (critical ? 2000 : 1000) + d.daysDelayed,
        projectCode: d.projectCode,
        authority: d.reviewingAuthority,
        title: d.description,
        meta: unsubmitted
          ? `Plan ${d.planDate} · not yet applied`
          : `Applied ${d.applyDate}${pastPlan > 0 ? ` · +${pastPlan}d past plan` : ''}`,
        action: 'Resolve',
      });
    }
  }

  if (filter !== 'delayed') {
    for (const n of expiringNocs) {
      const left = calculateDaysRemaining(n.expiryDate) ?? 0;
      const lapsed = left < 0;
      const urgent = lapsed || left <= 7;
      rows.push({
        id: `expiry-${n.id}`,
        kind: 'Expiry',
        tone: urgent ? 'danger' : 'warning',
        label: lapsed ? `Lapsed ${Math.abs(left)}d ago` : `Expires in ${left}d`,
        rank: lapsed
          ? 3000 + Math.abs(left)
          : (urgent ? 2000 : 1000) + (14 - left),
        projectCode: n.projectCode,
        authority: n.reviewingAuthority,
        title: `NOC ${n.referenceNumber}`,
        meta: `Expires ${n.expiryDate}`,
        action: 'Renew NOC',
      });
    }
  }

  return rows.sort((a, b) => b.rank - a.rank);
}

const SUBTITLE: Record<QueueFilter, string> = {
  all: 'Delayed submittals and expiring permits, most urgent first.',
  delayed: 'Showing delayed submittals only, most urgent first.',
  expiring: 'Showing NOCs expiring within 14 days, most urgent first.',
};

interface ActionQueueProps {
  delayItems: SubmittalDelayItem[];
  expiringNocs: ProjectNocItem[];
  filter: QueueFilter;
}

export function ActionQueue({
  delayItems,
  expiringNocs,
  filter,
}: ActionQueueProps) {
  const rows = buildRows(delayItems, expiringNocs, filter);

  return (
    <section
      aria-labelledby="action-queue-heading"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 id="action-queue-heading" className="text-sm font-semibold">
            Action queue
          </h2>
          <p className="text-xs text-muted-foreground">{SUBTITLE[filter]}</p>
        </div>
        <span
          className="font-mono text-xs tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-1 p-10 text-center">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <p className="text-sm font-medium">Nothing needs action.</p>
          <p className="text-xs text-muted-foreground">
            No delayed submittals or NOCs expiring within 14 days in this scope.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <caption className="sr-only">
              Delayed submittals and expiring NOCs, most urgent first
            </caption>
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Urgency
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Type
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Project
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Authority
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold">
                  Item
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right font-semibold"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <StatusChip tone={r.tone}>{r.label}</StatusChip>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.kind}</td>
                  <td className="px-4 py-3 font-mono font-semibold tabular-nums">
                    #{r.projectCode}
                  </td>
                  <td className="px-4 py-3">{r.authority}</td>
                  <td className="min-w-52 px-4 py-3">
                    <p>{r.title}</p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                      {r.meta}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/noc-tracker?project=${r.projectCode}`}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'gap-1',
                      )}
                    >
                      {r.action}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
