import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

const CARD_COUNT = 6;

export default function NocTrackerLoading() {
  return (
    <SkeletonTheme
      baseColor="var(--skeleton-base)"
      highlightColor="var(--skeleton-highlight)"
      borderRadius="0.375rem"
    >
      <div className="py-2" role="status" aria-busy="true">
        <span className="sr-only">Loading projects…</span>

        <div className="space-y-5" aria-hidden>
          {/* Header: title + description (+ room for the admin "New project" button) */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <Skeleton width={144} height={32} />
              <Skeleton
                height={20}
                containerClassName="block w-full max-w-md sm:w-[28rem]"
              />
            </div>
          </header>

          {/* Attention chips across projects */}
          <section className="flex flex-wrap items-center gap-2">
            <Skeleton width={104} height={16} />
            <Skeleton width={88} height={26} />
            <Skeleton width={96} height={26} />
            <Skeleton width={80} height={26} />
          </section>

          {/* Toolbar: search, stage filter, count */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 sm:max-w-sm">
              <Skeleton height={40} containerClassName="block" />
            </div>
            <div className="w-full sm:w-48">
              <Skeleton height={40} containerClassName="block" />
            </div>
            <div className="sm:ml-auto">
              <Skeleton width={88} height={16} />
            </div>
          </div>

          {/* Project cards */}
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: CARD_COUNT }, (_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </ul>
        </div>
      </div>
    </SkeletonTheme>
  );
}

function ProjectCardSkeleton() {
  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs">
      {/* Code badge + lifecycle stage pill */}
      <div className="flex items-center justify-between gap-2">
        <Skeleton width={64} height={24} />
        <Skeleton width={96} height={24} borderRadius={9999} />
      </div>

      {/* Name + authority + location */}
      <div className="space-y-2">
        <Skeleton height={22} width="85%" />
        <div className="flex items-center gap-1.5">
          <Skeleton width={14} height={14} circle />
          <Skeleton width={150} height={14} />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton width={14} height={14} circle />
          <Skeleton width={120} height={14} />
        </div>
      </div>

      {/* NOC progress */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Skeleton width={84} height={14} />
          <Skeleton width={32} height={14} />
        </div>
        <Skeleton height={6} borderRadius={9999} containerClassName="block" />
      </div>

      {/* Attention chips + arrow */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex gap-1.5">
          <Skeleton width={84} height={24} />
          <Skeleton width={72} height={24} />
        </div>
        <Skeleton width={16} height={16} circle />
      </div>
    </li>
  );
}
