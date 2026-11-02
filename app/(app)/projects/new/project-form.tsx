'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronsUpDown,
  HardHat,
  Hash,
  Loader2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  createProject,
  getNextProjectCode,
  checkProjectCodeAvailability,
} from '@/app/actions/admin';
import type { MasterAuthorityRecord } from '@/types/noc';
import type { ProfileItem } from '@/components/projects/project-team-dialog';
import { useProjectModal } from '@/components/projects/project-dialog-modal';

const STAGE_LABELS = {
  planning: 'Planning',
  design: 'Pre-Construction (Design)',
  construction: 'Construction',
  handover: 'Handover',
  completed: 'Completed',
} satisfies Record<string, string>;

const parseEmails = (str?: string) =>
  (str ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

const validateEmailList = (emails?: string) => {
  if (!emails) return true;
  const list = parseEmails(emails);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return list.every((e) => emailRegex.test(e));
};

const projectSchema = z
  .object({
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
    design_commencement_date: z.string().optional(),
    design_completion_date: z.string().optional(),
    supervision_commencement_date: z.string().optional(),
    supervision_completion_date: z.string().optional(),
  })
  .refine((data) => validateEmailList(data.client_emails), {
    message: 'One or more client email addresses are invalid.',
    path: ['client_emails'],
  })
  .refine((data) => validateEmailList(data.contractor_emails), {
    message: 'One or more contractor email addresses are invalid.',
    path: ['contractor_emails'],
  })
  .refine(
    (data) => {
      if (data.design_commencement_date && data.design_completion_date) {
        return data.design_completion_date >= data.design_commencement_date;
      }
      return true;
    },
    {
      message: 'Design completion date cannot precede commencement date.',
      path: ['design_completion_date'],
    },
  )
  .refine(
    (data) => {
      if (
        data.supervision_commencement_date &&
        data.supervision_completion_date
      ) {
        return (
          data.supervision_completion_date >=
          data.supervision_commencement_date
        );
      }
      return true;
    },
    {
      message: 'Supervision completion date cannot precede commencement date.',
      path: ['supervision_completion_date'],
    },
  );

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectRegistrationFormProps {
  authorities?: MasterAuthorityRecord[];
  teamProfiles?: ProfileItem[];
}

const UNASSIGNED = 'unassigned';

interface StaffOption {
  id: string;
  name: string;
  role?: string;
  suggested: boolean;
}

const formatRole = (role?: string) => (role ?? '').replace(/_/g, ' ');

interface StaffSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: StaffOption[];
}

function StaffSelect({
  id,
  label,
  value,
  onChange,
  options,
}: StaffSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.id === value);
  const hasValue = value !== UNASSIGNED && !!selected;
  const suggested = options.filter((o) => o.id !== UNASSIGNED && o.suggested);
  const others = options.filter((o) => o.id !== UNASSIGNED && !o.suggested);

  const pick = (nextId: string) => {
    onChange(nextId);
    setOpen(false);
  };

  const renderItem = (o: StaffOption) => (
    <CommandItem
      key={o.id}
      value={o.id}
      keywords={[o.name, formatRole(o.role)]}
      onSelect={() => pick(o.id)}
      className="gap-2 text-xs"
    >
      <Check
        className={cn(
          'size-3.5 shrink-0',
          value === o.id ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span className="truncate">{o.name}</span>
      <span className="ml-auto shrink-0 text-xs capitalize text-muted-foreground">
        {formatRole(o.role)}
      </span>
    </CommandItem>
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-xs shadow-xs outline-none transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span
            className={cn('truncate', !hasValue && 'text-muted-foreground')}
          >
            {hasValue ? selected.name : '— Unassigned —'}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput
              placeholder="Search name or role…"
              className="text-xs"
            />
            <CommandList className="max-h-64">
              <CommandEmpty className="py-4 text-xs">
                No staff found.
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={UNASSIGNED}
                  keywords={['unassigned', 'none', 'clear']}
                  onSelect={() => pick(UNASSIGNED)}
                  className="gap-2 text-xs text-muted-foreground"
                >
                  <Check
                    className={cn(
                      'size-3.5 shrink-0',
                      value === UNASSIGNED ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  — Unassigned —
                </CommandItem>
              </CommandGroup>
              {suggested.length > 0 && (
                <CommandGroup heading="Suggested for this role">
                  {suggested.map(renderItem)}
                </CommandGroup>
              )}
              {others.length > 0 && (
                <CommandGroup heading="Other staff">
                  {others.map(renderItem)}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ProjectRegistrationForm({
  authorities = [],
  teamProfiles = [],
}: ProjectRegistrationFormProps) {
  const router = useRouter();
  const modalContext = useProjectModal();
  const [pending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showStandaloneConfirm, setShowStandaloneConfirm] = useState(false);
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
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [initialAutoCode, setInitialAutoCode] = useState<string | null>(null);
  const [codeAvailability, setCodeAvailability] = useState<{
    checked: boolean;
    available?: boolean;
    message?: string;
  }>({ checked: false });

  const {
    register,
    handleSubmit,
    control,
    trigger,
    setValue,
    formState: { errors, isDirty },
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
      design_commencement_date: '',
      design_completion_date: '',
      supervision_commencement_date: '',
      supervision_completion_date: '',
    },
  });

  const projectCode = useWatch({ control, name: 'code' });
  const projectName = useWatch({ control, name: 'name' });
  const clientName = useWatch({ control, name: 'client_name' });
  const contractorName = useWatch({ control, name: 'contractor_name' });

  const hasTeamAssignments =
    reId !== 'unassigned' ||
    amId !== 'unassigned' ||
    aeId !== 'unassigned' ||
    dcId !== 'unassigned' ||
    archId !== 'unassigned' ||
    structId !== 'unassigned' ||
    mepId !== 'unassigned' ||
    civilId !== 'unassigned';

  const hasCustomCode = Boolean(
    projectCode &&
    projectCode.trim().length > 0 &&
    projectCode !== initialAutoCode,
  );

  const hasFilledText = Boolean(
    hasCustomCode ||
    (projectName && projectName.trim().length > 0) ||
    (clientName && clientName.trim().length > 0) ||
    (contractorName && contractorName.trim().length > 0),
  );

  const isFormDirty = isDirty || step > 1 || hasTeamAssignments || hasFilledText;

  // Sync form dirty state with modal context.
  useEffect(() => {
    if (isSubmitted || pending) {
      modalContext?.setIsDirty(false);
      return;
    }
    modalContext?.setIsDirty(isFormDirty);
  }, [isFormDirty, isSubmitted, modalContext, pending]);

  // Prevent accidental tab closing or reload when unsaved data exists.
  useEffect(() => {
    if (!isFormDirty || pending || isSubmitted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty, pending, isSubmitted]);

  const handleAutoGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await getNextProjectCode();
      if (res.ok && res.code) {
        setValue('code', res.code, { shouldValidate: true, shouldDirty: true });
        setInitialAutoCode(res.code);
        setCodeAvailability({
          checked: true,
          available: true,
          message: `Auto-generated code #${res.code} is available.`,
        });
        toast.success(`Generated next project code: ${res.code}`);
      } else {
        toast.error(res.error || 'Failed to auto-generate code');
      }
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCheckCodeAvailability = async (codeToTest: string) => {
    const trimmed = codeToTest.trim();
    if (!trimmed) {
      setCodeAvailability({ checked: false });
      return;
    }
    const res = await checkProjectCodeAvailability(trimmed);
    if (res.ok) {
      setCodeAvailability({
        checked: true,
        available: res.available,
        message: res.available
          ? `Code #${trimmed} is available`
          : `Code #${trimmed} is already assigned to an existing project`,
      });
    }
  };

  // Pre-populate next sequential code if blank on mount
  useEffect(() => {
    if (!projectCode) {
      getNextProjectCode().then((res) => {
        if (res.ok && res.code) {
          setValue('code', res.code, { shouldValidate: true, shouldDirty: false });
          setInitialAutoCode(res.code);
          setCodeAvailability({
            checked: true,
            available: true,
            message: `Next available sequential code: #${res.code}`,
          });
        }
      });
    }
  }, [projectCode, setValue]);

  const handleCancel = () => {
    if (modalContext) {
      modalContext.requestClose();
    } else if (isFormDirty) {
      setShowStandaloneConfirm(true);
    } else {
      router.back();
    }
  };

  const getOptionsForRole = (primaryRole?: string): StaffOption[] => [
    { id: UNASSIGNED, name: '— Unassigned —', suggested: false },
    ...teamProfiles.map((p) => ({
      id: p.id,
      name: p.full_name || p.email || 'Unknown',
      role: p.role,
      suggested: !primaryRole || p.role === primaryRole,
    })),
  ];

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
      'client_emails',
      'contractor_emails',
      'client_contractor_amount',
      'client_consultant_amount',
      'design_commencement_date',
      'design_completion_date',
      'supervision_commencement_date',
      'supervision_completion_date',
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
        design_commencement_date: values.design_commencement_date,
        design_completion_date: values.design_completion_date,
        supervision_commencement_date: values.supervision_commencement_date,
        supervision_completion_date: values.supervision_completion_date,
        description: values.name,
        members,
      });

      if (!res.ok) {
        toast.error(res.error ?? 'Failed to create project.');
        return;
      }

      setIsSubmitted(true);
      modalContext?.setIsDirty(false);

      toast.success(
        members.length > 0
          ? `Project ${values.code} created with ${members.length} team members.`
          : `Project ${values.code} created successfully.`,
      );

      if (modalContext) {
        modalContext.closeModal();
      } else {
        router.push(res.projectId ? (`/projects/${res.projectId}` as Route) : ('/noc-tracker' as Route));
        router.refresh();
      }
    });
  };

  const isModal = Boolean(modalContext);
  const teamMembers = collectMembers();
  const teamCount = teamMembers.length;

  const Container = isModal ? 'div' : Card;
  const Header = isModal ? 'div' : CardHeader;
  const Content = isModal ? 'div' : CardContent;
  const Footer = isModal ? 'div' : CardFooter;

  return (
    <>
      <Container className={cn(isModal ? 'space-y-4' : 'border-border bg-card shadow-xs')}>
      {/* 2-Phase Wizard Stepper */}
      <div
        className={cn(
          'flex items-center justify-between border-b border-border/80 px-6 py-3.5 bg-muted/15',
          isModal && 'rounded-md border border-border/70 px-4 py-2.5',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              step === 1
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/15 text-primary',
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
                ? 'bg-primary text-primary-foreground'
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
            <Header className={cn(isModal && 'pb-1 pt-1')}>
              <CardTitle className="text-base font-semibold">
                Project Metadata & Stakeholders
              </CardTitle>
            </Header>
            <Content className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="code">Project Code</Label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateCode}
                      disabled={isGeneratingCode || pending}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      title="Auto-calculate next sequential code for current year"
                    >
                      {isGeneratingCode ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Hash className="size-3.5" />
                      )}
                      <span>{isGeneratingCode ? 'Generating...' : 'Auto-Generate'}</span>
                    </button>
                  </div>
                  <Input
                    id="code"
                    placeholder="e.g. 26004"
                    className="font-mono tracking-wider text-xs"
                    aria-invalid={!!errors.code}
                    {...register('code', {
                      onBlur: (e) => handleCheckCodeAvailability(e.target.value),
                    })}
                  />
                  {errors.code && (
                    <p className="text-xs text-destructive">
                      {errors.code.message}
                    </p>
                  )}
                  {!errors.code && codeAvailability.checked && (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        codeAvailability.available
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-destructive',
                      )}
                    >
                      {codeAvailability.message}
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
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No authorities found.{' '}
                      <Link
                        href={'/authorities' as Route}
                        className="underline hover:text-amber-500"
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
                    aria-invalid={!!errors.client_emails}
                    {...register('client_emails')}
                  />
                  {errors.client_emails ? (
                    <p className="text-xs text-destructive">
                      {errors.client_emails.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Comma-separated emails for automated alerts.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractorEmails">
                    Contractor Notification Emails
                  </Label>
                  <Input
                    id="contractorEmails"
                    placeholder="project@contractor.ae"
                    aria-invalid={!!errors.contractor_emails}
                    {...register('contractor_emails')}
                  />
                  {errors.contractor_emails ? (
                    <p className="text-xs text-destructive">
                      {errors.contractor_emails.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Comma-separated emails for automated alerts.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label htmlFor="contractorAmount">
                    Client–Contractor Contract Sum (AED)
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-muted-foreground">
                      AED
                    </span>
                    <Input
                      id="contractorAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-12 font-mono text-xs"
                      placeholder="0.00"
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      aria-invalid={!!errors.client_contractor_amount}
                      {...register('client_contractor_amount', {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  {errors.client_contractor_amount ? (
                    <p className="text-xs text-destructive">
                      {errors.client_contractor_amount.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Visible to internal project team.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="consultantAmount">
                    Client–Consultant Sum (AED) [Confidential]
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-muted-foreground">
                      AED
                    </span>
                    <Input
                      id="consultantAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-12 font-mono text-xs"
                      placeholder="0.00"
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      aria-invalid={!!errors.client_consultant_amount}
                      {...register('client_consultant_amount', {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  {errors.client_consultant_amount ? (
                    <p className="text-xs text-destructive">
                      {errors.client_consultant_amount.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Restricted to Admin, CEO, and Area Manager.
                    </p>
                  )}
                </div>
              </div>

              {/* Separate Contract Dates for Design and Supervision */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Contract Schedules & Target Dates (Optional)
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
                    <p className="text-xs font-semibold text-foreground">
                      Design Contract Dates
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="designStart" className="text-xs">
                          Commencement
                        </Label>
                        <Input
                          id="designStart"
                          type="date"
                          className="h-9 text-xs"
                          {...register('design_commencement_date')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="designEnd" className="text-xs">
                          Completion
                        </Label>
                        <Input
                          id="designEnd"
                          type="date"
                          className="h-9 text-xs"
                          aria-invalid={!!errors.design_completion_date}
                          {...register('design_completion_date')}
                        />
                      </div>
                    </div>
                    {errors.design_completion_date && (
                      <p className="text-xs text-destructive">
                        {errors.design_completion_date.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
                    <p className="text-xs font-semibold text-foreground">
                      Supervision Contract Dates
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="supervisionStart" className="text-xs">
                          Commencement
                        </Label>
                        <Input
                          id="supervisionStart"
                          type="date"
                          className="h-9 text-xs"
                          {...register('supervision_commencement_date')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="supervisionEnd" className="text-xs">
                          Target Completion
                        </Label>
                        <Input
                          id="supervisionEnd"
                          type="date"
                          className="h-9 text-xs"
                          aria-invalid={!!errors.supervision_completion_date}
                          {...register('supervision_completion_date')}
                        />
                      </div>
                    </div>
                    {errors.supervision_completion_date && (
                      <p className="text-xs text-destructive">
                        {errors.supervision_completion_date.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Content>

            <Footer className={cn(
              "flex justify-between items-center py-4",
              isModal ? "border-t border-border pt-4 pb-0" : "border-t border-border"
            )}>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
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
                >
                  Next: Assign Team
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </div>
            </Footer>
          </>
        ) : (
          <>
            <Header className={cn(
              "space-y-1",
              isModal ? "pb-2 pt-1" : ""
            )}>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users className="size-4" />
                </span>
                <CardTitle className="text-base font-semibold">
                  Consultant Team Staffing
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Assign registered staff to oversight and discipline engineering
                roles for project{' '}
                <span className="font-semibold text-foreground font-mono">
                  {projectCode || 'New Project'}
                </span>
                .
              </p>
            </Header>

            <Content className="space-y-4">
              {/* Context Project Summary */}
              <div className="rounded-md border border-border bg-muted/20 p-3 text-xs flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="truncate">
                  <span className="font-semibold text-foreground font-mono">
                    {projectCode || '—'}
                  </span>{' '}
                  <span className="text-muted-foreground truncate">
                    {projectName || '—'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
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
                  <StaffSelect
                    id="re-select"
                    label="Resident Engineer (RE)"
                    value={reId}
                    onChange={setReId}
                    options={getOptionsForRole('resident_engineer')}
                  />
                  <StaffSelect
                    id="am-select"
                    label="Area Manager (AM)"
                    value={amId}
                    onChange={setAmId}
                    options={getOptionsForRole('area_manager')}
                  />
                  <StaffSelect
                    id="ae-select"
                    label="Authority Engineer"
                    value={aeId}
                    onChange={setAeId}
                    options={getOptionsForRole('authority_engineer')}
                  />
                  <StaffSelect
                    id="dc-select"
                    label="Document Controller (DC)"
                    value={dcId}
                    onChange={setDcId}
                    options={getOptionsForRole('dc')}
                  />
                </div>
              </div>

              {/* Multidisciplinary Engineering Leads */}
              <div className="rounded-md border border-border bg-muted/10 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <HardHat className="size-3.5 text-muted-foreground" />
                  Multidisciplinary Engineering Leads
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StaffSelect
                    id="arch-select"
                    label="Architectural Lead"
                    value={archId}
                    onChange={setArchId}
                    options={getOptionsForRole('engineer')}
                  />
                  <StaffSelect
                    id="struct-select"
                    label="Structural Lead"
                    value={structId}
                    onChange={setStructId}
                    options={getOptionsForRole('engineer')}
                  />
                  <StaffSelect
                    id="mep-select"
                    label="MEP Lead"
                    value={mepId}
                    onChange={setMepId}
                    options={getOptionsForRole('engineer')}
                  />
                  <StaffSelect
                    id="civil-select"
                    label="Civil Lead"
                    value={civilId}
                    onChange={setCivilId}
                    options={getOptionsForRole('engineer')}
                  />
                </div>
              </div>
            </Content>

            <Footer className={cn(
              "flex justify-between items-center py-4",
              isModal ? "border-t border-border pt-4 pb-0" : "border-t border-border"
            )}>
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
                  onClick={handleSubmit((vals) => submitProject(vals, true))}
                  disabled={pending}
                >
                  {pending
                    ? 'Registering...'
                    : teamCount > 0
                    ? `Register Project (${teamCount} Assigned)`
                    : 'Register Project'}
                </Button>
              </div>
            </Footer>
          </>
        )}
      </form>
    </Container>

    {!modalContext && (
      <Dialog
        open={showStandaloneConfirm}
        disablePointerDismissal
        onOpenChange={(open) => {
          if (!open) setShowStandaloneConfirm(false);
        }}
      >
        <DialogContent className="sm:max-w-md z-[60]" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              <DialogTitle>Discard Unsaved Project?</DialogTitle>
            </div>
            <DialogDescription>
              You have unsaved changes in this project registration form. Exiting now will discard all entered details and team assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowStandaloneConfirm(false)}
            >
              Continue Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setShowStandaloneConfirm(false);
                router.back();
              }}
            >
              Discard and Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
