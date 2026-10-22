import type { ReactNode } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

const RADIUS = 'calc(var(--radius) * 0.8)';

const COLS = 'grid-cols-[3.5rem_1.6fr_1.2fr_5rem_5rem_4.5rem]';

const ROWS = [
  { name: '72%', zone: '65%' },
  { name: '85%', zone: '50%' },
  { name: '60%', zone: '75%' },
  { name: '78%', zone: '55%' },
  { name: '66%', zone: '70%' },
];

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
    <div
      className={`overflow-hidden rounded-lg border border-border bg-card shadow-xs ${className}`}
    >
      {children}
    </div>
  );
}

function KpiCard() {
  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Bar w={130} h={10} />
        <Bar h={16} circle />
      </div>
      <Bar w={44} h={28} />
      <Bar w="65%" h={10} />
    </Panel>
  );
}

function TableRow({ name, zone }: { name: string; zone: string }) {
  return (
    <div className={`grid ${COLS} items-center gap-4 px-4 py-2.5`}>
      <Bar w="70%" h={12} />
      <div className="flex items-center gap-2">
        <Bar h={14} circle />
        <div className="flex-1">
          <Bar w={name} h={14} />
        </div>
      </div>
      <Bar w={zone} h={12} />
      <div className="flex justify-center">
        <Bar w={28} h={20} />
      </div>
      <div className="flex justify-center">
        <Bar w={28} h={20} />
      </div>
      <div className="flex items-center justify-end gap-1">
        <Bar w={28} h={28} />
        <Bar w={28} h={28} />
      </div>
    </div>
  );
}

export default function AuthoritiesLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading master authorities…</span>

      <SkeletonTheme
        baseColor="var(--muted)"
        highlightColor="var(--secondary)"
        duration={1.6}
      >
        <div aria-hidden="true" className="flex flex-col gap-6">
          {/* Page header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Bar h={20} circle />
                <Bar w={180} h={22} />
              </div>
              <Bar w={340} h={12} />
            </div>
            <Bar w={148} h={32} />
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <KpiCard key={i} />
            ))}
          </div>

          {/* Search + record count */}
          <div className="flex items-center justify-between gap-3">
            <div className="w-full max-w-sm flex-1">
              <Bar h={32} />
            </div>
            <Bar w={96} h={12} />
          </div>

          {/* Directory table */}
          <Panel>
            <div
              className={`hidden ${COLS} items-center gap-4 border-b border-border px-4 py-3 md:grid`}
            >
              <Bar w="50%" h={10} />
              <Bar w={110} h={10} />
              <Bar w={140} h={10} />
              <Bar w="70%" h={10} />
              <Bar w="80%" h={10} />
              <Bar w="70%" h={10} />
            </div>
            <div className="divide-y divide-border overflow-x-auto">
              {ROWS.map((row, i) => (
                <TableRow key={i} {...row} />
              ))}
            </div>
          </Panel>
        </div>
      </SkeletonTheme>
    </div>
  );
}
