'use client';

import {
  Ban,
  ChevronRight,
  Clock,
  AlertTriangle,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NocStatusBadge } from './noc-status-badge';
import type { ProjectNocItem } from '@/types/noc';
import {
  checkBlockingPrerequisite,
  calculateDaysRemaining,
  isExpiringSoon,
  isLapsed,
} from '@/lib/noc-tracker';

interface NocDataTableProps {
  items: ProjectNocItem[];
  allNocs: ProjectNocItem[];
  selectedNocId: string | null;
  onSelectNoc: (item: ProjectNocItem) => void;
}

export function NocDataTable({
  items,
  allNocs,
  selectedNocId,
  onSelectNoc,
}: NocDataTableProps) {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center border rounded bg-card text-muted-foreground text-sm space-y-2">
        <Layers className="h-8 w-8 mx-auto text-zinc-400" />
        <p className="font-medium text-foreground">
          No authority NOCs found in this stage.
        </p>
        <p className="text-xs">
          Adjust your active filter or select another project stage tab above.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded bg-card overflow-x-auto">
      <Table className="w-full text-xs">
        <TableHeader className="bg-muted/50 border-b">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-14 font-semibold text-zinc-700 dark:text-zinc-300">
              Seq #
            </TableHead>
            <TableHead className="w-32 font-semibold text-zinc-700 dark:text-zinc-300">
              Authority
            </TableHead>
            <TableHead className="min-w-55 font-semibold text-zinc-700 dark:text-zinc-300">
              Description
            </TableHead>
            <TableHead className="w-28 font-semibold text-zinc-700 dark:text-zinc-300">
              Submitted by
            </TableHead>
            <TableHead className="w-36 font-semibold text-zinc-700 dark:text-zinc-300">
              Authority Ref #
            </TableHead>
            <TableHead className="w-36 font-semibold text-zinc-700 dark:text-zinc-300">
              Status
            </TableHead>
            <TableHead className="w-24 font-semibold text-zinc-700 dark:text-zinc-300">
              Plan date
            </TableHead>
            <TableHead className="w-28 font-semibold text-zinc-700 dark:text-zinc-300">
              Expiry date
            </TableHead>
            <TableHead className="w-28 text-right font-semibold text-zinc-700 dark:text-zinc-300">
              Fee (AED)
            </TableHead>
            <TableHead className="w-10 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const { isBlocked, blockerTitle } = checkBlockingPrerequisite(
              item,
              allNocs,
            );
            const isOverridden = Boolean(item.overrideReason);
            const daysRemaining = calculateDaysRemaining(item.expiryDate);
            const isExpired = item.status === 'Expired' || (item.status === 'Approved' && isLapsed(item.expiryDate));
            const expiring = isExpiringSoon(item.expiryDate) && !isExpired;
            const isSelected = selectedNocId === item.id;

            return (
              <TableRow
                key={item.id}
                onClick={() => onSelectNoc(item)}
                className={`cursor-pointer transition-colors border-b ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-800/80 font-medium'
                    : isBlocked
                      ? 'opacity-65 hover:opacity-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                }`}
              >
                <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                  {String(item.sequenceNumber).padStart(2, '0')}
                </TableCell>
                <TableCell className="font-semibold text-foreground">
                  {item.reviewingAuthority}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground line-clamp-1">
                    {item.description}
                  </div>
                  {isBlocked && (
                    <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                      <span>Blocked: {blockerTitle}</span>
                    </div>
                  )}
                  {isOverridden && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 flex items-center gap-1 line-clamp-1">
                      <ShieldAlert className="h-3 w-3 shrink-0 text-amber-600" />
                      <span>Override: {item.overrideReason}</span>
                    </div>
                  )}
                  {item.status === 'Rejected' && item.rejectionReason && (
                    <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 line-clamp-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>{item.rejectionReason}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.submittedBy}
                </TableCell>
                <TableCell className="font-mono text-xs text-foreground">
                  {item.referenceNumber || (
                    <span className="text-zinc-400 italic">Not issued</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <NocStatusBadge
                      status={isExpired ? 'Expired' : item.status}
                      isBlocked={isBlocked}
                      blockerTitle={blockerTitle}
                    />
                    {isOverridden && (
                      <span
                        title={`Sequence prerequisite bypassed by Admin: ${item.overrideReason}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded border bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      >
                        <ShieldAlert className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>Overridden</span>
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground text-xs">
                  {item.planDate}
                </TableCell>
                <TableCell>
                  {item.expiryDate ? (
                    <div className="flex items-center gap-1">
                      <span
                        className={`font-mono text-xs ${
                          isExpired
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : expiring
                              ? 'text-amber-700 dark:text-amber-400 font-semibold'
                              : ''
                        }`}
                      >
                        {item.expiryDate}
                      </span>
                      {isExpired && (
                        <span
                          title={
                            daysRemaining !== null
                              ? `Expired ${Math.abs(daysRemaining)} days ago`
                              : 'Permit Expired'
                          }
                        >
                          <Ban className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        </span>
                      )}
                      {expiring && (
                        <span title={`Expires in ${daysRemaining} days`}>
                          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        </span>
                      )}
                    </div>
                  ) : item.status === 'Approved' ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                      Permanent
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono font-medium">
                    {item.paymentFee.toLocaleString('en-US')}
                  </div>
                  {item.isPaid && (
                    <div className="mt-0.5 flex justify-end">
                      <span
                        title={
                          item.receiptFileUrl
                            ? `Paid by ${item.payerType === 'consultant_advance' ? 'Consultant Advance' : item.payerType || 'Client'} (Receipt: ${item.receiptFileUrl})`
                            : `Paid by ${item.payerType === 'consultant_advance' ? 'Consultant Advance' : item.payerType || 'Client'}`
                        }
                        className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                      >
                        {item.payerType
                          ? item.payerType === 'consultant_advance'
                            ? 'Advance'
                            : item.payerType
                          : 'Paid'}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
