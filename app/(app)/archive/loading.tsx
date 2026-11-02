import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
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

const ROWS = [
  {
    docNo: 96,
    titleWidth: '78%',
    projCode: 52,
    statusWidth: 64,
    archivedBy: 110,
    archivedOn: 130,
    hasPurge: true,
  },
  {
    docNo: 88,
    titleWidth: '60%',
    projCode: 48,
    statusWidth: 72,
    archivedBy: 95,
    archivedOn: 125,
    hasPurge: true,
  },
  {
    docNo: 104,
    titleWidth: '85%',
    projCode: 52,
    statusWidth: 58,
    archivedBy: 120,
    archivedOn: 135,
    hasPurge: true,
  },
  {
    docNo: 84,
    titleWidth: '50%',
    projCode: 44,
    statusWidth: 80,
    archivedBy: 105,
    archivedOn: 120,
    hasPurge: true,
  },
  {
    docNo: 92,
    titleWidth: '72%',
    projCode: 52,
    statusWidth: 68,
    archivedBy: 115,
    archivedOn: 130,
    hasPurge: true,
  },
  {
    docNo: 90,
    titleWidth: '64%',
    projCode: 48,
    statusWidth: 76,
    archivedBy: 100,
    archivedOn: 125,
    hasPurge: true,
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

export default function ArchiveLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading archived documents repository...</span>

      <SkeletonTheme
        baseColor="var(--skeleton-base)"
        highlightColor="var(--skeleton-highlight)"
        duration={1.5}
      >
        <div className="space-y-4" aria-hidden="true">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Archive
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Soft-deleted documents across assigned projects. Restore to
              reactivate, or permanently purge (Admin only).
            </p>
          </div>

          {/* Table Container */}
          <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-32 font-semibold">Doc #</TableHead>
                  <TableHead className="min-w-48 font-semibold">Title</TableHead>
                  <TableHead className="w-24 font-semibold">Project</TableHead>
                  <TableHead className="w-32 font-semibold">
                    Previous Status
                  </TableHead>
                  <TableHead className="w-36 font-semibold">
                    Archived by
                  </TableHead>
                  <TableHead className="w-36 font-semibold">
                    Archived on
                  </TableHead>
                  <TableHead className="w-36 text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {ROWS.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    {/* Doc # */}
                    <TableCell className="w-32">
                      <Bone w={row.docNo} h={13} r={3} />
                    </TableCell>

                    {/* Title */}
                    <TableCell className="min-w-48">
                      <Bone w={row.titleWidth} h={13} />
                    </TableCell>

                    {/* Project */}
                    <TableCell className="w-24">
                      <Bone w={row.projCode} h={13} r={3} />
                    </TableCell>

                    {/* Previous Status */}
                    <TableCell className="w-32">
                      <Bone w={row.statusWidth} h={18} r={4} />
                    </TableCell>

                    {/* Archived by */}
                    <TableCell className="w-36">
                      <Bone w={row.archivedBy} h={13} />
                    </TableCell>

                    {/* Archived on */}
                    <TableCell className="w-36">
                      <Bone w={row.archivedOn} h={13} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="w-36">
                      <div className="flex justify-end gap-1.5">
                        <Bone w={32} h={28} r={6} />
                        <Bone w={68} h={28} r={6} />
                        {row.hasPurge && <Bone w={62} h={28} r={6} />}
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
