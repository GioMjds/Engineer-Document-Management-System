import type { ReactNode } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const RADIUS = 'var(--radius-md)';

function Bar({
  w = '100%',
  h = 12,
  circle = false,
}: {
  w?: number | string;
  h?: number;
  circle?: boolean;
}) {
  return (
    <Skeleton
      width={circle ? h : w}
      height={h}
      circle={circle}
      borderRadius={circle ? undefined : RADIUS}
      containerClassName="block leading-none"
    />
  );
}

function Panel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({ withBadge = false }: { withBadge?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Bar w={160} h={16} />
          {withBadge && <Bar w={96} h={18} />}
        </div>
        <Bar w={280} h={10} />
      </div>
      <Bar w={72} h={10} />
    </div>
  );
}

function KpiCard() {
  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Bar w={110} h={10} />
        <Bar h={16} circle />
      </div>
      <div className="flex items-end gap-2">
        <Bar w={44} h={28} />
        <Bar w={64} h={10} />
      </div>
      <Bar w="55%" h={10} />
    </Panel>
  );
}

function StatTile() {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <Bar w={140} h={10} />
        <Bar h={24} circle />
      </div>
      <Bar w={130} h={26} />
      <Bar w="70%" h={10} />
    </div>
  );
}

function ListRow({ icon = true }: { icon?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {icon && <Bar h={32} circle />}
      <div className="flex flex-1 flex-col gap-2">
        <Bar w="45%" h={12} />
        <Bar w="30%" h={10} />
      </div>
      <Bar w={64} h={22} />
    </div>
  );
}

function PipelineRow() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Bar w={96} h={10} />
        <Bar w={20} h={10} />
      </div>
      <Bar h={8} />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="py-2">
      <span className="sr-only">Loading dashboard…</span>

      <SkeletonTheme baseColor="var(--muted)" highlightColor="var(--secondary)">
        <div aria-hidden="true" className="flex flex-col gap-6">
          {/* Page header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Bar w={220} h={24} />
              <Bar w={360} h={12} />
            </div>
            <div className="flex items-center gap-3">
              <Bar w={256} h={36} />
              <Bar w={128} h={36} />
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <KpiCard key={i} />
            ))}
          </div>

          {/* Executive financial portfolio */}
          <Panel>
            <PanelHeader withBadge />
            <div className="flex flex-col gap-5 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <StatTile key={i} />
                ))}
              </div>

              <div className="overflow-hidden rounded-md border border-border">
                <div className="hidden grid-cols-5 gap-4 border-b border-border px-4 py-3 md:grid">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Bar key={i} w="60%" h={10} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4 px-4 py-3 md:grid-cols-5">
                  <Bar w="80%" h={12} />
                  <span className="hidden md:block" />
                  <Bar w="60%" h={12} />
                  <Bar w="60%" h={12} />
                  <Bar w="50%" h={12} />
                </div>
              </div>
            </div>
          </Panel>

          {/* Action queue + lifecycle pipeline */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              <PanelHeader />
              <div className="divide-y divide-border">
                {Array.from({ length: 3 }, (_, i) => (
                  <ListRow key={i} />
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="flex flex-col gap-2 border-b border-border px-5 py-4">
                <Bar w={140} h={16} />
                <Bar w={190} h={10} />
              </div>
              <div className="flex flex-col gap-5 p-5">
                {Array.from({ length: 4 }, (_, i) => (
                  <PipelineRow key={i} />
                ))}
              </div>
            </Panel>
          </div>

          {/* Project portfolio */}
          <Panel>
            <PanelHeader />
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }, (_, i) => (
                <ListRow key={i} icon={false} />
              ))}
            </div>
          </Panel>
        </div>
      </SkeletonTheme>
    </div>
  );
}
