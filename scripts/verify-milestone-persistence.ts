import {
  canUserAdvanceStage,
  canUserModifyMilestones,
  getStoredProjectMilestones,
  saveStoredProjectMilestones,
  getStoredProjectStage,
  saveStoredProjectStage,
  evaluateStageGateReadiness,
} from '../lib/project-lifecycle';
import type { AssignedProject, StageMilestoneDates } from '../types/noc';

// Mock localStorage for Node environment
const store: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => {
    store[key] = val;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
  key: () => null,
  length: 0,
} as unknown as Storage;

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`PASS: ${desc}`);
    passed++;
  } else {
    console.error(`FAIL: ${desc}`);
    failed++;
  }
}

console.log('--- Testing Milestone Dates & Stage Gate Persistence ---');

// Test 1: Role check for modifying milestones
assert(canUserModifyMilestones('admin') === true, 'Admin can modify milestones');
assert(canUserModifyMilestones('area_manager') === true, 'Area Manager can modify milestones');
assert(canUserModifyMilestones('resident_engineer') === true, 'Resident Engineer can modify milestones');
assert(canUserModifyMilestones('engineer') === false, 'Engineer cannot modify milestones');
assert(canUserModifyMilestones('authority_engineer') === false, 'Authority Engineer cannot modify milestones');
assert(canUserModifyMilestones('dc') === false, 'Document Controller cannot modify milestones');
assert(canUserModifyMilestones('ceo') === false, 'CEO cannot modify milestones');

// Test 2: Brand new project 26001 starts with empty/fallback milestones
const initialMilestones = getStoredProjectMilestones('26001');
assert(Object.keys(initialMilestones).length === 0, 'New project 26001 starts with empty milestones');

// Test 3: Save milestone dates for project 26001
const newDates: StageMilestoneDates = {
  preConstruction: {
    kickoffDate: '2026-10-21',
    conceptApprovalDate: '2026-10-21',
    buildingPermitDate: '2026-10-21',
  },
};
saveStoredProjectMilestones('26001', newDates);
const loadedMilestones = getStoredProjectMilestones('26001');
assert(loadedMilestones.preConstruction?.conceptApprovalDate === '2026-10-21', 'Concept approval date persisted');
assert(loadedMilestones.preConstruction?.buildingPermitDate === '2026-10-21', 'Building permit date persisted');

// Test 4: Evaluate stage gate with persisted milestones
const project26001: AssignedProject = {
  id: 'mock-proj-id',
  code: '26001',
  name: 'Al Wasl Residential Tower Phase 2',
  masterAuthority: 'Nakheel & Partners',
  projectType: 'Commercial & Residential',
  location: 'Dubai, UAE',
  contractType: 'Design & Supervision',
  currentStage: 'Pre-Construction',
  lifecycleStage: 'Pre-Construction',
  milestones: loadedMilestones,
  clientContractorAmount: 45000000,
  assignedRoles: {
    authorityEngineer: 'Sayed Al-Hashemi',
    architectEngineer: 'Liam Thorne',
    mepEngineer: 'Sunita Sharma',
    structureEngineer: 'Unassigned',
    civilEngineer: 'Abbas Al-Ayachi',
    residentEngineer: 'Resident Engineer Lead',
    areaManager: 'Hassan Al-Maktoum',
    docController: 'Unassigned',
  },
};

const readiness = evaluateStageGateReadiness(project26001, []);
assert(readiness.satisfiedPrerequisites === 2, '2 of 7 gates satisfied with milestone dates');
assert(readiness.readinessPercentage === 29, 'Readiness percentage is 29%');
assert(readiness.prerequisites.find((p) => p.id === 'gate-concept')?.isSatisfied === true, 'gate-concept is satisfied');
assert(readiness.prerequisites.find((p) => p.id === 'gate-permit')?.isSatisfied === true, 'gate-permit is satisfied');

// Test 5: Lifecycle stage persistence
assert(getStoredProjectStage('26001', 'Pre-Construction') === 'Pre-Construction', 'Initial stage fallback is Pre-Construction');
saveStoredProjectStage('26001', 'Construction');
assert(getStoredProjectStage('26001', 'Pre-Construction') === 'Construction', 'Stage persists as Construction');

console.log(`\nSummary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
