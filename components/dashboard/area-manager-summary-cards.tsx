'use client';

import { Building2, AlertTriangle, Clock, Banknote, ShieldAlert } from 'lucide-react';
import { formatCurrencyAED } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';

interface AreaManagerSummaryCardsProps {
  totalActiveProjects: number;
  escalatedDrawingsCount: number;
  pendingAuthorityApprovals: number;
  totalContractorAmount: number;
  totalConsultantAmount: number;
}

// Executive overview cards for Area Manager regional operations and contract financials.
export function AreaManagerSummaryCards({
  totalActiveProjects,
  escalatedDrawingsCount,
  pendingAuthorityApprovals,
  totalContractorAmount,
  totalConsultantAmount,
}: AreaManagerSummaryCardsProps) {
  const operationsCards = [
    {
      title: 'Active Regional Projects',
      value: totalActiveProjects,
      description: 'Projects under cross-project oversight',
      icon: Building2,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      title: 'Escalated Drawings',
      value: escalatedDrawingsCount,
      description: 'Awaiting second-level technical decision',
      icon: AlertTriangle,
      color:
        'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      title: 'Pending Authority Approvals',
      value: pendingAuthorityApprovals,
      description: 'Statutory NOC submissions in progress',
      icon: Clock,
      color:
        'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Regional Operations Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {operationsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-xl border border-border bg-card p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </span>
                <div className={`rounded-md p-1.5 ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Financial Overview (Side-by-Side Contractor & Consultant amounts) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contractor Contract Amount
            </span>
            <div className="rounded-md p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {formatCurrencyAED(totalContractorAmount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cumulative construction contractor contract value across active regional projects
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Consultant Contract Amount
              </span>
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
              >
                Confidential
              </Badge>
            </div>
            <div className="rounded-md p-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {formatCurrencyAED(totalConsultantAmount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Privileged consultant contract valuation (restricted to Area Manager, CEO, and Admin)
          </p>
        </div>
      </div>
    </div>
  );
}
