'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SubmittalDelayItem, ProjectNocItem } from '@/types/noc';
import { calculateDaysRemaining } from '@/lib/noc-tracker';
import { Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface SubmittalDelayTableProps {
  delayItems: SubmittalDelayItem[];
  expiringNocs: ProjectNocItem[];
}

export function SubmittalDelayTable({
  delayItems,
  expiringNocs,
}: SubmittalDelayTableProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pending Submittals & Authority Delays
              </h4>
              <p className="text-xs text-slate-500">
                Sorted by highest days of delay past planned submission or
                authority turnaround.
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40"
            >
              {delayItems.length} Delayed Submittals
            </Badge>
          </div>
        </div>

        {delayItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 font-medium">All submittals are on schedule.</p>
            <p className="text-[11px] text-slate-400">
              Zero submittals currently exceed their planned delivery dates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    Delay Urgency
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Project
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Authority
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    NOC Description
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Target Plan
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Submitted
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {delayItems.map((item) => (
                  <tr
                    key={item.nocId}
                    className="hover:bg-slate-50/80 transition dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.delayType === 'Unsubmitted Delay' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-mono text-xs dark:bg-rose-950/60 dark:text-rose-300">
                          +{item.daysDelayed}d past plan
                        </Badge>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-mono text-xs dark:bg-purple-950/60 dark:text-purple-300">
                            {item.daysDelayed}d with authority
                          </Badge>
                          {typeof item.planDelayDays === 'number' &&
                            item.planDelayDays > 0 && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                +{item.planDelayDays}d past target plan
                              </span>
                            )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        #{item.projectCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {item.reviewingAuthority}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-800 dark:text-slate-200">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                      {item.planDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                      {item.applyDate || (
                        <span className="text-rose-500 font-sans italic">
                          Not yet applied
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Link href={`/noc-tracker/${item.projectCode}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-blue-600"
                        >
                          Resolve
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 14-Day Expiration Watchlist Section */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/30 overflow-hidden shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="border-b border-amber-200/60 bg-amber-100/40 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                14-Day Authority Permit Expiration Watchlist
              </h4>
            </div>
            <Badge
              variant="outline"
              className="text-xs text-amber-800 border-amber-300 bg-amber-100"
            >
              {expiringNocs.length} Critical Permits
            </Badge>
          </div>
        </div>

        {expiringNocs.length === 0 ? (
          <div className="p-6 text-center text-xs text-amber-800/80">
            No active NOCs are expiring within the next 14 days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-amber-200/50 bg-amber-50/50 text-[11px] font-semibold uppercase tracking-wider text-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    Time to Expiry
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Project
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Authority
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Reference No
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Expiration Date
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/40 dark:divide-amber-900/30">
                {expiringNocs.map((noc) => {
                  const daysLeft = calculateDaysRemaining(noc.expiryDate);
                  const isLapsed = daysLeft !== null && daysLeft < 0;

                  return (
                    <tr
                      key={noc.id}
                      className="hover:bg-amber-100/30 transition"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isLapsed ? (
                          <Badge className="bg-rose-600 text-white font-mono text-xs">
                            Lapsed {Math.abs(daysLeft!)}d ago
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500 text-white font-mono text-xs">
                            Expires in {daysLeft}d
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold">
                        #{noc.projectCode}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {noc.reviewingAuthority}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300">
                        {noc.referenceNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        {noc.expiryDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Link href={`/noc-tracker/${noc.projectCode}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-amber-300 hover:bg-amber-100"
                          >
                            Renew NOC
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
