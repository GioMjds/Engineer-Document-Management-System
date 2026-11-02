import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { Search } from 'lucide-react';
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
    projCode: 52,
    sheetNo: 105,
    titleWidth: '80%',
    hasEscalation: false,
    disciplineWidth: 54,
    authorWidth: 90,
    dateWidth: 76,
    revWidth: 28,
  },
  {
    projCode: 48,
    sheetNo: 115,
    titleWidth: '65%',
    hasEscalation: true,
    disciplineWidth: 68,
    authorWidth: 105,
    dateWidth: 72,
    revWidth: 28,
  },
  {
    projCode: 56,
    sheetNo: 98,
    titleWidth: '90%',
    hasEscalation: false,
    disciplineWidth: 60,
    authorWidth: 84,
    dateWidth: 76,
    revWidth: 28,
  },
  {
    projCode: 52,
    sheetNo: 110,
    titleWidth: '72%',
    hasEscalation: false,
    disciplineWidth: 50,
    authorWidth: 96,
    dateWidth: 70,
    revWidth: 28,
  },
  {
    projCode: 48,
    sheetNo: 102,
    titleWidth: '85%',
    hasEscalation: true,
    disciplineWidth: 64,
    authorWidth: 110,
    dateWidth: 74,
    revWidth: 28,
  },
  {
    projCode: 54,
    sheetNo: 108,
    titleWidth: '58%',
    hasEscalation: false,
    disciplineWidth: 58,
    authorWidth: 88,
    dateWidth: 72,
    revWidth: 28,
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

export default function ReviewLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading technical review queue...</span>

      <SkeletonTheme
        baseColor="var(--skeleton-base)"
        highlightColor="var(--skeleton-highlight)"
        duration={1.5}
      >
        <div className="space-y-6" aria-hidden="true">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Review Queue
                </h1>
                <Bone w={74} h={20} r={4} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Technical compliance evaluation for submitted drawings across
                assigned projects.
              </p>
            </div>
          </div>

          {/* Table Container with space-y-4 matching ReviewQueueTable */}
          <div className="space-y-4">
            {/* Search and Filters toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border shadow-xs">
            <div className="relative flex-1">
              <Search
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60"
                aria-hidden="true"
              />
              <div className="h-9 rounded-md border border-input bg-background/50 pl-9 pr-3 flex items-center">
                <Bone w={260} h={12} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-9 rounded-md border border-input bg-background/50 px-3 w-32 flex items-center justify-between">
                <Bone w={78} h={12} />
                <Bone w={8} h={8} />
              </div>
              <div className="h-9 rounded-md border border-input bg-background/50 px-3 w-32 flex items-center justify-between">
                <Bone w={72} h={12} />
                <Bone w={8} h={8} />
              </div>
            </div>
          </div>

          {/* Review Table view */}
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-30 text-xs font-semibold">
                    Project
                  </TableHead>
                  <TableHead className="w-35 text-xs font-semibold">
                    Sheet Number
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Title</TableHead>
                  <TableHead className="w-27.5 text-xs font-semibold">
                    Discipline
                  </TableHead>
                  <TableHead className="w-32.5 text-xs font-semibold">
                    Author
                  </TableHead>
                  <TableHead className="w-30 text-xs font-semibold">
                    Submission Date
                  </TableHead>
                  <TableHead className="w-17.5 text-xs font-semibold">
                    Rev
                  </TableHead>
                  <TableHead className="w-30 text-right text-xs font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {ROWS.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30">
                    {/* Project */}
                    <TableCell className="w-30">
                      <div className="space-y-1">
                        <Bone w={row.projCode} h={12} r={3} />
                        <Bone w={68} h={10} />
                      </div>
                    </TableCell>

                    {/* Sheet Number */}
                    <TableCell className="w-35">
                      <Bone w={row.sheetNo} h={12} r={3} />
                    </TableCell>

                    {/* Title */}
                    <TableCell>
                      <div className="space-y-1">
                        <Bone w={row.titleWidth} h={13} />
                        {row.hasEscalation && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <Bone w={65} h={14} r={3} />
                            <Bone w={120} h={10} />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Discipline */}
                    <TableCell className="w-27.5">
                      <Bone w={row.disciplineWidth} h={18} r={4} />
                    </TableCell>

                    {/* Author */}
                    <TableCell className="w-32.5">
                      <Bone w={row.authorWidth} h={12} />
                    </TableCell>

                    {/* Submission Date */}
                    <TableCell className="w-30">
                      <Bone w={row.dateWidth} h={12} />
                    </TableCell>

                    {/* Rev */}
                    <TableCell className="w-17.5">
                      <Bone w={row.revWidth} h={18} r={4} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="w-30 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Bone w={28} h={28} r={6} />
                        <Bone w={64} h={28} r={6} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </SkeletonTheme>
    </div>
  );
}
