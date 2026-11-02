'use client';

import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Lock,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  canUserAdvanceStage,
} from '@/lib/project-lifecycle';
import type {
  AssignedProject,
  StageGateReadiness,
  StageMilestoneDates,
  ProjectLifecycleStage,
  StageGatePrerequisiteItem,
  CustomStagePrerequisite,
} from '@/types/noc';

export interface StageGateDrawerProps {
  project: AssignedProject;
  readiness: StageGateReadiness;
  currentUserRole: string;
  isOpen: boolean;
  onClose: () => void;
  onAdvanceStage: (newStage: ProjectLifecycleStage) => void;
  onUpdateMilestones?: (milestones: StageMilestoneDates) => void;
}

// Format date string as DD Mon YYYY for display.
function formatMilestoneDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return dateStr;
}

// Format prerequisite category label.
function formatCategoryLabel(
  cat: StageGatePrerequisiteItem['category'],
): string {
  switch (cat) {
    case 'authority_noc':
      return 'Authority NOC';
    case 'specialist_study':
      return 'Specialist Study';
    case 'regulatory_milestone':
      return 'Regulatory Milestone';
    default:
      return cat;
  }
}

interface MilestoneFieldConfig {
  key: string;
  label: string;
  value?: string;
}

// Retrieve regulatory milestone fields for a specific stage.
function getMilestoneFieldsForStage(
  stage: ProjectLifecycleStage,
  milestones?: StageMilestoneDates,
): MilestoneFieldConfig[] {
  if (!milestones) return [];
  switch (stage) {
    case 'Pre-Construction':
      return [
        {
          key: 'kickoffDate',
          label: 'Kick-off Date',
          value: milestones.preConstruction?.kickoffDate,
        },
        {
          key: 'surveyCompletionDate',
          label: 'Topographical Survey',
          value: milestones.preConstruction?.surveyCompletionDate,
        },
        {
          key: 'conceptApprovalDate',
          label: 'Concept Approval',
          value: milestones.preConstruction?.conceptApprovalDate,
        },
        {
          key: 'commencementDate',
          label: 'Design Commencement',
          value: milestones.preConstruction?.commencementDate,
        },
        {
          key: 'plannedCompletionDate',
          label: 'Planned Completion',
          value: milestones.preConstruction?.plannedCompletionDate,
        },
        {
          key: 'buildingPermitDate',
          label: 'Building Permit Issuance',
          value: milestones.preConstruction?.buildingPermitDate,
        },
      ];
    case 'Construction':
      return [
        {
          key: 'commencementDate',
          label: 'Site Commencement',
          value: milestones.construction?.commencementDate,
        },
        {
          key: 'targetCompletionDate',
          label: 'Target Substantial Completion',
          value: milestones.construction?.targetCompletionDate,
        },
        {
          key: 'extensionOfTimeDate',
          label: 'Extension of Time (EOT)',
          value: milestones.construction?.extensionOfTimeDate,
        },
      ];
    case 'Handover':
      return [
        {
          key: 'commissioningDate',
          label: 'Testing & Commissioning',
          value: milestones.handover?.commissioningDate,
        },
        {
          key: 'civilDefenceInspectionDate',
          label: 'Civil Defence (DCD) Inspection',
          value: milestones.handover?.civilDefenceInspectionDate,
        },
        {
          key: 'bccIssuanceDate',
          label: 'Building Completion Cert (BCC)',
          value: milestones.handover?.bccIssuanceDate,
        },
      ];
    case 'Completed':
    default:
      return [];
  }
}

function StageGateDrawerContent({
  project,
  readiness,
  currentUserRole,
  isOpen,
  onClose,
  onAdvanceStage,
  onUpdateMilestones,
}: StageGateDrawerProps) {
  const [isEditingMilestones, setIsEditingMilestones] = useState(false);
  const [draftMilestones, setDraftMilestones] = useState<StageMilestoneDates>(
    project.milestones || {},
  );

  // Custom prerequisite creation state
  const [isAddingPrerequisite, setIsAddingPrerequisite] = useState(false);
  const [newPrereqTitle, setNewPrereqTitle] = useState('');
  const [newPrereqCategory, setNewPrereqCategory] =
    useState<StageGatePrerequisiteItem['category']>('regulatory_milestone');
  const [newPrereqHint, setNewPrereqHint] = useState('');
  const [newPrereqMandatory, setNewPrereqMandatory] = useState(true);

  // Handle Escape key to dismiss drawer.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isAuthorized = canUserAdvanceStage(currentUserRole);
  const isTerminal = (project.lifecycleStage as string) === 'Completed';

  // Advance stage with feedback.
  const handleAdvance = () => {
    if (isTerminal) {
      toast.info('Project has already reached the final lifecycle stage.');
      return;
    }
    const next = readiness.nextStage as ProjectLifecycleStage;
    onAdvanceStage(next);
    if (readiness.isGateReady) {
      if (next === 'Completed') {
        toast.success(`Project ${project.code} lifecycle completed.`);
      } else {
        toast.success(`Project ${project.code} advanced to ${next}.`);
      }
    } else {
      if (next === 'Completed') {
        toast.warning(`Project ${project.code} completed under managerial override.`);
      } else {
        toast.info(`Managerial override applied: Advanced to ${next}.`);
      }
    }
    onClose();
  };

  const handleAddCustomPrerequisite = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newPrereqTitle.trim();
    if (!title) return;

    const newItem: CustomStagePrerequisite = {
      id: 'custom-' + Date.now(),
      title,
      category: newPrereqCategory,
      stage: readiness.stage,
      isSatisfied: false,
      mandatoryForNextStage: newPrereqMandatory,
      actionHint: newPrereqHint.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedMilestones: StageMilestoneDates = {
      ...draftMilestones,
      customPrerequisites: [
        ...(draftMilestones.customPrerequisites || []),
        newItem,
      ],
    };

    setDraftMilestones(updatedMilestones);
    if (onUpdateMilestones) {
      onUpdateMilestones(updatedMilestones);
    }
    setIsAddingPrerequisite(false);
    setNewPrereqTitle('');
    setNewPrereqHint('');
    toast.success('Custom gate prerequisite added.');
  };

  const handleToggleCustomPrerequisite = (id: string) => {
    const customs = draftMilestones.customPrerequisites || [];
    const updatedCustoms = customs.map((cp) =>
      cp.id === id ? { ...cp, isSatisfied: !cp.isSatisfied } : cp,
    );
    const updated: StageMilestoneDates = {
      ...draftMilestones,
      customPrerequisites: updatedCustoms,
    };
    setDraftMilestones(updated);
    if (onUpdateMilestones) {
      onUpdateMilestones(updated);
    }
    const target = updatedCustoms.find((cp) => cp.id === id);
    if (target?.isSatisfied) {
      toast.success('Gate prerequisite marked Satisfied.');
    } else {
      toast.info('Gate prerequisite marked Pending Action.');
    }
  };

  const handleDeleteCustomPrerequisite = (id: string) => {
    const customs = draftMilestones.customPrerequisites || [];
    const updatedCustoms = customs.filter((cp) => cp.id !== id);
    const updated: StageMilestoneDates = {
      ...draftMilestones,
      customPrerequisites: updatedCustoms,
    };
    setDraftMilestones(updated);
    if (onUpdateMilestones) {
      onUpdateMilestones(updated);
    }
    toast.success('Custom gate prerequisite removed.');
  };

  // Update a single milestone date field in draft.
  const handleMilestoneFieldChange = (
    stageKey: 'preConstruction' | 'construction' | 'handover',
    field: string,
    value: string,
  ) => {
    setDraftMilestones((prev) => ({
      ...prev,
      [stageKey]: {
        ...(prev[stageKey] || {}),
        [field]: value || undefined,
      },
    }));
  };

  // Save updated milestones.
  const handleSaveMilestones = () => {
    if (onUpdateMilestones) {
      onUpdateMilestones(draftMilestones);
      toast.success('Project regulatory milestones updated.');
    }
    setIsEditingMilestones(false);
  };

  const activeMilestones = isEditingMilestones
    ? draftMilestones
    : project.milestones || {};

  const currentStageMilestones = getMilestoneFieldsForStage(
    readiness.stage,
    activeMilestones,
  );

  const nextStageMilestones =
    readiness.nextStage !== 'Completed'
      ? getMilestoneFieldsForStage(readiness.nextStage, activeMilestones)
      : [];

  const stageToKey = (
    stage: ProjectLifecycleStage,
  ): 'preConstruction' | 'construction' | 'handover' => {
    switch (stage) {
      case 'Pre-Construction':
        return 'preConstruction';
      case 'Construction':
        return 'construction';
      case 'Handover':
        return 'handover';
      case 'Completed':
      default:
        return 'handover';
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over drawer on right edge */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Stage Gate Readiness for Project ${project.code}`}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-105 bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="p-4 border-b border-border bg-muted/40 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Stage Gate Readiness · Project {project.code}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {project.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close stage gate drawer"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-muted-foreground">Transition:</span>
              <span className="font-semibold text-foreground bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                {readiness.stage} → {readiness.nextStage}
              </span>
            </div>
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border',
                readiness.isGateReady
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
              )}
            >
              {readiness.isGateReady ? 'Gate Ready' : 'Pending Prerequisites'}
            </span>
          </div>

          {/* Gate progress meter with 4px sleek progress bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Gate Progress</span>
              <span className="font-medium text-foreground">
                {readiness.satisfiedPrerequisites} of{' '}
                {readiness.totalPrerequisites} Satisfied (
                {readiness.readinessPercentage}%)
              </span>
            </div>
            <div
              className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={readiness.readinessPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  readiness.isGateReady
                    ? 'bg-emerald-600 dark:bg-emerald-400'
                    : 'bg-amber-600 dark:bg-amber-400',
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, readiness.readinessPercentage))}%`,
                }}
              />
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
          {/* Section 1: Gate Prerequisites Checklist */}
          <section
            aria-labelledby="gate-prerequisites-heading"
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <h3
                id="gate-prerequisites-heading"
                className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Gate Prerequisites
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-muted-foreground">
                  {readiness.satisfiedPrerequisites}/
                  {readiness.totalPrerequisites} Satisfied
                </span>
                {isAuthorized && onUpdateMilestones && !isTerminal && (
                  <button
                    type="button"
                    onClick={() => setIsAddingPrerequisite(!isAddingPrerequisite)}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{isAddingPrerequisite ? 'Cancel' : 'Add Gate'}</span>
                  </button>
                )}
              </div>
            </div>

            {isAddingPrerequisite && (
              <form
                onSubmit={handleAddCustomPrerequisite}
                className="rounded border border-primary/40 bg-card p-3 space-y-2.5 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-foreground border-b pb-1">
                  <span>Add Custom Gate Prerequisite ({readiness.stage})</span>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Prerequisite Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPrereqTitle}
                    onChange={(e) => setNewPrereqTitle(e.target.value)}
                    placeholder="e.g. Client Snagging List Sign-Off"
                    className="w-full h-7 px-2 text-xs font-mono rounded border border-border bg-background text-foreground"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Category
                    </label>
                    <select
                      value={newPrereqCategory}
                      onChange={(e) =>
                        setNewPrereqCategory(
                          e.target.value as StageGatePrerequisiteItem['category'],
                        )
                      }
                      className="w-full h-7 px-1.5 text-xs font-mono rounded border border-border bg-background text-foreground"
                    >
                      <option value="regulatory_milestone">Regulatory Milestone</option>
                      <option value="authority_noc">Authority NOC</option>
                      <option value="specialist_study">Specialist Study</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPrereqMandatory}
                        onChange={(e) => setNewPrereqMandatory(e.target.checked)}
                        className="rounded border-border text-primary"
                      />
                      <span>Mandatory for next stage</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground block mb-1">
                    Action Hint / Requirement to Finish
                  </label>
                  <input
                    type="text"
                    value={newPrereqHint}
                    onChange={(e) => setNewPrereqHint(e.target.value)}
                    placeholder="e.g. Complete snagging inspection with client representative"
                    className="w-full h-7 px-2 text-xs font-mono rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingPrerequisite(false);
                      setNewPrereqTitle('');
                      setNewPrereqHint('');
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newPrereqTitle.trim()}
                    className="h-7 text-xs font-semibold px-3 rounded bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Save Gate Prerequisite
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {readiness.prerequisites.length === 0 ? (
                <div className="rounded border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No stage gate prerequisites defined for this stage.
                </div>
              ) : (
                readiness.prerequisites.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      'rounded border p-3 transition-colors',
                      p.isSatisfied
                        ? 'border-zinc-200 bg-card text-card-foreground dark:border-zinc-800'
                        : 'border-amber-200/90 bg-amber-50/40 text-card-foreground dark:border-amber-900/40 dark:bg-amber-950/20',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {p.isCustom && isAuthorized ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCustomPrerequisite(p.id)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            title={p.isSatisfied ? 'Mark Pending Action' : 'Mark Satisfied'}
                          >
                            {p.isSatisfied ? (
                              <CheckCircle2
                                className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                            ) : (
                              <Circle
                                className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        ) : p.isSatisfied ? (
                          <CheckCircle2
                            className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertCircle
                            className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        )}
                        <div className="space-y-1 min-w-0">
                          <p className="font-medium text-xs text-foreground leading-snug">
                            {p.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-muted text-muted-foreground border border-border">
                              {formatCategoryLabel(p.category)}
                            </span>
                            {p.isCustom && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                                Custom Gate
                              </span>
                            )}
                            {p.mandatoryForNextStage && (
                              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                                Mandatory Gate
                              </span>
                            )}
                          </div>
                          {p.sourceReference && (
                            <p className="text-[11px] font-mono text-muted-foreground truncate">
                              <span className="text-zinc-400 dark:text-zinc-500">
                                Ref:{' '}
                              </span>
                              <span className="font-semibold text-foreground">
                                {p.sourceReference}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.isCustom && isAuthorized ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCustomPrerequisite(p.id)}
                            className={cn(
                              'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border cursor-pointer transition-colors',
                              p.isSatisfied
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                                : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40',
                            )}
                          >
                            {p.isSatisfied ? 'Satisfied' : 'Pending Action'}
                          </button>
                        ) : p.isSatisfied ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Satisfied
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Pending Action
                          </span>
                        )}
                        {p.isCustom && isAuthorized && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomPrerequisite(p.id)}
                            className="p-1 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete custom prerequisite"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {!p.isSatisfied && p.actionHint && (
                      <div
                        className="mt-2.5 pt-2 border-t border-amber-200/70 dark:border-amber-900/40 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200"
                        role="note"
                        aria-label={`Action required to satisfy ${p.title}`}
                      >
                        <ArrowRight
                          className="h-3 w-3 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                          aria-hidden="true"
                        />
                        <span>
                          <strong className="font-semibold text-amber-950 dark:text-amber-100">
                            To satisfy:{' '}
                          </strong>
                          {p.actionHint}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Section 2: Milestone Dates Reference */}
          <section aria-labelledby="milestones-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3
                id="milestones-heading"
                className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Milestone Dates Reference</span>
              </h3>
              {isAuthorized && onUpdateMilestones && (
                <button
                  type="button"
                  onClick={() => setIsEditingMilestones(!isEditingMilestones)}
                  className="text-xs font-medium text-foreground hover:underline cursor-pointer"
                >
                  {isEditingMilestones ? 'Cancel' : 'Edit Dates'}
                </button>
              )}
            </div>

            {/* Current Stage Milestones */}
            <div className="rounded border border-border bg-card p-3 space-y-2">
              <div className="text-[11px] font-mono font-semibold uppercase text-zinc-500 dark:text-zinc-400 pb-1 border-b border-border">
                {readiness.stage} Stage Milestones
              </div>
              <div className="space-y-1.5">
                {currentStageMilestones.map((m) => (
                  <div
                    key={m.key}
                    className="flex items-center justify-between text-xs py-0.5 gap-2"
                  >
                    <span className="text-muted-foreground text-[11px]">
                      {m.label}
                    </span>
                    {isEditingMilestones ? (
                      <input
                        type="date"
                        value={m.value || ''}
                        onChange={(e) =>
                          handleMilestoneFieldChange(
                            stageToKey(readiness.stage),
                            m.key,
                            e.target.value,
                          )
                        }
                        className="h-6 text-[11px] font-mono px-1.5 rounded border border-border bg-background text-foreground"
                      />
                    ) : (
                      <span className="font-mono text-[11px] font-medium text-foreground">
                        {formatMilestoneDate(m.value) || 'Pending'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Next Stage Milestones */}
            {readiness.nextStage !== 'Completed' &&
              nextStageMilestones.length > 0 && (
                <div className="rounded border border-border bg-card p-3 space-y-2">
                  <div className="text-[11px] font-mono font-semibold uppercase text-zinc-500 dark:text-zinc-400 pb-1 border-b border-border">
                    {readiness.nextStage} Target Milestones
                  </div>
                  <div className="space-y-1.5">
                    {nextStageMilestones.map((m) => (
                      <div
                        key={m.key}
                        className="flex items-center justify-between text-xs py-0.5 gap-2"
                      >
                        <span className="text-muted-foreground text-[11px]">
                          {m.label}
                        </span>
                        {isEditingMilestones ? (
                          <input
                            type="date"
                            value={m.value || ''}
                            onChange={(e) =>
                              handleMilestoneFieldChange(
                                stageToKey(
                                  readiness.nextStage as ProjectLifecycleStage,
                                ),
                                m.key,
                                e.target.value,
                              )
                            }
                            className="h-6 text-[11px] font-mono px-1.5 rounded border border-border bg-background text-foreground"
                          />
                        ) : (
                          <span className="font-mono text-[11px] font-medium text-foreground">
                            {formatMilestoneDate(m.value) || 'Pending'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {isEditingMilestones && (
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleSaveMilestones}
                  className="h-7 text-xs font-semibold px-3 rounded bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Save Milestone Dates
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Section 3: Stage Progression Controls (Sticky Footer) */}
        <footer className="p-4 border-t border-border bg-background shrink-0 space-y-2">
          {!isAuthorized ? (
            <div className="space-y-2">
              <Button
                disabled
                className="w-full h-9 rounded text-xs font-semibold bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-75 justify-center"
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                <span>Advance to {readiness.nextStage}</span>
              </Button>
              <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                <Lock className="h-3 w-3 shrink-0 mt-0.5 text-zinc-500" />
                <span>
                  Advancing stage requires Resident Engineer or Management
                  approval.
                </span>
              </div>
            </div>
          ) : isTerminal ? (
            <div className="space-y-1.5">
              <Button
                disabled
                className="w-full h-9 rounded text-xs font-semibold bg-muted text-muted-foreground border border-border justify-center"
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                <span>Project Lifecycle Completed</span>
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                All lifecycle stages for Project {project.code} are complete.
              </p>
            </div>
          ) : readiness.isGateReady ? (
            <div className="space-y-1.5">
              <Button
                type="button"
                onClick={handleAdvance}
                className="w-full h-9 rounded text-xs font-semibold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer justify-center"
              >
                <span>
                  {readiness.nextStage === 'Completed'
                    ? 'Complete Project Lifecycle'
                    : `Advance to ${readiness.nextStage}`}
                </span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono text-center">
                All gate requirements are satisfied. Ready to transition.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded border border-amber-300 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/40 p-2.5 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span className="leading-snug">
                  Prerequisites remain pending. Confirming will advance project
                  under managerial authority.
                </span>
              </div>
              <Button
                type="button"
                onClick={handleAdvance}
                className="w-full h-9 rounded text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 transition-colors cursor-pointer justify-center"
              >
                <span>
                  {readiness.nextStage === 'Completed'
                    ? 'Complete Project Lifecycle (Advisory Override)'
                    : `Advance to ${readiness.nextStage} (Advisory Override)`}
                </span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}

export function StageGateDrawer(props: StageGateDrawerProps) {
  const { project, isOpen } = props;
  const milestonesKey = JSON.stringify(
    project.milestones || {},
  );

  return (
    <StageGateDrawerContent
      key={`${project.code}-${isOpen ? 'open' : 'closed'}-${milestonesKey}`}
      {...props}
    />
  );
}

export default StageGateDrawer;
