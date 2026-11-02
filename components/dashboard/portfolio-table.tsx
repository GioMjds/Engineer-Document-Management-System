'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssignedProject, ProjectDisciplineStatus } from '@/types/noc';
import { StatusChip, toneForStatus } from './status-chip';
import type { ProjectNocStats } from './use-dashboard-data';

interface PortfolioTableProps {
  projects: AssignedProject[];
  statusFor: (code: string) => ProjectDisciplineStatus;
  nocStats: Record<string, ProjectNocStats>;
  /** Expanded content; the parent supplies the existing ProjectDisciplineCard. */
  renderDetail: (project: AssignedProject) => ReactNode;
}

function ExpiryCell({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground">—</span>;
  if (days < 0)
    return <StatusChip tone="danger">Lapsed {Math.abs(days)}d</StatusChip>;
  if (days <= 14) return <StatusChip tone="warning">{days}d</StatusChip>;
  return <span className="font-mono tabular-nums">{days}d</span>;
}

export function PortfolioTable({
  projects,
  statusFor,
  nocStats,
  renderDetail,
}: PortfolioTableProps) {
  const baseId = useId();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(code)) next.add(code);
      return next;
    });

  return (
    <section
      aria-labelledby="portfolio-heading"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 id="portfolio-heading" className="text-sm font-semibold">
            Project portfolio
          </h2>
          <p className="text-xs text-muted-foreground">
            Discipline health, authority review stages, and specialist study clearance overview. Submissions and approvals are managed in the project NOC Tracker.
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </span>
      </div>

      {projects.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">
          No projects in this scope.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-240 text-left text-sm">
            <caption className="sr-only">
              Projects with discipline status, NOC clearance and next expiry
            </caption>
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="w-12 px-2 py-2.5">
                  <span className="sr-only">Expand</span>
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Project
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Stage
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Architecture
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Structure
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  MEP
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  NOC clearance
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Next expiry
                </th>
              </tr>
            </thead>
            {projects.map((p) => {
              const open = expanded.has(p.code);
              const detailId = `${baseId}-${p.code}`;
              const s = statusFor(p.code);
              const stats = nocStats[p.code];
              const pct =
                stats && stats.total
                  ? Math.round((stats.approved / stats.total) * 100)
                  : 0;

              return (
                <tbody
                  key={p.code}
                  className="border-b border-border last:border-b-0"
                >
                  <tr className="align-middle hover:bg-muted/40">
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={detailId}
                        aria-label={`${open ? 'Collapse' : 'Expand'} project ${p.code}`}
                        onClick={() => toggle(p.code)}
                        className="flex size-11 cursor-pointer items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <ChevronRight
                          className={cn(
                            'size-4 transition-transform motion-reduce:transition-none',
                            open && 'rotate-90',
                          )}
                          aria-hidden
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-mono text-sm font-bold tabular-nums text-accent-foreground">
                        #{p.code}
                      </p>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.masterAuthority} · {p.contractType} · {p.location}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.lifecycleStage || 'Pre-Construction'}
                    </td>
                    {(['architecture', 'structure', 'mep'] as const).map(
                      (d) => (
                        <td key={d} className="px-3 py-2">
                          <StatusChip tone={toneForStatus(s[d].status)}>
                            {s[d].status}
                          </StatusChip>
                        </td>
                      ),
                    )}
                    <td className="px-3 py-2">
                      {stats && stats.total ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 w-16 rounded-full bg-muted"
                            aria-hidden
                          >
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs tabular-nums">
                            {stats.approved}/{stats.total}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <ExpiryCell days={stats?.nextExpiryDays ?? null} />
                    </td>
                  </tr>
                  {open && (
                    <tr id={detailId}>
                      <td colSpan={8} className="bg-muted/30 p-4">
                        {renderDetail(p)}
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </section>
  );
}
