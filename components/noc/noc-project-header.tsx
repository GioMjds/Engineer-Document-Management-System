import { Building2, ShieldCheck, Users } from 'lucide-react';
import { TEAM_FIELDS } from '@/lib/team-assignment';
import type { AssignedMember, AssignedProject } from '@/types/noc';

const GROUPS = ['Oversight', 'Discipline leads'] as const;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

function Person({ member }: { member: AssignedMember }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
      >
        {initials(member.name)}
      </span>
      <span className="truncate font-medium text-foreground" title={member.name}>
        {member.name}
      </span>
    </li>
  );
}

export function NocProjectHeader({ project }: { project: AssignedProject }) {
  const total = Object.values(project.assignedMembers ?? {}).reduce(
    (n, list) => n + (list?.length ?? 0),
    0,
  );

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
              <Building2 className="size-3.5" aria-hidden />
              {project.projectType} · {project.contractType}
            </span>
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden />
          {total} {total === 1 ? 'person' : 'people'} on project
        </p>
      </div>

      <h2 className="sr-only">Project team</h2>
      <div className="mt-4 grid gap-x-8 gap-y-4 border-t border-border pt-4 text-xs lg:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group} aria-label={group} className="min-w-0">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {TEAM_FIELDS.filter((f) => f.group === group).map((f) => {
                const members = project.assignedMembers?.[f.projectKey] ?? [];
                return (
                  <div key={f.key} className="min-w-0">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd>
                      {members.length ? (
                        <ul className="space-y-1">
                          {members.map((m) => (
                            <Person key={m.id} member={m} />
                          ))}
                        </ul>
                      ) : (
                        <span className="italic text-muted-foreground/70">
                          Unassigned
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}
