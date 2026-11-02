import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExecutiveDashboardClient } from '@/components/dashboard/executive-dashboard-client';
import { getNocTrackerData } from '@/lib/server/noc-data';
import { getExecutiveDashboardSummary } from '@/app/loaders/ceo';
import type { ProjectDisciplineStatus } from '@/types/noc';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Executive dashboard, discipline transmittal tracking, and authority expiration alerts',
};

export default async function DashboardPage() {
  const user = await requireUser();
  const [{ projects, nocs }, executiveSummary] = await Promise.all([
    getNocTrackerData(),
    getExecutiveDashboardSummary(),
  ]);

  const initialDisciplineStatuses: Record<string, ProjectDisciplineStatus> = {};
  for (const p of projects) {
    if (p.milestones?.disciplineStatus) {
      initialDisciplineStatuses[p.code] = p.milestones.disciplineStatus;
    }
  }

  let initialEngineerStats;
  if (user.role === 'engineer') {
    const supabase = await createClient();
    const { data: userDocs } = await supabase
      .from('documents')
      .select('status')
      .eq('uploaded_by', user.id)
      .neq('status', 'archived');

    if (userDocs && userDocs.length > 0) {
      initialEngineerStats = {
        totalUploaded: userDocs.length,
        underReview: userDocs.filter(
          (d) => d.status === 'submitted' || d.status === 'escalated',
        ).length,
        requiringRevision: userDocs.filter((d) => d.status === 'rejected')
          .length,
      };
    }
  }

  let initialAreaManagerStats;
  if (user.role === 'area_manager') {
    const supabase = await createClient();
    const { count } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'escalated');

    initialAreaManagerStats = {
      escalatedDrawingsCount: count ?? 0,
    };
  }

  return (
    <div className="py-2">
      <ExecutiveDashboardClient
        projects={projects}
        initialNocs={nocs}
        currentUserRole={user.role}
        initialDisciplineStatuses={initialDisciplineStatuses}
        initialEngineerStats={initialEngineerStats}
        initialAreaManagerStats={initialAreaManagerStats}
        executiveSummary={executiveSummary}
      />
    </div>
  );
}
