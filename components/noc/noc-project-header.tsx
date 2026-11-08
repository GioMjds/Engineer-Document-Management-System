import { Building2, MapPin, ShieldCheck } from 'lucide-react';
import type { AssignedProject } from '@/types/noc';

type RoleKey = keyof AssignedProject['assignedRoles'];

const TEAM: { label: string; key: RoleKey }[] = [
  { label: 'Authority Eng.', key: 'authorityEngineer' },
  { label: 'Architect', key: 'architectEngineer' },
  { label: 'MEP', key: 'mepEngineer' },
  { label: 'Structure', key: 'structureEngineer' },
  { label: 'Civil', key: 'civilEngineer' },
  { label: 'Resident Eng.', key: 'residentEngineer' },
  { label: 'Area Manager', key: 'areaManager' },
  { label: 'Doc Controller', key: 'docController' },
];

export function NocProjectHeader({ project }: { project: AssignedProject }) {
  return (
    <section
      aria-labelledby="project-title"
      className="rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="mt-1 rounded bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground">
          {project.code}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h1
            id="project-title"
            className="text-xl font-semibold tracking-tight"
          >
            {project.name}
          </h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden />
              Master Authority:{' '}
              <strong className="font-semibold text-foreground">
                {project.masterAuthority}
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              {project.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5" aria-hidden />
              {project.projectType} · {project.contractType}
            </span>
          </p>
        </div>
      </div>

      <h2 className="sr-only">Project team</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 text-xs sm:grid-cols-4">
        {TEAM.map(({ label, key }) => (
          <div key={key} className="min-w-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
              className="break-words font-medium text-foreground"
              title={project.assignedRoles[key]}
            >
              {project.assignedRoles[key]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
