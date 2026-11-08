'use client';

import { useState } from 'react';
import { ChevronRight, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NocPanel } from './noc-panel';
import {
  ProjectDisciplineCard,
  type ProjectDisciplineCardProps,
} from '@/components/dashboard/project-discipline-card';
import type { DisciplineStageStatus } from '@/types/noc';

const DOT: Record<DisciplineStageStatus, string> = {
  Approved: 'bg-emerald-500',
  'In Progress': 'bg-sky-500',
  'Under Review': 'bg-amber-500',
  'Client Approval': 'bg-purple-500',
  'On Hold': 'bg-rose-500',
  'Not Started': 'bg-slate-400',
};

function Chip({
  label,
  status,
}: {
  label: string;
  status: DisciplineStageStatus;
}) {
  return (
    <li className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1">
      <span aria-hidden className={`size-2 rounded-full ${DOT[status]}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{status}</span>
    </li>
  );
}

export function NocCoordinationBar(props: ProjectDisciplineCardProps) {
  const [open, setOpen] = useState(false);
  const { statusRecord: s, project } = props;
  const { authorities } = s;

  const approved = s.specialists.filter((x) => x.status === 'Approved').length;
  const review = s.specialists.filter((x) => x.status === 'Uploaded').length;
  const rejected = s.specialists.filter((x) => x.status === 'Rejected').length;

  return (
    <>
      <section
        aria-label="Discipline coordination summary"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs"
      >
        <h2 className="flex items-center gap-1.5 font-semibold">
          <FileCheck2 className="size-4 text-primary" aria-hidden />
          Coordination
        </h2>
        <ul className="flex flex-1 flex-wrap items-center gap-1.5">
          <Chip label="Arch" status={s.architecture.status} />
          <Chip label="Struct" status={s.structure.status} />
          <Chip label="MEP" status={s.mep.status} />
          <Chip label="Authority design" status={authorities.designStage} />
          <li className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1">
            <span className="text-muted-foreground">Studies</span>
            <span className="font-medium text-foreground">
              {approved}/{s.specialists.length || 5} approved
            </span>
            {review > 0 && (
              <span className="text-sky-700">· {review} in review</span>
            )}
            {rejected > 0 && (
              <span className="text-rose-700">· {rejected} rejected</span>
            )}
          </li>
        </ul>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          Open coordination
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      </section>

      <NocPanel
        open={open}
        onClose={() => setOpen(false)}
        title="Disciplines, Authorities and Specialist Studies"
        subtitle={`#${project.code} · ${project.name}`}
      >
        <ProjectDisciplineCard {...props} hideHeaderAndStepper />
      </NocPanel>
    </>
  );
}
