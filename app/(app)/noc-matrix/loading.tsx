import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { cn } from '@/lib/utils';

// --radius-md lives under `@theme inline`, so it is not emitted as a CSS
// variable. Derive from --radius (declared on :root) instead.
const RADIUS = 'calc(var(--radius) * 0.8)';

// Thin wrapper so every bar reserves its space without baseline gaps (prevents CLS).
function Bar({
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

// Mirrors NocMatrixSidebar list tile.
function SidebarTileSkeleton({ descWidth }: { descWidth: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-transparent p-2">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <Bar w={22} h={14} className="mt-0.5" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Bar w={52} h={18} />
            <Bar w={descWidth} h={14} className="min-w-0 flex-1" />
          </div>
          <Bar w={110} h={10} />
        </div>
      </div>
      <Bar w={12} h={12} r={3} className="mt-0.5" />
    </div>
  );
}

function StageGroupSkeleton({ rows }: { rows: string[] }) {
  return (
    <section className="py-1">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Bar w={14} h={14} />
          <Bar w={112} h={12} />
        </div>
        <Bar w={22} h={16} r={999} />
      </div>
      <div className="space-y-1 px-2 pb-1 pt-0.5">
        {rows.map((w, i) => (
          <SidebarTileSkeleton key={i} descWidth={w} />
        ))}
      </div>
    </section>
  );
}

// Mirrors NocMatrixInspector header + prerequisite strip + tabs + checklist.
function InspectorSkeleton() {
  return (
    <div className="flex h-full flex-col divide-y divide-border">
      <header className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Bar w={36} h={22} />
            <Bar w={64} h={22} r={999} />
            <Bar w={112} h={22} r={999} />
            <Bar w={80} h={22} r={999} />
          </div>
          <Bar w={118} h={32} />
        </div>

        <div className="space-y-1.5">
          <Bar w="70%" h={20} />
          <Bar w="42%" h={20} />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-md border border-border p-2.5"
            >
              <Bar w={16} h={16} />
              <div className="flex-1 space-y-1.5">
                <Bar w={96} h={10} />
                <Bar w={72} h={14} />
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Prerequisite connector strip */}
      <div className="p-5">
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-3">
            <Bar w={28} h={28} />
            <div className="flex-1 space-y-1.5">
              <Bar w={140} h={12} />
              <Bar w="55%" h={12} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + checklist */}
      <div>
        <div className="flex gap-4 border-b border-border px-5 py-3">
          <Bar w={96} h={16} />
          <Bar w={108} h={16} />
          <Bar w={84} h={16} />
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <Bar w={168} h={12} />
            <Bar w={56} h={12} />
          </div>
          <ul className="space-y-2.5">
            {['88%', '72%', '94%', '64%', '80%'].map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-md border border-border p-3"
              >
                <Bar h={16} circle className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Bar w={w} h={13} />
                  <Bar w="40%" h={11} />
                </div>
                <Bar w={72} h={20} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function NocMatrixLoading() {
  return (
    <div className="py-2" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading NOC matrix blueprints…</span>

      <SkeletonTheme
        baseColor="var(--muted)"
        highlightColor="var(--secondary)"
        duration={1.6}
      >
        <div className="space-y-4" aria-hidden="true">
          {/* Header: every piece is a bar, no real copy */}
          <header className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bar w={28} h={28} />
                <Bar w={280} h={22} />
              </div>
              <Bar w={420} h={12} className="max-w-full" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Bar w={220} h={32} />
              <Bar w={124} h={32} />
              <Bar w={152} h={32} />
            </div>
          </header>

          {/* Dual-pane workbench: same grid, heights, and breakpoints as the workspace */}
          <section
            aria-label="Loading statutory blueprint workbench"
            className="grid h-auto grid-cols-1 gap-0 overflow-hidden rounded-lg border border-border bg-card lg:h-[calc(100vh-11rem)] lg:min-h-140 lg:grid-cols-12"
          >
            {/* Left rail */}
            <div className="h-105 overflow-hidden border-b sm:h-115 lg:col-span-5 lg:h-full lg:border-b-0 xl:col-span-4">
              <div className="flex h-full flex-col border-r border-border bg-card/40">
                <div className="shrink-0 space-y-2.5 border-b border-border bg-card p-3">
                  <Bar h={32} />
                  <div className="flex items-center gap-1.5 overflow-hidden pb-1">
                    <Bar w={56} h={20} />
                    <Bar w={64} h={20} />
                    <Bar w={52} h={20} />
                    <Bar w={48} h={20} />
                    <Bar w={56} h={20} />
                  </div>
                </div>

                <div className="flex-1 divide-y divide-border/60 overflow-hidden">
                  <StageGroupSkeleton rows={['78%', '64%', '86%']} />
                  <StageGroupSkeleton rows={['70%', '82%']} />
                  <StageGroupSkeleton rows={['60%', '74%']} />
                </div>
              </div>
            </div>

            {/* Right inspector */}
            <div className="min-h-125 overflow-hidden bg-card lg:col-span-7 lg:h-full lg:min-h-0 xl:col-span-8">
              <InspectorSkeleton />
            </div>
          </section>
        </div>
      </SkeletonTheme>
    </div>
  );
}
