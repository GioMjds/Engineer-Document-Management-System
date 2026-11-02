'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DisciplineStatusBadge } from './discipline-status-badge';
import { AuthoritiesStageRow } from './authorities-stage-row';
import { ThirdPartySpecialistDrawer } from './third-party-specialist-drawer';
import { ProjectLifecycleStepper } from '@/components/lifecycle/project-lifecycle-stepper';
import type {
  AssignedProject,
  ProjectDisciplineStatus,
  DisciplineStageStatus,
  ThirdPartySpecialistType,
  StageGateReadiness,
  StageMilestoneDates,
} from '@/types/noc';
import { MapPin, FileCheck2, Paperclip, ArrowRight } from 'lucide-react';

interface ProjectDisciplineCardProps {
  project: AssignedProject;
  statusRecord: ProjectDisciplineStatus;
  userRole: string;
  readiness?: StageGateReadiness;
  milestones?: StageMilestoneDates;
  onOpenGateDetails?: () => void;
  onUpdateDiscipline: (
    projectCode: string,
    discipline: 'architecture' | 'structure' | 'mep',
    newStatus: DisciplineStageStatus,
    remarks?: string,
  ) => void;
  onUpdateAuthorityStage: (
    projectCode: string,
    stageKey: 'designStage' | 'constructionStage' | 'revisionStage',
    newStatus: DisciplineStageStatus,
  ) => void;
  onUploadSpecialistFile: (
    projectCode: string,
    type: ThirdPartySpecialistType,
    fileName: string,
    fileSize: string,
  ) => void;
  onApproveSpecialistFile: (
    projectCode: string,
    type: ThirdPartySpecialistType,
  ) => void;
}

export function ProjectDisciplineCard({
  project,
  statusRecord,
  userRole,
  readiness,
  milestones,
  onOpenGateDetails,
  onUpdateDiscipline,
  onUpdateAuthorityStage,
  onUploadSpecialistFile,
  onApproveSpecialistFile,
}: ProjectDisciplineCardProps) {
  const [isSpecialistDrawerOpen, setIsSpecialistDrawerOpen] = useState(false);

  const approvedSpecialistsCount = statusRecord.specialists.filter(
    (s) => s.status === 'Approved',
  ).length;

  const uploadedSpecialistsCount = statusRecord.specialists.filter(
    (s) => s.status === 'Uploaded',
  ).length;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition hover:border-(--site-cyan)/40 text-card-foreground">
      <div className="space-y-4">
        {/* Project Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-(--site-cyan)">
                #{project.code}
              </span>
              <Badge variant="outline" className="text-xs font-medium">
                {project.masterAuthority}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {project.contractType}
              </Badge>
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {project.name}
            </h3>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {project.location} • Stage:{' '}
              <span className="font-medium text-foreground">
                {project.currentStage}
              </span>
            </p>
          </div>

          <Link href={`/noc-tracker/${project.code}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileCheck2 className="h-3.5 w-3.5 text-(--site-cyan)" />
              NOC Tracker
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {project.contractorName && (
            <span className="text-muted-foreground">
              Contractor:{' '}
              <span className="font-semibold text-foreground">
                {project.contractorName}
              </span>
            </span>
          )}
          {project.clientContractorAmount !== undefined && (
            <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">
              Contractor Value: AED{' '}
              {project.clientContractorAmount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>

        {/* Project Lifecycle Stepper */}
        {readiness && (
          <ProjectLifecycleStepper
            currentStage={readiness.stage}
            readiness={readiness}
            milestones={milestones}
            onOpenGateDetails={onOpenGateDetails}
          />
        )}

        {/* Current Status of Disciplines */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Discipline Progress
          </span>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <DisciplineStatusBadge
              discipline="architecture"
              label="Architecture"
              detail={statusRecord.architecture}
              userRole={userRole}
              onUpdate={(newStatus, remarks) =>
                onUpdateDiscipline(
                  project.code,
                  'architecture',
                  newStatus,
                  remarks,
                )
              }
            />
            <DisciplineStatusBadge
              discipline="structure"
              label="Structure"
              detail={statusRecord.structure}
              userRole={userRole}
              onUpdate={(newStatus, remarks) =>
                onUpdateDiscipline(
                  project.code,
                  'structure',
                  newStatus,
                  remarks,
                )
              }
            />
            <DisciplineStatusBadge
              discipline="mep"
              label="MEP"
              detail={statusRecord.mep}
              userRole={userRole}
              onUpdate={(newStatus, remarks) =>
                onUpdateDiscipline(project.code, 'mep', newStatus, remarks)
              }
            />
          </div>
        </div>

        {/* Authorities Stages */}
        <div className="pt-2 border-t border-border">
          <AuthoritiesStageRow
            designStage={statusRecord.authorities.designStage}
            constructionStage={statusRecord.authorities.constructionStage}
            revisionStage={statusRecord.authorities.revisionStage}
            updatedBy={statusRecord.authorities.updatedBy}
            userRole={userRole}
            onUpdate={(stageKey, newStatus) =>
              onUpdateAuthorityStage(project.code, stageKey, newStatus)
            }
          />
        </div>

        {/* Third-Party Specialists */}
        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              Specialist Studies:
            </span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
              >
                {approvedSpecialistsCount} Approved
              </Badge>
              {uploadedSpecialistsCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[11px] text-sky-700 bg-sky-50 dark:bg-sky-950/40"
                >
                  {uploadedSpecialistsCount} In Review
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-(--site-cyan) hover:text-(--site-cyan-hover) hover:bg-(--site-cyan)/10"
            onClick={() => setIsSpecialistDrawerOpen(true)}
          >
            Manage Studies & Files
          </Button>
        </div>
      </div>

      <ThirdPartySpecialistDrawer
        isOpen={isSpecialistDrawerOpen}
        onClose={() => setIsSpecialistDrawerOpen(false)}
        projectCode={project.code}
        projectName={project.name}
        specialists={statusRecord.specialists}
        userRole={userRole}
        onUploadSpecialistFile={(type, fileName, fileSize) =>
          onUploadSpecialistFile(project.code, type, fileName, fileSize)
        }
        onApproveSpecialistFile={(type) =>
          onApproveSpecialistFile(project.code, type)
        }
      />
    </div>
  );
}
