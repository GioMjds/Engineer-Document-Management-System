import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  availableProfiles,
  collectMembers,
  createEmptyTeam,
  groupMembersByRole,
  isSameTeam,
} from './team-assignment.ts';

test('collectMembers returns nothing for an empty team', () => {
  assert.deepEqual(collectMembers(createEmptyTeam()), []);
});

test('collectMembers keeps several people per slot and tags discipline', () => {
  const team = { ...createEmptyTeam(), re: ['u3'], mep: ['u1', 'u2'] };
  assert.deepEqual(collectMembers(team), [
    { userId: 'u3', discipline: undefined },
    { userId: 'u1', discipline: 'mep' },
    { userId: 'u2', discipline: 'mep' },
  ]);
});

test('collectMembers stores a person picked in two slots once, first slot wins', () => {
  const team = { ...createEmptyTeam(), mep: ['u1'], civil: ['u1', 'u2'] };
  assert.deepEqual(collectMembers(team), [
    { userId: 'u1', discipline: 'mep' },
    { userId: 'u2', discipline: 'civil' },
  ]);
});

test('isSameTeam ignores selection order but sees additions', () => {
  const a = { ...createEmptyTeam(), mep: ['u1', 'u2'] };
  assert.equal(
    isSameTeam(a, { ...createEmptyTeam(), mep: ['u2', 'u1'] }),
    true,
  );
  assert.equal(isSameTeam(a, { ...createEmptyTeam(), mep: ['u1'] }), false);
  assert.equal(
    isSameTeam(a, { ...createEmptyTeam(), mep: ['u1', 'u2', 'u3'] }),
    false,
  );
});

test('groupMembersByRole collects every member of a role and joins names', () => {
  const { assignedRoles, assignedMembers } = groupMembersByRole([
    {
      user_id: 'a',
      discipline: 'mep',
      profiles: { full_name: 'Ana', role: 'engineer' },
    },
    {
      user_id: 'b',
      discipline: 'mep',
      profiles: { full_name: 'Ben', role: 'engineer' },
    },
    {
      user_id: 'c',
      discipline: null,
      profiles: { full_name: 'Cy', role: 'resident_engineer' },
    },
    {
      user_id: 'd',
      discipline: null,
      profiles: { full_name: null, role: 'doc_controller' },
    },
    {
      user_id: 'e',
      discipline: null,
      profiles: { full_name: 'Eve', role: 'dc' },
    },
  ]);
  assert.equal(assignedRoles.mepEngineer, 'Ana, Ben');
  assert.deepEqual(assignedMembers.mepEngineer, [
    { id: 'a', name: 'Ana' },
    { id: 'b', name: 'Ben' },
  ]);
  assert.equal(assignedRoles.residentEngineer, 'Cy');
  assert.equal(assignedRoles.docController, 'Staff Member, Eve');
  assert.equal(assignedRoles.civilEngineer, 'Unassigned');
});

test('groupMembersByRole reports every role as Unassigned for no members', () => {
  const { assignedRoles, assignedMembers } = groupMembersByRole([]);
  assert.equal(Object.keys(assignedRoles).length, 8);
  assert.ok(Object.values(assignedRoles).every((v) => v === 'Unassigned'));
  assert.deepEqual(assignedMembers, {});
});

test('groupMembersByRole skips null profiles, unknown disciplines and unmapped roles', () => {
  const { assignedRoles, assignedMembers } = groupMembersByRole([
    { user_id: 'a', discipline: 'mep', profiles: null },
    {
      user_id: 'b',
      discipline: null,
      profiles: { full_name: 'Bo', role: 'engineer' },
    },
    {
      user_id: 'c',
      discipline: 'plumbing',
      profiles: { full_name: 'Cy', role: 'engineer' },
    },
    {
      user_id: 'd',
      discipline: null,
      profiles: { full_name: 'Di', role: 'admin' },
    },
    {
      discipline: null,
      profiles: { full_name: 'No id', role: 'area_manager' },
    },
  ]);
  assert.ok(Object.values(assignedRoles).every((v) => v === 'Unassigned'));
  assert.deepEqual(assignedMembers, {});
});

const staff = [
  { id: 'a', role: 'engineer' },
  { id: 'b', role: 'engineer' },
  { id: 'c', role: 'resident_engineer' },
  { id: 'd', role: 'admin' },
];

test('availableProfiles offers only people whose role fits the slot', () => {
  assert.deepEqual(
    availableProfiles(staff, ['engineer'], []).map((p) => p.id),
    ['a', 'b'],
  );
  assert.deepEqual(
    availableProfiles(staff, ['resident_engineer'], []).map((p) => p.id),
    ['c'],
  );
});

test('availableProfiles hides people already chosen in any slot', () => {
  assert.deepEqual(
    availableProfiles(staff, ['engineer'], ['a']).map((p) => p.id),
    ['b'],
  );
});
