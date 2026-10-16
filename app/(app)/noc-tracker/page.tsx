import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getNocTrackerData } from '@/lib/server/noc-data';
import { summarizeNocs } from '@/lib/noc-summary';
import {
  NocProjectPicker,
  type ProjectCardData,
} from '@/components/noc/noc-project-picker';

export const metadata: Metadata = {
  title: 'NOC Tracker',
  description: 'Select a project to track authority NOCs and expiry',
};

export default async function NocTrackerIndexPage() {
  const user = await requireUser();
  // Assumed to be already scoped to the user's assigned projects
  // (the old project switcher relied on the same assumption).
  const { projects, nocs } = await getNocTrackerData();

  const nocsByProject = new Map<string, typeof nocs>();
  for (const noc of nocs) {
    const list = nocsByProject.get(noc.projectCode);
    if (list) list.push(noc);
    else nocsByProject.set(noc.projectCode, [noc]);
  }

  // Send the client only what the cards need, not full project objects.
  const cards: ProjectCardData[] = projects.map((p) => ({
    project: {
      code: p.code,
      name: p.name,
      location: p.location,
      masterAuthority: p.masterAuthority,
      lifecycleStage: p.lifecycleStage || 'Pre-Construction',
    },
    summary: summarizeNocs(nocsByProject.get(p.code) ?? []),
  }));

  return (
    <div className="py-2">
      <NocProjectPicker cards={cards} canCreate={user.role === 'admin'} />
    </div>
  );
}
