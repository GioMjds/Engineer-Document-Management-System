'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FolderPlus,
  MapPin,
  Search,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { attentionCount, type NocSummary } from '@/lib/noc-summary';
import { cn } from '@/lib/utils';

export interface PickerProject {
  code: string;
  name: string;
  location: string;
  masterAuthority: string;
  lifecycleStage: string;
}

export interface ProjectCardData {
  project: PickerProject;
  summary: NocSummary;
}

interface NocProjectPickerProps {
  cards: ProjectCardData[];
  canCreate: boolean;
}

const ALL = 'all';

const STAGE_ITEMS = [
  { value: ALL, label: 'All stages' },
  { value: 'Pre-Construction', label: 'Pre-Construction' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Handover', label: 'Handover' },
];

const TONES = {
  expired: 'bg-expired-subtle text-expired-fg',
  warning: 'bg-warning-subtle text-warning-fg',
  info: 'bg-info-subtle text-info-fg',
} as const;

function Chip({
  icon: Icon,
  count,
  label,
  tone,
}: {
  icon: LucideIcon;
  count: number;
  label: string;
  tone: keyof typeof TONES;
}) {
  if (!count) return null;
  return (
    <li
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        TONES[tone],
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="font-mono tabular-nums">{count}</span>
      {label}
    </li>
  );
}

function AttentionChips({ summary }: { summary: NocSummary }) {
  return (
    <>
      <Chip
        icon={XCircle}
        count={summary.rejected}
        label="rejected"
        tone="expired"
      />
      <Chip
        icon={Clock}
        count={summary.expiring}
        label="expiring"
        tone="warning"
      />
      <Chip
        icon={CalendarClock}
        count={summary.atRisk}
        label="plan at risk"
        tone="warning"
      />
      <Chip
        icon={Banknote}
        count={summary.feeDue}
        label="fee due"
        tone="info"
      />
    </>
  );
}

export function NocProjectPicker({ cards, canCreate }: NocProjectPickerProps) {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<string>(ALL);

  const totals = useMemo<NocSummary>(
    () =>
      cards.reduce<NocSummary>(
        (acc, { summary }) => ({
          required: acc.required + summary.required,
          approved: acc.approved + summary.approved,
          expiring: acc.expiring + summary.expiring,
          rejected: acc.rejected + summary.rejected,
          feeDue: acc.feeDue + summary.feeDue,
          atRisk: acc.atRisk + summary.atRisk,
        }),
        {
          required: 0,
          approved: 0,
          expiring: 0,
          rejected: 0,
          feeDue: 0,
          atRisk: 0,
        },
      ),
    [cards],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (
      cards
        .filter(
          ({ project }) => stage === ALL || project.lifecycleStage === stage,
        )
        .filter(
          ({ project }) =>
            !q ||
            [
              project.code,
              project.name,
              project.location,
              project.masterAuthority,
            ].some((v) => v.toLowerCase().includes(q)),
        )
        // Triage order: most urgent first, then newest project code.
        .sort(
          (a, b) =>
            attentionCount(b.summary) - attentionCount(a.summary) ||
            b.project.code.localeCompare(a.project.code),
        )
    );
  }, [cards, query, stage]);

  if (cards.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-12 text-center">
        <Building2
          className="mx-auto size-12 text-muted-foreground/60"
          aria-hidden
        />
        <h1 className="text-lg font-semibold">No Projects Registered</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          There are currently no active projects.{' '}
          {canCreate
            ? 'Create a new project to get started.'
            : 'Contact an administrator to assign you to a project.'}
        </p>
        {canCreate && (
          <Link
            href="/projects/new"
            className={cn(buttonVariants(), 'gap-1.5')}
          >
            <FolderPlus className="size-4" aria-hidden />
            New Project
          </Link>
        )}
      </div>
    );
  }

  const totalAttention = attentionCount(totals);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">NOC Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Select a project to track its authority NOCs, sequence dependencies
            and expiry.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/projects/new"
            className={cn(
              buttonVariants(),
              'h-10 gap-1.5 self-start sm:self-auto',
            )}
          >
            <FolderPlus className="size-4" aria-hidden />
            New project
          </Link>
        )}
      </header>

      <section aria-label="Attention across projects">
        {totalAttention > 0 ? (
          <ul className="flex flex-wrap items-center gap-2">
            <li className="mr-1 text-xs font-medium text-muted-foreground">
              Across your projects
            </li>
            <AttentionChips summary={totals} />
          </ul>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-success-fg">
            <CheckCircle2 className="size-4" aria-hidden />
            No NOCs need attention across your projects
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="project-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, name, location…"
            className="h-10 bg-card pl-9"
          />
        </div>
        <Select
          value={stage}
          items={STAGE_ITEMS}
          onValueChange={(v) => setStage(v ?? ALL)}
        >
          <SelectTrigger
            aria-label="Filter by lifecycle stage"
            className="h-10 w-full bg-card sm:w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          className="text-xs text-muted-foreground sm:ml-auto"
          aria-live="polite"
        >
          {visible.length} of {cards.length} projects
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed bg-card p-10 text-center">
          <p className="text-sm font-medium">No projects match your filters</p>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              setQuery('');
              setStage(ALL);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ project, summary }) => (
            <ProjectCard
              key={project.code}
              project={project}
              summary={summary}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectCard({ project, summary }: ProjectCardData) {
  const pct = summary.required
    ? Math.round((summary.approved / summary.required) * 100)
    : 0;
  const needsAttention = attentionCount(summary) > 0;

  return (
    <li className="group relative flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-xs transition-colors hover:border-ring/60 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring motion-reduce:transition-none">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground">
          {project.code}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {project.lifecycleStage}
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight">
          {/* Stretched link: whole card is the click target, one tab stop. */}
          <Link
            href={`/noc-tracker/${project.code}` as Route}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {project.name}
          </Link>
        </h2>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{project.masterAuthority}</span>
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{project.location}</span>
        </p>
      </div>

      {summary.required === 0 ? (
        <p className="text-xs text-muted-foreground">No NOCs registered yet</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">NOCs approved</span>
            <span className="font-mono tabular-nums">
              {summary.approved}/{summary.required}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="NOCs approved"
            aria-valuemin={0}
            aria-valuemax={summary.required}
            aria-valuenow={summary.approved}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        {needsAttention ? (
          <ul className="flex flex-wrap gap-1.5">
            <AttentionChips summary={summary} />
          </ul>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-success-fg">
            <CheckCircle2 className="size-4" aria-hidden />
            All clear
          </p>
        )}
        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </div>
    </li>
  );
}
