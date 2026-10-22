import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { ArrowDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Standard radius matching project theme token.
const RADIUS = 'calc(var(--radius) * 0.8)';

// Row dimension variations for realistic data representation and CLS prevention.
const TABLE_ROW_PRESETS = [
  { authWidth: 84, descWidth: '82%' },
  { authWidth: 64, descWidth: '68%' },
  { authWidth: 92, descWidth: '76%' },
  { authWidth: 70, descWidth: '88%' },
  { authWidth: 80, descWidth: '60%' },
];

function Bone({
  w = '100%',
  h = 12,
  r = RADIUS,
  circle = false,
  className,
}: {
  w?: number | string;
  h?: number;
  r?: number | string;
  circle?: boolean;
  className?: string;
}) {
  return (
    <Skeleton
      width={circle ? h : w}
      height={h}
      circle={circle}
      borderRadius={circle ? undefined : r}
      containerClassName={cn('block shrink-0 leading-none', className)}
    />
  );
}

export default function NocProjectLoading() {
  return (
    <div className="py-2" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading project NOC tracker…</span>

      <SkeletonTheme
        baseColor="var(--muted)"
        highlightColor="var(--secondary)"
        duration={1.5}
      >
        <div className="space-y-4" aria-hidden="true">
          {/* Project Summary Header */}
          <section
            aria-label="Loading project summary"
            className="rounded-lg border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
              <Bone w={54} h={24} r={4} className="mt-1" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Bone w="45%" h={26} r={4} className="max-w-xs sm:max-w-md" />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Bone w={14} h={14} r={3} />
                    <Bone w={175} h={14} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bone w={14} h={14} r={3} />
                    <Bone w={80} h={14} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bone w={14} h={14} r={3} />
                    <Bone w={210} h={14} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 text-xs sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="min-w-0 space-y-1">
                  <Bone w={75} h={12} />
                  <Bone w="85%" h={14} />
                </div>
              ))}
            </div>
          </section>

          {/* Project Lifecycle Stepper */}
          <div
            aria-label="Loading project lifecycle stages"
            className="w-full rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex flex-col items-stretch gap-2.5 md:flex-row w-full">
              {/* Active Stage (Stage 1: Pre-Construction) */}
              <div className="flex-1 flex flex-col">
                <div className="flex h-full min-h-26 flex-col justify-between rounded border-2 border-zinc-900 bg-white p-3 shadow-xs dark:border-zinc-100 dark:bg-zinc-950">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Bone w={80} h={22} r={4} />
                      <Bone w={105} h={20} r={999} />
                    </div>
                    <Bone w={135} h={18} r={4} className="mt-1" />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Bone w={125} h={14} />
                    <Bone w={14} h={14} r={2} />
                  </div>
                </div>
              </div>

              {/* Stage Divider 1 -> 2 */}
              <div
                aria-hidden="true"
                className="hidden md:flex items-center justify-center text-zinc-400 dark:text-zinc-600 shrink-0 px-0.5"
              >
                <ChevronRight className="h-4 w-4" />
              </div>
              <div
                aria-hidden="true"
                className="flex md:hidden items-center justify-center py-0.5 text-zinc-400 dark:text-zinc-600"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </div>

              {/* Upcoming Stage (Stage 2: Construction) */}
              <div className="flex-1 flex flex-col">
                <div className="flex h-full min-h-26 flex-col justify-between rounded border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Bone w={24} h={20} r={4} />
                      <Bone w={54} h={14} />
                    </div>
                    <Bone w={95} h={18} r={4} className="mt-1" />
                  </div>
                  <div className="mt-4">
                    <Bone w={105} h={14} />
                  </div>
                </div>
              </div>

              {/* Stage Divider 2 -> 3 */}
              <div
                aria-hidden="true"
                className="hidden md:flex items-center justify-center text-zinc-400 dark:text-zinc-600 shrink-0 px-0.5"
              >
                <ChevronRight className="h-4 w-4" />
              </div>
              <div
                aria-hidden="true"
                className="flex md:hidden items-center justify-center py-0.5 text-zinc-400 dark:text-zinc-600"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </div>

              {/* Upcoming Stage (Stage 3: Handover) */}
              <div className="flex-1 flex flex-col">
                <div className="flex h-full min-h-26 flex-col justify-between rounded border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Bone w={24} h={20} r={4} />
                      <Bone w={54} h={14} />
                    </div>
                    <Bone w={80} h={18} r={4} className="mt-1" />
                  </div>
                  <div className="mt-4">
                    <Bone w={95} h={14} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div className="flex flex-col items-stretch justify-between gap-3 pt-1 md:flex-row md:items-center">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
              <Bone w={104} h={36} r={4} />
              <Bone w={142} h={36} r={4} />
              <Bone w={130} h={36} r={4} />
              <Bone w={122} h={36} r={4} />
              <Bone w={92} h={36} r={4} />
            </div>

            <div className="flex items-center gap-2">
              <Bone w="100%" h={36} r={6} className="md:w-64" />
              <Bone w={176} h={36} r={6} />
            </div>
          </div>

          {/* Data Table Skeleton */}
          <div className="overflow-x-auto rounded border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/50">
                <tr className="hover:bg-transparent text-left">
                  <th className="w-14 px-3 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Seq #</th>
                  <th className="w-32 px-3 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Authority</th>
                  <th className="min-w-55 px-3 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Description</th>
                  <th className="w-28 px-3 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Submitted by</th>
                  <th className="w-36 px-3 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Authority Ref #</th>
                  <th className="w-36 px-3 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Status</th>
                  <th className="w-24 px-3 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Plan date</th>
                  <th className="w-28 px-3 py-3 font-semibold text-zinc-700 dark:text-zinc-300">Expiry date</th>
                  <th className="w-28 px-3 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Fee (AED)</th>
                  <th className="w-10 px-3 py-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {TABLE_ROW_PRESETS.map((row, i) => (
                  <tr key={i} className="hover:bg-transparent">
                    <td className="w-14 px-3 py-3.5"><Bone w={24} h={14} /></td>
                    <td className="w-32 px-3 py-3.5"><Bone w={row.authWidth} h={20} r={4} /></td>
                    <td className="min-w-55 px-3 py-3.5">
                      <div className="space-y-1">
                        <Bone w={row.descWidth} h={14} />
                        <Bone w="45%" h={11} />
                      </div>
                    </td>
                    <td className="w-28 px-3 py-3.5"><Bone w={75} h={14} /></td>
                    <td className="w-36 px-3 py-3.5"><Bone w={105} h={14} /></td>
                    <td className="w-36 px-3 py-3.5"><Bone w={90} h={22} r={999} /></td>
                    <td className="w-24 px-3 py-3.5"><Bone w={68} h={14} /></td>
                    <td className="w-28 px-3 py-3.5"><Bone w={68} h={14} /></td>
                    <td className="w-28 px-3 py-3.5 text-right"><div className="flex justify-end"><Bone w={55} h={14} /></div></td>
                    <td className="w-10 px-3 py-3.5 text-right"><div className="flex justify-end"><Bone w={14} h={14} r={3} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SkeletonTheme>
    </div>
  );
}
