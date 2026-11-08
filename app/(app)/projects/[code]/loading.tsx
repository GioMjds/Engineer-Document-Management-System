'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { cn } from '@/lib/utils';

// Thin wrapper so every bone reserves its space without baseline gaps (prevents CLS).
function Bone({
  w = '100%',
  h,
  r = 4,
  className,
}: {
  w?: number | string;
  h: number;
  r?: number;
  className?: string;
}) {
  return (
    <Skeleton
      width={w}
      height={h}
      borderRadius={r}
      containerClassName={cn('block leading-none shrink-0', className)}
    />
  );
}

function StatTileSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <Bone w={70} h={11} />
      <div className="mt-1.5">
        <Bone w={32} h={22} />
      </div>
    </div>
  );
}

function DocumentRowSkeleton() {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Bone w={36} h={36} r={8} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Bone w={96} h={12} />
          <Bone w={36} h={16} r={999} />
        </div>
        <Bone w="55%" h={14} />
        <Bone w="35%" h={10} />
      </div>
      <Bone w={72} h={22} r={999} />
      <Bone w={28} h={28} r={6} className="hidden sm:block" />
    </li>
  );
}

export default function ProjectDocumentsLoading() {
  return (
    <SkeletonTheme
      baseColor="var(--muted)"
      highlightColor="color-mix(in oklab, var(--muted), var(--foreground) 10%)"
      duration={1.4}
    >
      <div className="space-y-4 py-2" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading project documents...</span>

        <div className="space-y-4" aria-hidden="true">
          {/* Back link */}
          <Bone w={128} h={32} r={6} />

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {/* Project header */}
            <div className="border-b border-border px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bone w={64} h={22} />
                    <Bone w={220} h={24} />
                    <Bone w={84} h={20} r={999} />
                  </div>
                  <Bone w={280} h={12} />
                </div>
                <Bone w={96} h={28} r={6} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <StatTileSkeleton key={i} />
                ))}
              </div>
            </div>

            {/* Search and filters */}
            <div className="space-y-3 border-b border-border bg-card/50 px-6 py-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <Bone w="100%" h={32} r={6} className="sm:max-w-sm" />
                <Bone w={140} h={32} r={6} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Bone key={i} w={64 + (i % 3) * 12} h={24} r={999} />
                ))}
              </div>
            </div>

            {/* Document list */}
            <ul className="space-y-2 px-6 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <DocumentRowSkeleton key={i} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}
