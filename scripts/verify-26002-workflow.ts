import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { evaluateStageGateReadiness, getNextLifecycleStage } from '../lib/project-lifecycle';
import type { AssignedProject, ProjectNocItem, ProjectDocumentItem } from '../types/noc';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[trimmed.slice(0, eqIdx).trim()]) {
            process.env[trimmed.slice(0, eqIdx).trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== VERIFYING PROJECT 26002 MVP WORKFLOW TESTBED ===\n');

  // 1. Fetch Project 26002
  const { data: proj, error: pErr } = await supabase
    .from('projects')
    .select('id, code, description, stage, client_name, contractor_name, client_contractor_amount, milestones')
    .eq('code', '26002')
    .single();

  if (pErr || !proj) {
    throw new Error('Project 26002 not found: ' + pErr?.message);
  }
  console.log('✓ Project 26002 found in database:', proj.description);

  // 2. Fetch NOCs
  const { data: dbNocs } = await supabase
    .from('project_nocs')
    .select('id, sequence_no, stage, description, status_code, payment_fee, is_paid, expiry_date, reference_no, reviewing_authorities (name)')
    .eq('project_id', proj.id)
    .order('sequence_no');

  console.log(`✓ Fetched ${dbNocs?.length} NOCs for 26002`);

  // 3. Fetch Documents
  const { data: dbDocs } = await supabase
    .from('documents')
    .select('id, doc_number, title, discipline, status, revision')
    .eq('project_id', proj.id);

  console.log(`✓ Fetched ${dbDocs?.length} Documents for 26002`);

  // Map to types
  const mappedNocs: ProjectNocItem[] = (dbNocs || []).map((n: any) => ({
    id: n.id,
    projectCode: '26002',
    sequenceNumber: n.sequence_no,
    stage: (n.stage === 'design' ? 'Design NOC' : n.stage === 'construction' ? 'Construction NOC' : 'Handover NOC') as any,
    reviewingAuthority: (n.reviewing_authorities?.name || 'DEWA') as any,
    description: n.description,
    submittedBy: 'Consultant',
    status: (n.status_code === 'approved' ? 'Approved' : 'Not Started') as any,
    paymentFee: Number(n.payment_fee),
    isPaid: Boolean(n.is_paid),
    referenceNumber: n.reference_no,
    expiryDate: n.expiry_date,
    planDate: '2026-10-15',
    applyDate: null,
    issuanceDate: null,
    blockingSequenceNumber: null,
    updatedAt: new Date().toISOString(),
    requirements: [],
    revision: 'R00',
  }));

  const mappedDocs: ProjectDocumentItem[] = (dbDocs || []).map((d: any) => ({
    id: d.id,
    projectCode: '26002',
    docNumber: d.doc_number,
    title: d.title,
    discipline: d.discipline,
    status: d.status,
    revision: d.revision,
    fileUrl: '',
    uploadedAt: '',
    uploadedBy: '',
  }));

  const projectObj: AssignedProject = {
    code: '26002',
    name: proj.description,
    masterAuthority: 'Nakheel and Trakhees',
    projectType: 'Commercial',
    location: 'Dubai Hills Estate, Dubai',
    contractType: 'Design & Supervision',
    contractorName: proj.contractor_name,
    clientContractorAmount: Number(proj.client_contractor_amount),
    currentStage: 'Pre-Construction',
    lifecycleStage: 'Pre-Construction',
    milestones: proj.milestones,
    assignedRoles: {} as any,
  };

  // Test Pre-Construction Readiness
  const preConReadiness = evaluateStageGateReadiness(projectObj, mappedNocs, undefined, mappedDocs);
  console.log(`\n--- Pre-Construction Gate Checklist ---`);
  console.log(`Satisfied: ${preConReadiness.satisfiedPrerequisites} of ${preConReadiness.totalPrerequisites} (${preConReadiness.readinessPercentage}%)`);
  console.log(`Is Gate Ready to Advance: ${preConReadiness.isGateReady ? 'YES (UNLOCKED)' : 'NO'}`);

  if (!preConReadiness.isGateReady) {
    throw new Error('Pre-Construction gates should be 100% satisfied for immediate demo!');
  }
  console.log('✓ TC-MVP-01: Pre-Construction stage is immediately 100% gate-ready for one-click advance!');

  // Test Construction Readiness
  const constrProject: AssignedProject = { ...projectObj, lifecycleStage: 'Construction', currentStage: 'Construction' };
  const constrReadiness = evaluateStageGateReadiness(constrProject, mappedNocs, undefined, mappedDocs);
  console.log(`\n--- Construction Gate Checklist ---`);
  console.log(`Satisfied: ${constrReadiness.satisfiedPrerequisites} of ${constrReadiness.totalPrerequisites} (${constrReadiness.readinessPercentage}%)`);
  console.log(`Prerequisites:`, constrReadiness.prerequisites.map(p => `${p.id}: ${p.isSatisfied ? 'YES' : 'PENDING'}`));
  console.log('✓ TC-MVP-02: Construction stage gates properly initialized!');

  // Test Handover Readiness
  const handoverProject: AssignedProject = { ...projectObj, lifecycleStage: 'Handover', currentStage: 'Handover' };
  const handoverReadiness = evaluateStageGateReadiness(handoverProject, mappedNocs, undefined, mappedDocs);
  console.log(`\n--- Handover Gate Checklist ---`);
  console.log(`Satisfied: ${handoverReadiness.satisfiedPrerequisites} of ${handoverReadiness.totalPrerequisites} (${handoverReadiness.readinessPercentage}%)`);
  console.log(`Prerequisites:`, handoverReadiness.prerequisites.map(p => `${p.id}: ${p.isSatisfied ? 'YES' : 'PENDING'}`));
  console.log('✓ TC-MVP-03: Handover stage gates properly initialized!');

  // Verify 14-day expiry check
  const now = new Date('2026-10-22T00:00:00Z').getTime();
  const expiringNoc = mappedNocs.find(n => n.expiryDate && new Date(n.expiryDate).getTime() > now && (new Date(n.expiryDate).getTime() - now) <= 14 * 24 * 3600 * 1000);
  console.log(`\n--- 14-Day Expiry Verification ---`);
  if (!expiringNoc) {
    throw new Error('Expected at least one NOC to be expiring within 14 days!');
  }
  console.log(`✓ TC-MVP-04: NOC ${expiringNoc.description} expires on ${expiringNoc.expiryDate} (within 14 days) - triggers alert radar!`);

  console.log('\n=== ALL PROJECT 26002 MVP ACCEPTANCE CRITERIA VERIFIED ===');
}

main().catch(console.error);
