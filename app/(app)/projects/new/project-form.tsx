'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  HardHat,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createProject } from '@/app/actions/admin';
import type { MasterAuthorityRecord } from '@/types/noc';
import type { ProfileItem } from '@/components/projects/project-team-dialog';

const STAGE_LABELS = {
  planning: 'Planning',
  design: 'Pre-Construction (Design)',
  construction: 'Construction',
  handover: 'Handover',
  completed: 'Completed',
} satisfies Record<string, string>;

const projectSchema = z.object({
  code: z.string().trim().min(1, 'Project code is required.'),
  name: z.string().trim().min(1, 'Project name is required.'),
  stage: z.enum([
    'planning',
    'design',
    'construction',
    'handover',
    'completed',
  ]),
  master_authority_id: z.number().int().positive(),
  client_name: z.string().trim().min(1, 'Client name is required.'),
  contractor_name: z.string().trim().min(1, 'Contractor name is required.'),
  client_emails: z.string(),
  contractor_emails: z.string(),
  client_contractor_amount: z
    .number({ error: 'Enter a valid amount.' })
    .min(0, 'Amount cannot be negative.'),
  client_consultant_amount: z
    .number({ error: 'Enter a valid amount.' })
    .min(0, 'Amount cannot be negative.'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectRegistrationFormProps {
  authorities?: MasterAuthorityRecord[];
  teamProfiles?: ProfileItem[];
}

const parseEmails = (str?: string) =>
  (str ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

export function ProjectRegistrationForm({
  authorities = [],
  teamProfiles = [],
}: ProjectRegistrationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // 2-step wizard state for creating projects
  const [step, setStep] = useState<1 | 2>(1);

  // Consultant team assignments state for Phase 2
  const [reId, setReId] = useState<string>('unassigned');
  const [amId, setAmId] = useState<string>('unassigned');
  const [aeId, setAeId] = useState<string>('unassigned');
  const [dcId, setDcId] = useState<string>('unassigned');
  const [archId, setArchId] = useState<string>('unassigned');
  const [structId, setStructId] = useState<string>('unassigned');
  const [mepId, setMepId] = useState<string>('unassigned');
  const [civilId, setCivilId] = useState<string>('unassigned');

  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      code: '',
      name: '',
      stage: 'planning',
      master_authority_id: authorities[0]?.id ?? 1,
      client_name: '',
      contractor_name: '',
      client_emails: '',
      contractor_emails: '',
      client_contractor_amount: 0,
      client_consultant_amount: 0,
    },
  });

  const projectCode = useWatch({ control, name: 'code' });
  const projectName = useWatch({ control, name: 'name' });

  const getOptionsForRole = (primaryRole?: string) => {
    const matched = primaryRole
      ? teamProfiles.filter((p) => p.role === primaryRole)
      : [];
    const others = primaryRole
      ? teamProfiles.filter((p) => p.role !== primaryRole)
      : teamProfiles;

    return [
      { id: 'unassigned', label: '— Unassigned —' },
      ...matched.map((p) => ({
        id: p.id,
        label: `${p.full_name || p.email} (${p.role})`,
      })),
      ...others.map((p) => ({
        id: p.id,
        label: `${p.full_name || p.email} (${p.role})`,
      })),
    ];
  };

  const collectMembers = () => {
    const members: {
      userId: string;
      discipline?: 'mep' | 'architect' | 'structure' | 'civil';
    }[] = [];

    if (reId !== 'unassigned') members.push({ userId: reId });
    if (amId !== 'unassigned') members.push({ userId: amId });
    if (aeId !== 'unassigned') members.push({ userId: aeId });
    if (dcId !== 'unassigned') members.push({ userId: dcId });
    if (archId !== 'unassigned')
      members.push({ userId: archId, discipline: 'architect' });
    if (structId !== 'unassigned')
      members.push({ userId: structId, discipline: 'structure' });
    if (mepId !== 'unassigned')
      members.push({ userId: mepId, discipline: 'mep' });
    if (civilId !== 'unassigned')
      members.push({ userId: civilId, discipline: 'civil' });

    return members;
  };

  const handleProceedToStep2 = async () => {
    const valid = await trigger([
      'code',
      'name',
      'stage',
      'master_authority_id',
      'client_name',
      'contractor_name',
      'client_contractor_amount',
      'client_consultant_amount',
    ]);
    if (valid) {
      setStep(2);
    }
  };

  const submitProject = (values: ProjectFormValues, withTeam: boolean) => {
    startTransition(async () => {
      const members = withTeam ? collectMembers() : [];
      const res = await createProject({
        code: values.code,
        name: values.name,
        stage: values.stage,
        client_name: values.client_name,
        contractor_name: values.contractor_name,
        client_emails: parseEmails(values.client_emails),
        contractor_emails: parseEmails(values.contractor_emails),
        client_contractor_amount: values.client_contractor_amount,
        client_consultant_amount: values.client_consultant_amount,
        master_authority_id: values.master_authority_id,
        description: values.name,
        members,
      });

      if (!res.ok) {
        toast.error(res.error ?? 'Failed to create project.');
        return;
      }

      toast.success(
        members.length > 0
          ? `Project ${values.code} created with ${members.length} team members.`
          : `Project ${values.code} created successfully.`,
      );
      router.push('/noc-tracker');
    });
  };

  return (
    <Card className="border-border bg-card shadow-xs">
      {/* 2-Phase Wizard Stepper */}
      <div className="flex items-center justify-between border-b border-border/80 px-6 py-3.5 bg-muted/15">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              step === 1
                ? 'bg-(--site-cyan) text-white'
                : 'bg-(--site-cyan)/20 text-(--site-cyan)',
            )}
          >
            1
          </div>
          <span
            className={cn(
              'text-xs transition-colors',
              step === 1
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground',
            )}
          >
            Phase 1: Scope & Commercials
          </span>
        </div>

        <div className="h-px w-8 bg-border sm:w-16" />

        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              step === 2
                ? 'bg-(--site-cyan) text-white'
                : 'bg-muted text-muted-foreground',
            )}
          >
            2
          </div>
          <span
            className={cn(
              'text-xs transition-colors',
              step === 2
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground',
            )}
          >
            Phase 2: Consultant Staffing (Optional)
          </span>
        </div>
      </div>

      <form noValidate>
        {step === 1 ? (
          <>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Project Metadata & Stakeholders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Project Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g. 23017"
                    aria-invalid={!!errors.code}
                    {...register('code')}
                  />
                  {errors.code && (
                    <p className="text-xs text-destructive">
                      {errors.code.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="masterAuthority">Master Authority</Label>
                  <Controller
                    name="master_authority_id"
                    control={control}
                    render={({ field }) => {
                      const selected = authorities.find(
                        (a) => a.id === field.value,
                      );

                      return (
                        <Select
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <SelectTrigger
                            id="masterAuthority"
                            className="w-full"
                          >
                            <SelectValue placeholder="Select Authority">
                              {selected?.name}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {authorities.map((auth) => (
                              <SelectItem key={auth.id} value={String(auth.id)}>
                                {auth.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }}
                  />
                  {errors.master_authority_id && (
                    <p className="text-xs text-destructive">
                      {errors.master_authority_id.message}
                    </p>
                  )}
                  {authorities.length === 0 && (
                    <p className="text-[11px] text-amber-500">
                      No authorities found.{' '}
                      <Link
                        href={'/authorities' as Route}
                        className="underline hover:text-amber-400"
                      >
                        Register one first
                      </Link>
                      .
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="stage">Initial Stage</Label>
                  <Controller
                    name="stage"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="stage" className="w-full">
                          <SelectValue>
                            {STAGE_LABELS[field.value] ?? field.value}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STAGE_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.stage && (
                    <p className="text-xs text-destructive">
                      {errors.stage.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name / Description</Label>
                <Input
                  id="name"
                  placeholder="e.g. CVTEC Commercial Tower & Hotel"
                  aria-invalid={!!errors.name}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g. Dubai Holding"
                    aria-invalid={!!errors.client_name}
                    {...register('client_name')}
                  />
                  {errors.client_name && (
                    <p className="text-xs text-destructive">
                      {errors.client_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractorName">Contractor Name</Label>
                  <Input
                    id="contractorName"
                    placeholder="e.g. Al Naboodah Contracting"
                    aria-invalid={!!errors.contractor_name}
                    {...register('contractor_name')}
                  />
                  {errors.contractor_name && (
                    <p className="text-xs text-destructive">
                      {errors.contractor_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="clientEmails">
                    Client Notification Emails
                  </Label>
                  <Input
                    id="clientEmails"
                    placeholder="pm@client.ae, director@client.ae"
                    {...register('client_emails')}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Comma-separated emails for automated alerts.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractorEmails">
                    Contractor Notification Emails
                  </Label>
                  <Input
                    id="contractorEmails"
                    placeholder="project@contractor.ae"
                    {...register('contractor_emails')}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Comma-separated emails for automated alerts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label htmlFor="contractorAmount">
                    Client–Contractor Contract Sum (AED)
                  </Label>
                  <Input
                    id="contractorAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    aria-invalid={!!errors.client_contractor_amount}
                    {...register('client_contractor_amount', {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.client_contractor_amount ? (
                    <p className="text-xs text-destructive">
                      {errors.client_contractor_amount.message}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Visible to internal project team.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="consultantAmount">
                    Client–Consultant Sum (AED) [Confidential]
                  </Label>
                  <Input
                    id="consultantAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    aria-invalid={!!errors.client_consultant_amount}
                    {...register('client_consultant_amount', {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.client_consultant_amount ? (
                    <p className="text-xs text-destructive">
                      {errors.client_consultant_amount.message}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Restricted to Admin, CEO, and Area Manager.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center border-t border-border py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={pending}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSubmit((vals) => submitProject(vals, false))}
                  disabled={pending}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Quick Register (Skip Staffing)
                </Button>
                <Button
                  type="button"
                  onClick={handleProceedToStep2}
                  disabled={pending}
                  className="bg-(--site-cyan) hover:bg-(--site-cyan-hover) text-white"
                >
                  Next: Assign Team
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </div>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-(--site-cyan)/10 text-(--site-cyan)">
                  <Users className="size-4" />
                </span>
                <CardTitle className="text-base font-semibold">
                  Consultant Team Staffing
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Assign registered staff to oversight and discipline engineering
                roles for project{' '}
                <span className="font-semibold text-foreground">
                  {projectCode || 'New Project'}
                </span>
                .
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Context Project Summary */}
              <div className="rounded-md border border-border bg-muted/20 p-3 text-xs flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="truncate">
                  <span className="font-semibold text-foreground">
                    {projectCode || '—'}
                  </span>{' '}
                  <span className="text-muted-foreground truncate">
                    {projectName || '—'}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  Staffing can be adjusted anytime via Projects Directory.
                </span>
              </div>

              {/* Management & Permitting Oversight */}
              <div className="rounded-md border border-border bg-muted/10 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  Management & Permitting Oversight
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="re-select" className="text-xs">
                      Resident Engineer (RE)
                    </Label>
                    <Select
                      value={reId}
                      onValueChange={(val) => setReId(val ?? 'unassigned')}
                    >
                      <SelectTrigger
                        id="re-select"
                        className="w-full h-9 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOptionsForRole('resident_engineer').map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="am-select" className="text-xs">
                      Area Manager (AM)
                    </Label>
                    <Select
                      value={amId}
                      onValueChange={(val) => setAmId(val ?? 'unassigned')}
                    >
                      <SelectTrigger
                        id="am-select"
                        className="w-full h-9 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOptionsForRole('area_manager').map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ae-select" className="text-xs">
                      Authority Engineer
                    </Label>
                    <Select
                      value={aeId}
                      onValueChange={(val) => setAeId(val ?? 'unassigned')}
                    >
                      <SelectTrigger
                        id="ae-select"
                        className="w-full h-9 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOptionsForRole('authority_engineer').map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dc-select" className="text-xs">
                      Document Controller (DC)
                    </Label>
                    <Select
                      value={dcId}
                      onValueChange={(val) => setDcId(val ?? 'unassigned')}
                    >
                      <SelectTrigger
                        id="dc-select"
                        className="w-full h-9 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOptionsForRole('dc').map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Multidisciplinary Engineering Leads */}
              <div className="rounded-md border border-border bg-muted/10 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <HardHat className="size-3.5 text-muted-foreground" />
                  Multidisciplinary Engineering Leads
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="arch-select" className="text-xs">
                      Architectural Lead
                    </Label>
                    <Select
                      value={archId}
                      onValueChange={(val) => setArchId(val ?? 'unassigned')}
                    >
                      <SelectTrigger
                        id="arch-select"
                        className="w-full h-9 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOptionsForRole('engineer').map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="struct-select" className="text-xs">
                      Structural Lead
                    </Label>
                    <Select
                      value={structId}
                      onValueChange={(val) => setStructId(val ?? 'unassigned')}
                    >
                      <SelectTrigger
                        id="struct-select"
                        className="w-full h-9 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOptionsForRole('engineer').map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mep-select" className="text-xs">
                      MEP Lead
                    </Label>
                    <Select
                      value={mepId}
                      onValueChange={(val) => setMepId(val ?? 'unassigned')}
                    >
                      <SelectTrigger
                        id="mep-select"
                        className="w-full h-9 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOptionsForRole('engineer').map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="civil-select" className="text-xs">
                      Civil Lead
                    </Label>
                    <Select
                      value={civilId}
                      onValueChange={(val) => setCivilId(val ?? 'unassigned')}
                    >
                      <SelectTrigger
                        id="civil-select"
                        className="w-full h-9 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getOptionsForRole('engineer').map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="text-xs"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center border-t border-border py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={pending}
              >
                <ArrowLeft className="mr-1.5 size-4" />
                Back to Scope
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSubmit((vals) => submitProject(vals, false))}
                  disabled={pending}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip Staffing & Register
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit((vals) => submitProject(vals, true))}
                  disabled={pending}
                  className="bg-(--site-cyan) hover:bg-(--site-cyan-hover) text-white"
                >
                  {pending ? 'Registering...' : 'Register Project with Team'}
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </form>
    </Card>
  );
}
