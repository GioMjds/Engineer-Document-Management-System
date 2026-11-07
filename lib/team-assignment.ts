import type { AssignedMember, AssignedRoleKey } from '@/types/noc';

export type TeamDiscipline = 'mep' | 'architect' | 'structure' | 'civil';

interface TeamField {
  key: string;
  label: string;
  group: 'Oversight' | 'Discipline leads';
  roles: readonly string[];
  projectKey: AssignedRoleKey;
  discipline?: TeamDiscipline;
}

export const TEAM_FIELDS = [
  {
    key: 're',
    label: 'Resident Engineer',
    group: 'Oversight',
    roles: ['resident_engineer'],
    projectKey: 'residentEngineer',
  },
  {
    key: 'am',
    label: 'Area Manager',
    group: 'Oversight',
    roles: ['area_manager'],
    projectKey: 'areaManager',
  },
  {
    key: 'ae',
    label: 'Authority Engineer',
    group: 'Oversight',
    roles: ['authority_engineer'],
    projectKey: 'authorityEngineer',
  },
  {
    key: 'dc',
    label: 'Document Controller',
    group: 'Oversight',
    roles: ['dc', 'doc_controller'],
    projectKey: 'docController',
  },
  {
    key: 'arch',
    label: 'Architectural',
    group: 'Discipline leads',
    roles: ['engineer'],
    projectKey: 'architectEngineer',
    discipline: 'architect',
  },
  {
    key: 'struct',
    label: 'Structural',
    group: 'Discipline leads',
    roles: ['engineer'],
    projectKey: 'structureEngineer',
    discipline: 'structure',
  },
  {
    key: 'mep',
    label: 'MEP',
    group: 'Discipline leads',
    roles: ['engineer'],
    projectKey: 'mepEngineer',
    discipline: 'mep',
  },
  {
    key: 'civil',
    label: 'Civil',
    group: 'Discipline leads',
    roles: ['engineer'],
    projectKey: 'civilEngineer',
    discipline: 'civil',
  },
] as const satisfies readonly TeamField[];

export type TeamKey = (typeof TEAM_FIELDS)[number]['key'];
export type TeamAssignment = Record<TeamKey, string[]>;

export const createEmptyTeam = () =>
  Object.fromEntries(
    TEAM_FIELDS.map((f) => [f.key, [] as string[]]),
  ) as TeamAssignment;

// Converts a team assignment into the member payload expected by the server actions.
export function collectMembers(team: TeamAssignment) {
  const seen = new Set<string>();
  const members: { userId: string; discipline?: TeamDiscipline }[] = [];

  for (const f of TEAM_FIELDS) {
    for (const userId of team[f.key]) {
      if (seen.has(userId)) continue;
      seen.add(userId);
      members.push({
        userId,
        discipline: 'discipline' in f ? f.discipline : undefined,
      });
    }
  }
  return members;
}

// True when both teams hold the same people per slot, ignoring order.
export function isSameTeam(a: TeamAssignment, b: TeamAssignment) {
  return TEAM_FIELDS.every((f) => {
    const ids = new Set(a[f.key]);
    return ids.size === b[f.key].length && b[f.key].every((id) => ids.has(id));
  });
}

interface RawMember {
  user_id?: string;
  discipline?: string | null;
  profiles: { full_name: string | null; role: string } | null;
}

const ROLE_KEY_BY_PROFILE_ROLE: Record<string, AssignedRoleKey | undefined> = {
  authority_engineer: 'authorityEngineer',
  resident_engineer: 'residentEngineer',
  area_manager: 'areaManager',
  dc: 'docController',
  doc_controller: 'docController',
};

const ROLE_KEY_BY_DISCIPLINE: Record<string, AssignedRoleKey | undefined> = {
  architect: 'architectEngineer',
  structure: 'structureEngineer',
  mep: 'mepEngineer',
  civil: 'civilEngineer',
};

// Groups project members by team slot and builds the joined display name per slot.
export function groupMembersByRole(members: RawMember[]) {
  const assignedMembers: Partial<Record<AssignedRoleKey, AssignedMember[]>> =
    {};

  for (const pm of members) {
    const profile = pm.profiles;
    if (!profile || !pm.user_id) continue;

    const key =
      profile.role === 'engineer'
        ? ROLE_KEY_BY_DISCIPLINE[pm.discipline ?? '']
        : ROLE_KEY_BY_PROFILE_ROLE[profile.role];
    if (!key) continue;

    (assignedMembers[key] ??= []).push({
      id: pm.user_id,
      name: profile.full_name || 'Staff Member',
    });
  }

  const assignedRoles = Object.fromEntries(
    TEAM_FIELDS.map((f) => [
      f.projectKey,
      assignedMembers[f.projectKey]?.map((m) => m.name).join(', ') ||
        'Unassigned',
    ]),
  ) as Record<AssignedRoleKey, string>;

  return { assignedRoles, assignedMembers };
}
