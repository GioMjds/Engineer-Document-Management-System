'use client';

import { Building2 } from 'lucide-react';
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

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <Bone w={90} h={12} />
        <Bone w={28} h={28} r={6} />
      </div>
      <div className="mt-3">
        <Bone w={48} h={24} />
      </div>
      <div className="mt-1">
        <Bone w={120} h={10} />
      </div>
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <li className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bone w={54} h={22} r={4} />
          <Bone w={100} h={22} r={999} />
        </div>
        <Bone w={80} h={20} r={999} />
      </div>

      <div className="mt-3.5 space-y-2">
        <Bone w="85%" h={20} />
        <div className="flex items-center gap-2">
          <Bone w={16} h={16} r={3} />
          <Bone w="60%" h={14} />
        </div>
        <div className="flex items-center gap-2">
          <Bone w={16} h={16} r={3} />
          <Bone w="45%" h={14} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-md border border-border/80 bg-muted/20 p-2.5">
        <div className="space-y-1">
          <Bone w={80} h={10} />
          <Bone w={95} h={14} />
        </div>
        <div className="space-y-1">
          <Bone w={80} h={10} />
          <Bone w={95} h={14} />
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3.5">
        <div className="flex items-center justify-between">
          <Bone w={120} h={12} />
          <Bone w={40} h={12} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="space-y-1 rounded border border-border/60 bg-muted/30 p-2"
            >
              <Bone w={50} h={10} />
              <Bone w="90%" h={12} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Bone w={100} h={32} r={6} />
          <Bone w={80} h={32} r={6} />
        </div>
        <Bone w={24} h={24} r={4} />
      </div>
    </li>
  );
}

export default function ProjectsLoading() {
  return (
    <SkeletonTheme
      baseColor="var(--muted)"
      highlightColor="color-mix(in oklab, var(--muted), var(--foreground) 10%)"
      duration={1.4}
    >
      <div className="py-2" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading projects directory...</span>

        <div className="space-y-6" aria-hidden="true">
          {/* Header */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-(--site-navy) text-(--site-cyan) dark:bg-[#0e1c30]">
                  <Building2 className="size-4" />
                </span>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Projects Directory
                </h1>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Multidisciplinary engineering projects portfolio, lifecycle stages, and team role assignments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Bone w={140} h={36} r={6} />
            </div>
          </header>

          {/* Stats Bar */}
          <section aria-label="Loading project metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </section>

          {/* Filters & Search */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <Bone w="100%" h={36} r={6} className="sm:max-w-xs" />
              <Bone w={160} h={36} r={6} />
              <Bone w={180} h={36} r={6} />
            </div>
            <div className="flex items-center gap-2">
              <Bone w={80} h={32} r={6} />
            </div>
          </div>

          {/* Project Cards Grid */}
          <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </ul>
        </div>
      </div>
    </SkeletonTheme>
  );
}
