import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { Filter, Search } from 'lucide-react';
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

// Document table row dimension presets for realistic variation and CLS prevention.
const ROW_PRESETS = [
  {
    docNoWidth: 88,
    titleWidth: '85%',
    descWidth: '65%',
    projWidth: 52,
    discWidth: 60,
    statusWidth: 84,
    sizeWidth: 48,
    hasDesc: true,
  },
  {
    docNoWidth: 96,
    titleWidth: '70%',
    descWidth: '45%',
    projWidth: 52,
    discWidth: 72,
    statusWidth: 96,
    sizeWidth: 54,
    hasDesc: true,
  },
  {
    docNoWidth: 80,
    titleWidth: '92%',
    descWidth: '55%',
    projWidth: 46,
    discWidth: 64,
    statusWidth: 104,
    sizeWidth: 42,
    hasDesc: false,
  },
  {
    docNoWidth: 92,
    titleWidth: '60%',
    descWidth: '50%',
    projWidth: 52,
    discWidth: 58,
    statusWidth: 80,
    sizeWidth: 46,
    hasDesc: true,
  },
  {
    docNoWidth: 84,
    titleWidth: '78%',
    descWidth: '62%',
    projWidth: 52,
    discWidth: 68,
    statusWidth: 92,
    sizeWidth: 50,
    hasDesc: true,
  },
  {
    docNoWidth: 90,
    titleWidth: '82%',
    descWidth: '40%',
    projWidth: 46,
    discWidth: 62,
    statusWidth: 86,
    sizeWidth: 44,
    hasDesc: false,
  },
];

const KPI_CARDS = [
  { label: 'Total Documents', subtitle: 'in scope' },
  { label: 'In Review', subtitle: 'pending sign-off' },
  { label: 'Approved / Ready', subtitle: 'compliant' },
  { label: 'Revision Needed', subtitle: 'action required' },
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

export default function DocumentsLoading() {
  return (
    <div className="py-2" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading document library...</span>

      <SkeletonTheme
        baseColor="var(--skeleton-base)"
        highlightColor="var(--skeleton-highlight)"
        duration={1.5}
      >
        <div className="space-y-6" aria-hidden="true">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Document Library
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage drawings, revisions, and engineering document records
                across assigned projects.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Bone w={140} h={36} r={6} />
            </div>
          </div>

          {/* Quick Status Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {KPI_CARDS.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-border bg-card p-3 shadow-2xs"
              >
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {card.label}
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <Bone w={32} h={24} r={4} />
                  <span className="text-xs text-muted-foreground">
                    {card.subtitle}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Document Table Client Layout */}
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-lg border border-border shadow-xs">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search skeleton */}
                <div className="relative min-w-44 flex-1 md:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                  <div className="h-8 rounded-md border border-input bg-background/50 pl-8 pr-2.5 flex items-center">
                    <Bone w={130} h={12} />
                  </div>
                </div>

                {/* Project Filter skeleton */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground/60 hidden sm:inline" />
                  <div className="h-8 rounded-md border border-input bg-background/50 px-2.5 flex items-center">
                    <Bone w={88} h={12} />
                  </div>
                </div>

                {/* Discipline Filter skeleton */}
                <div className="h-8 rounded-md border border-input bg-background/50 px-2.5 flex items-center">
                  <Bone w={92} h={12} />
                </div>

                {/* Status Filter skeleton */}
                <div className="h-8 rounded-md border border-input bg-background/50 px-2.5 flex items-center">
                  <Bone w={84} h={12} />
                </div>
              </div>

              {/* Counter skeleton */}
              <div className="text-xs text-muted-foreground self-end md:self-center whitespace-nowrap">
                <Bone w={108} h={14} />
              </div>
            </div>

            {/* Document Table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-32 font-semibold whitespace-nowrap">
                      Doc #
                    </TableHead>
                    <TableHead className="min-w-48 font-semibold">
                      Title
                    </TableHead>
                    <TableHead className="w-24 font-semibold whitespace-nowrap">
                      Project
                    </TableHead>
                    <TableHead className="w-28 font-semibold whitespace-nowrap">
                      Discipline
                    </TableHead>
                    <TableHead className="w-16 font-semibold whitespace-nowrap">
                      Rev
                    </TableHead>
                    <TableHead className="w-36 font-semibold whitespace-nowrap">
                      Status
                    </TableHead>
                    <TableHead className="w-20 font-semibold whitespace-nowrap">
                      Size
                    </TableHead>
                    <TableHead className="w-28 font-semibold whitespace-nowrap">
                      Submitted
                    </TableHead>
                    <TableHead className="w-36 text-right font-semibold whitespace-nowrap pr-3">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROW_PRESETS.map((preset, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                        <Bone w={preset.docNoWidth} h={14} />
                      </TableCell>
                      <TableCell className="whitespace-normal wrap-break-word max-w-xs md:max-w-md">
                        <div className="font-medium text-foreground">
                          <Bone w={preset.titleWidth} h={15} />
                        </div>
                        {preset.hasDesc && (
                          <div className="text-xs text-muted-foreground truncate max-w-sm mt-1">
                            <Bone w={preset.descWidth} h={12} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        <Bone w={preset.projWidth} h={14} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Bone w={preset.discWidth} h={20} r={4} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Bone w={36} h={20} r={4} />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <Bone w={preset.statusWidth} h={22} r={9999} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        <Bone w={preset.sizeWidth} h={14} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        <Bone w={68} h={14} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap pr-3">
                        <div className="inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-card p-0.5 shadow-2xs">
                          <Bone w={26} h={26} r={4} />
                          <Bone w={26} h={26} r={4} />
                          <Bone w={26} h={26} r={4} />
                          <div
                            className="h-3.5 w-px bg-border/70 mx-0.5"
                            aria-hidden="true"
                          />
                          <Bone w={26} h={26} r={4} />
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
