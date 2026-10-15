'use client';

import React from 'react';
import { Check, ChevronRight, ClipboardCheck, ArrowDown } from 'lucide-react';
import type {
  ProjectLifecycleStage,
  StageGateReadiness,
  StageMilestoneDates,
} from '@/types/noc';
import { cn } from '@/lib/utils';
import { formatMilestoneDate, getStageMilestoneDate } from '@/utils/formatters';

export interface ProjectLifecycleStepperProps {
  currentStage: ProjectLifecycleStage;
  readiness: StageGateReadiness;
  milestones?: StageMilestoneDates;
  onOpenGateDetails?: () => void;
  className?: string;
}

const LIFECYCLE_STAGES = [
  'Pre-Construction',
  'Construction',
  'Handover',
] satisfies ProjectLifecycleStage[];

export function ProjectLifecycleStepper({
  currentStage,
  readiness,
  milestones,
  onOpenGateDetails,
  className,
}: ProjectLifecycleStepperProps) {
  const currentIndex = Math.max(0, LIFECYCLE_STAGES.indexOf(currentStage));

  return (
    <nav
      aria-label="Project Lifecycle Progress"
      className={cn(
        'w-full rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950',
        className,
      )}
    >
      <ol className="flex flex-col md:flex-row items-stretch gap-2.5 w-full">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isUpcoming = index > currentIndex;
          const rawMilestoneDate = getStageMilestoneDate(stage, milestones);
          const formattedDate = formatMilestoneDate(rawMilestoneDate);

          return (
            <React.Fragment key={stage}>
              <li className="flex-1 flex flex-col">
                {isCompleted && (
                  <div
                    aria-current={false}
                    className="flex h-full flex-col justify-between rounded border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900"
                          title="Completed Stage"
                        >
                          <Check
                            className="h-3 w-3 stroke-[2.5]"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          Completed
                        </span>
                      </div>
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block">
                        {stage}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      Stage 0{index + 1}
                    </div>
                  </div>
                )}

                {isActive && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={onOpenGateDetails}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenGateDetails?.();
                      }
                    }}
                    aria-current="step"
                    aria-label={`Current stage: ${stage}. ${readiness.satisfiedPrerequisites} of ${readiness.totalPrerequisites} gate prerequisites met (${readiness.readinessPercentage}%). Click to inspect checklist.`}
                    className="flex h-full flex-col justify-between rounded border-2 border-zinc-900 bg-white p-3 shadow-xs transition-colors hover:bg-zinc-50/80 cursor-pointer dark:border-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Active Stage
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border',
                            readiness.isGateReady
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              readiness.isGateReady
                                ? 'bg-emerald-600 dark:bg-emerald-400'
                                : 'bg-amber-600 dark:bg-amber-400',
                            )}
                          />
                          {readiness.satisfiedPrerequisites}/
                          {readiness.totalPrerequisites} Gate Met (
                          {readiness.readinessPercentage}%)
                        </span>
                      </div>
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 block">
                        {stage}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenGateDetails?.();
                        }}
                        className="inline-flex w-full items-center justify-between text-xs font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300 group cursor-pointer"
                        aria-label="Inspect Gate Checklist"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <ClipboardCheck className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                          <span>Inspect Gate Checklist</span>
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                )}

                {isUpcoming && (
                  <div
                    aria-current={false}
                    className="flex h-full flex-col justify-between rounded border border-dashed border-zinc-300 bg-zinc-50/30 p-3 opacity-80 dark:border-zinc-700 dark:bg-zinc-900/20"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                          0{index + 1}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                          Upcoming
                        </span>
                      </div>
                      <span className="font-semibold text-sm text-zinc-600 dark:text-zinc-400 block">
                        {stage}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                      {formattedDate ? (
                        <span>Target: {formattedDate}</span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-600">
                          Pending schedule
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </li>

              {index < LIFECYCLE_STAGES.length - 1 && (
                <>
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
                </>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default ProjectLifecycleStepper;
