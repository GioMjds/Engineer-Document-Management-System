import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getNocTrackerData } from '@/lib/server/noc-data';
import { NocTrackerClient } from '@/components/noc/noc-tracker-client';

export async function generateMetadata({
  params,
}: PageProps<'/noc-tracker/[projectID]'>): Promise<Metadata> {
  const { projectID } = await params;
  return {
    title: `Project ${projectID} · NOC Tracker`,
    description:
      'Authority NOC tracking, sequence dependencies, and expiration management',
  };
}

export default async function NocProjectPage({
  params,
}: PageProps<'/noc-tracker/[projectID]'>) {
  const { projectID } = await params;
  const user = await requireUser();
  const { projects, nocs } = await getNocTrackerData();

  const project = projects.find((p) => p.code === projectID);
  if (!project) notFound();

  const projectNocs = nocs.filter((n) => n.projectCode === project.code);

  return (
    <div className="py-2">
      <NocTrackerClient
        key={project.code}
        project={project}
        initialNocs={projectNocs}
        currentUserRole={user.role}
      />
    </div>
  );
}
