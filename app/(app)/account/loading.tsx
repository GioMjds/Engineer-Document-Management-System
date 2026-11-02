import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { cn } from '@/lib/utils';

// Standard radius matching project theme token.
const RADIUS = 'calc(var(--radius) * 0.8)';

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

export default function AccountLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading account settings and profile...</span>

      <SkeletonTheme
        baseColor="var(--skeleton-base)"
        highlightColor="var(--skeleton-highlight)"
        duration={1.5}
      >
        <div className="space-y-6" aria-hidden="true">
          {/* Header */}
          <div className="flex flex-col gap-1 border-b border-border pb-4">
            <Bone w={220} h={24} />
            <Bone w={360} h={14} className="mt-1" />
          </div>

          {/* Profile Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Identity Summary Card */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-4">
                <Bone h={56} circle />
                <div className="space-y-2 flex-1">
                  <Bone w="75%" h={16} />
                  <Bone w="50%" h={12} />
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex justify-between items-center">
                  <Bone w={70} h={12} />
                  <Bone w={90} h={20} r={4} />
                </div>
                <div className="flex justify-between items-center">
                  <Bone w={80} h={12} />
                  <Bone w={110} h={12} />
                </div>
                <div className="flex justify-between items-center">
                  <Bone w={75} h={12} />
                  <Bone w={65} h={20} r={4} />
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Panels */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Details Panel */}
              <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-5">
                <div className="border-b border-border pb-3 space-y-1">
                  <Bone w={140} h={16} />
                  <Bone w={240} h={12} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Bone w={80} h={12} />
                    <Bone h={36} r={6} />
                  </div>
                  <div className="space-y-1.5">
                    <Bone w={90} h={12} />
                    <Bone h={36} r={6} />
                  </div>
                  <div className="space-y-1.5">
                    <Bone w={120} h={12} />
                    <Bone h={36} r={6} />
                  </div>
                  <div className="space-y-1.5">
                    <Bone w={100} h={12} />
                    <Bone h={36} r={6} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Bone w={110} h={32} r={6} />
                </div>
              </div>

              {/* Security & Authentication Panel */}
              <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-5">
                <div className="border-b border-border pb-3 space-y-1">
                  <Bone w={160} h={16} />
                  <Bone w={260} h={12} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Bone w={110} h={12} />
                    <Bone h={36} r={6} />
                  </div>
                  <div className="space-y-1.5">
                    <Bone w={95} h={12} />
                    <Bone h={36} r={6} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Bone w={130} h={32} r={6} />
                </div>
              </div>

              {/* Assigned Projects & Scope */}
              <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
                <div className="border-b border-border pb-3 space-y-1">
                  <Bone w={180} h={16} />
                  <Bone w={280} h={12} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Bone h={44} r={6} />
                  <Bone h={44} r={6} />
                  <Bone h={44} r={6} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SkeletonTheme>
    </div>
  );
}
