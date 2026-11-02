import { createClient } from '@/lib/supabase/server';
import { calculateDaysRemaining } from '@/lib/noc-tracker';

export interface ExecutiveKpiSummary {
  activeProjectsCount: number;
  nocCompletionPercentage: number;
  criticalDelaysCount: number;
  expiringNocsCount: number;
  reviewBacklogCount: number;
  totalContractorAmount: number;
  totalConsultantAmount: number;
  projectFinancials: Array<{
    projectId: string;
    projectName: string;
    stage: string;
    contractorAmount: number;
    consultantAmount: number;
  }>;
}

const emptySummary: ExecutiveKpiSummary = {
  activeProjectsCount: 0,
  nocCompletionPercentage: 0,
  criticalDelaysCount: 0,
  expiringNocsCount: 0,
  reviewBacklogCount: 0,
  totalContractorAmount: 0,
  totalConsultantAmount: 0,
  projectFinancials: [],
};

export async function getExecutiveDashboardSummary(): Promise<ExecutiveKpiSummary> {
  try {
    const supabase = await createClient();

    // 1. Fetch accessible active projects
    const { data: dbProjects, error: projError } = await supabase
      .from('projects')
      .select('id, code, description, stage, client_contractor_amount')
      .is('archived_at', null)
      .order('code', { ascending: true });

    if (projError || !dbProjects || dbProjects.length === 0) {
      return emptySummary;
    }

    const projectIds = dbProjects.map((p) => p.id);

    // 2. Fetch confidential consultant amounts (RLS permits admin, ceo, area_manager)
    const { data: dbConfidential } = await supabase
      .from('project_confidential')
      .select('project_id, client_consultant_amount')
      .in('project_id', projectIds);

    const confidentialMap = new Map<string, number>();
    if (dbConfidential) {
      for (const c of dbConfidential) {
        confidentialMap.set(c.project_id, Number(c.client_consultant_amount) || 0);
      }
    }

    // 3. Fetch project NOCs for completion, delays, and expiries
    const { data: dbNocs } = await supabase
      .from('project_nocs')
      .select('status_code, plan_date, expiry_date')
      .in('project_id', projectIds);

    const totalNocs = dbNocs?.length || 0;
    let approvedCount = 0;
    let criticalDelaysCount = 0;
    let expiringNocsCount = 0;
    const today = new Date().toISOString().split('T')[0];

    if (dbNocs) {
      for (const noc of dbNocs) {
        const isApproved = noc.status_code === 'approved' || noc.status_code === 'obtained';
        if (isApproved) {
          approvedCount++;
          if (noc.expiry_date) {
            const days = calculateDaysRemaining(noc.expiry_date);
            if (days !== null && days >= 0 && days <= 14) {
              expiringNocsCount++;
            }
          }
        } else if (noc.status_code !== 'not_needed' && noc.plan_date && noc.plan_date < today) {
          criticalDelaysCount++;
        }
      }
    }

    // 4. Fetch review backlog (drawings in 'submitted' or 'escalated' status)
    const { count: backlogCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .in('status', ['submitted', 'escalated'])
      .is('archived_at', null);

    // 5. Aggregate financials
    const projectFinancials = dbProjects.map((p) => {
      const contractorAmount = Number(p.client_contractor_amount) || 0;
      const consultantAmount = confidentialMap.get(p.id) || 0;
      return {
        projectId: p.code,
        projectName: p.description || p.code,
        stage: p.stage ? p.stage.charAt(0).toUpperCase() + p.stage.slice(1) : 'Pre-Construction',
        contractorAmount,
        consultantAmount,
      };
    });

    const totalContractorAmount = projectFinancials.reduce((sum, p) => sum + p.contractorAmount, 0);
    const totalConsultantAmount = projectFinancials.reduce((sum, p) => sum + p.consultantAmount, 0);

    return {
      activeProjectsCount: dbProjects.length,
      nocCompletionPercentage: totalNocs > 0 ? Math.round((approvedCount / totalNocs) * 100) : 0,
      criticalDelaysCount,
      expiringNocsCount,
      reviewBacklogCount: backlogCount ?? 0,
      totalContractorAmount,
      totalConsultantAmount,
      projectFinancials,
    };
  } catch {
    return emptySummary;
  }
}
