'use client';

import { DollarSign, Shield, TrendingUp, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjectFinancialItem {
  projectId: string;
  projectName: string;
  stage: string;
  contractorAmount: number;
  consultantAmount: number;
}

interface FinancialPortfolioWidgetProps {
  totalContractorAmount: number;
  totalConsultantAmount: number;
  projectFinancials: ProjectFinancialItem[];
}

function formatAed(val: number): string {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function FinancialPortfolioWidget({
  totalContractorAmount,
  totalConsultantAmount,
  projectFinancials,
}: FinancialPortfolioWidgetProps) {
  const combinedTotal = totalContractorAmount + totalConsultantAmount;

  return (
    <section
      aria-labelledby="financial-portfolio-heading"
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs"
    >
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="financial-portfolio-heading"
              className="text-base font-bold tracking-tight text-foreground"
            >
              Executive Financial Portfolio
            </h2>
            <Badge
              variant="outline"
              className="gap-1 border-amber-300 bg-amber-50 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <Shield className="size-3 text-amber-600 dark:text-amber-400" />
              Confidential Visibility
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-project contract valuation across contractor awards and confidential consultant fees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {projectFinancials.length} {projectFinancials.length === 1 ? 'project' : 'projects'} accounted
          </span>
        </div>
      </div>

      {/* Financial Portfolio KPI Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Contractor Total */}
        <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Contractor Awards
            </span>
            <div className="rounded-md bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Building className="size-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono text-xl font-bold tracking-tight text-foreground">
              AED {formatAed(totalContractorAmount)}
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Client-to-contractor contract commitments
            </p>
          </div>
        </div>

        {/* Consultant Total (Confidential) */}
        <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Consultant Fees
            </span>
            <div className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <DollarSign className="size-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono text-xl font-bold tracking-tight text-foreground">
              AED {formatAed(totalConsultantAmount)}
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              CVTEC consulting & engineering scope value
            </p>
          </div>
        </div>

        {/* Combined Portfolio Value */}
        <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Portfolio Sum
            </span>
            <div className="rounded-md bg-cyan-50 p-1.5 text-(--site-cyan) dark:bg-cyan-950/40 dark:text-cyan-400">
              <TrendingUp className="size-4" aria-hidden />
            </div>
          </div>
          <div className="mt-2">
            <span className="font-mono text-xl font-bold tracking-tight text-(--site-cyan)">
              AED {formatAed(combinedTotal)}
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Aggregate commercial volume under governance
            </p>
          </div>
        </div>
      </div>

      {/* Per-Project Breakdown Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5">
                  Project
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Lifecycle Stage
                </th>
                <th scope="col" className="px-3 py-2.5 text-right">
                  Contractor Contract Sum
                </th>
                <th scope="col" className="px-3 py-2.5 text-right">
                  Consultant Contract Sum
                </th>
                <th scope="col" className="px-4 py-2.5 text-right">
                  Combined Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projectFinancials.map((p) => {
                const rowTotal = p.contractorAmount + p.consultantAmount;
                return (
                  <tr key={p.projectId} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-(--site-cyan)">
                          #{p.projectId}
                        </span>
                        <span className="font-medium text-foreground">
                          {p.projectName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      <Badge variant="outline" className="font-normal text-xs">
                        {p.stage}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-foreground">
                      AED {formatAed(p.contractorAmount)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-foreground">
                      AED {formatAed(p.consultantAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                      AED {formatAed(rowTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30 font-semibold text-xs">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 text-muted-foreground">
                  Portfolio Aggregate Totals
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                  AED {formatAed(totalContractorAmount)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                  AED {formatAed(totalConsultantAmount)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-(--site-cyan)">
                  AED {formatAed(combinedTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
