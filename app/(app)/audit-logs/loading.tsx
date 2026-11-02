import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { Download, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Standard radius matching project theme token.
const RADIUS = 'calc(var(--radius) * 0.8)';

const STAT_TILES = [
  { label: 'Total Logged Events', width: 44 },
  { label: 'Deletions & Purges', width: 32 },
  { label: 'Reviews & Approvals', width: 38 },
  { label: 'Admin Governance & Overrides', width: 36 },
];

const CATEGORIES = [
  { label: 'All Events', width: 68 },
  { label: 'Deletions & Purges', width: 104 },
  { label: 'Document Actions', width: 98 },
  { label: 'Reviews & Decisions', width: 112 },
  { label: 'Authority NOCs', width: 92 },
  { label: 'Admin & Users', width: 84 },
];

const ROWS = [
  {
    actorName: 110,
    actorEmail: 140,
    roleWidth: 40,
    actionWidth: 120,
    entityWidth: 70,
    entityIdWidth: 80,
    summaryWidth: '82%',
  },
  {
    actorName: 130,
    actorEmail: 160,
    roleWidth: 48,
    actionWidth: 140,
    entityWidth: 64,
    entityIdWidth: 92,
    summaryWidth: '68%',
  },
  {
    actorName: 95,
    actorEmail: 135,
    roleWidth: 54,
    actionWidth: 115,
    entityWidth: 76,
    entityIdWidth: 84,
    summaryWidth: '94%',
  },
  {
    actorName: 125,
    actorEmail: 155,
    roleWidth: 38,
    actionWidth: 130,
    entityWidth: 60,
    entityIdWidth: 78,
    summaryWidth: '75%',
  },
  {
    actorName: 105,
    actorEmail: 145,
    roleWidth: 44,
    actionWidth: 125,
    entityWidth: 72,
    entityIdWidth: 88,
    summaryWidth: '88%',
  },
  {
    actorName: 140,
    actorEmail: 170,
    roleWidth: 42,
    actionWidth: 135,
    entityWidth: 68,
    entityIdWidth: 82,
    summaryWidth: '60%',
  },
];

function Bone({
  w = '100%',
  h = 12,
  r = RADIUS,
  circle = false,
  className,
}: {
  w?: number | string;
  h?: number;
  r?: number | string;
  circle?: boolean;
  className?: string;
}) {
  return (
    <Skeleton
      width={circle ? h : w}
      height={h}
      circle={circle}
      borderRadius={circle ? undefined : r}
      containerClassName={cn('block shrink-0 leading-none', className)}
    />
  );
}

export default function AuditLogsLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading audit log and compliance ledger...</span>

      <SkeletonTheme
        baseColor="var(--skeleton-base)"
        highlightColor="var(--skeleton-highlight)"
        duration={1.5}
      >
        <div className="space-y-6" aria-hidden="true">
          {/* Header section */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Audit Log & Compliance Ledger
                </h1>
                <Bone w={72} h={20} r={4} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tamper-evident trail for drawing revisions, deletions, NOC
                overrides, and authority submissions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 rounded-md border border-border bg-background px-3 flex items-center gap-1.5 shadow-2xs">
                <Download className="h-3.5 w-3.5 text-muted-foreground/60" />
                <Bone w={92} h={12} />
              </div>
            </div>
          </header>

          {/* Metric Tiles */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STAT_TILES.map((tile) => (
              <div
                key={tile.label}
                className="rounded-lg border border-border bg-card p-3 shadow-2xs space-y-2"
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {tile.label}
                </div>
                <Bone w={tile.width} h={28} r={4} />
              </div>
            ))}
          </section>

          {/* Filter and Search Bar */}
          <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60"
                  aria-hidden="true"
                />
                <div className="h-9 rounded-md border border-input bg-background/50 pl-9 pr-3 flex items-center">
                  <Bone w={220} h={12} />
                </div>
              </div>

              <div className="h-9 rounded-md border border-input bg-background/50 px-3 w-full sm:w-40 flex items-center justify-between">
                <Bone w={75} h={12} />
                <Bone w={10} h={10} />
              </div>
            </div>

            {/* Quick Category Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs border-t border-border/50">
              <span className="text-muted-foreground mr-1 text-[11px] font-medium">
                Category:
              </span>
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.label}
                  className="h-6 rounded px-2.5 bg-muted/60 flex items-center"
                >
                  <Bone w={cat.width} h={10} />
                </div>
              ))}
            </div>
          </section>

          {/* Audit Ledger Table */}
          <div className="rounded-lg border border-border bg-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-45 text-xs font-semibold">
                    Timestamp
                  </TableHead>
                  <TableHead className="w-50 text-xs font-semibold">
                    Actor
                  </TableHead>
                  <TableHead className="w-40 text-xs font-semibold">
                    Action
                  </TableHead>
                  <TableHead className="w-30 text-xs font-semibold">
                    Entity
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Summary & Evidence
                  </TableHead>
                  <TableHead className="w-22.5 text-right text-xs font-semibold">
                    Payload
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {ROWS.map((row, idx) => (
                  <TableRow key={idx}>
                    {/* Timestamp */}
                    <TableCell className="w-45">
                      <div className="space-y-1">
                        <Bone w={85} h={12} />
                        <Bone w={70} h={10} />
                      </div>
                    </TableCell>

                    {/* Actor */}
                    <TableCell className="w-50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Bone w={row.actorName} h={12} />
                          <Bone w={row.roleWidth} h={14} r={3} />
                        </div>
                        <Bone w={row.actorEmail} h={10} />
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="w-40">
                      <Bone w={row.actionWidth} h={20} r={4} />
                    </TableCell>

                    {/* Entity */}
                    <TableCell className="w-30">
                      <div className="space-y-1">
                        <Bone w={row.entityWidth} h={16} r={4} />
                        <Bone w={row.entityIdWidth} h={10} />
                      </div>
                    </TableCell>

                    {/* Summary & Evidence */}
                    <TableCell>
                      <Bone w={row.summaryWidth} h={12} />
                    </TableCell>

                    {/* Payload */}
                    <TableCell className="w-22.5 text-right">
                      <div className="flex justify-end">
                        <Bone w={54} h={24} r={4} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </SkeletonTheme>
    </div>
  );
}
