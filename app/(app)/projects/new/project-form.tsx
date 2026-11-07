'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronDown,
  Hash,
  HardHat,
  Loader2,
} from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
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
  createProject,
  getNextProjectCode,
  checkProjectCodeAvailability,
} from '@/app/actions/admin';
import type { MasterAuthorityRecord } from '@/types/noc';
import {
  TeamAssignmentFields,
  type ProfileItem,
} from '@/components/projects/team-assignment-fields';
import {
  collectMembers,
  createEmptyTeam,
  type TeamAssignment,
} from '@/lib/team-assignment';
import { useProjectModal } from '@/components/projects/project-dialog-modal';

const STAGE_LABELS = {
  planning: 'Planning',
  design: 'Pre-Construction (Design)',
  construction: 'Construction',
  handover: 'Handover',
  completed: 'Completed',
} satisfies Record<string, string>;

const STEP_LABELS = ['Project details', 'Team (optional)'] as const;

const parseEmails = (str?: string) =>
  (str ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmailList = (emails?: string) =>
  parseEmails(emails).every((e) => EMAIL_REGEX.test(e));

const PARTY_STYLES = {
  client: {
    label: 'Client',
    Icon: Building2,
    chip: 'border-sky-600/30 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-950/40 dark:text-sky-300',
  },
  contractor: {
    label: 'Contractor',
    Icon: HardHat,
    chip: 'border-amber-600/30 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-300',
  },
} as const;

const projectSchema = z
  .object({
    code: z.string().trim().min(1, 'Project code is required.'),
    name: z.string().trim().min(1, 'Project name is required.'),
    summary: z.string().max(500, 'Description must be 500 characters or fewer.'),
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

interface FieldProps {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: string;
  children: ReactNode;
}

// Label, control, and a single error-or-hint line.
function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

interface OptionalSectionProps {
  title: string;
  forceOpen: boolean;
  children: ReactNode;
}

// Collapsed by default; opens itself when it holds a validation error.
function OptionalSection({ title, forceOpen, children }: OptionalSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <details
      open={open || forceOpen}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group rounded-md border border-border"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span>
          {title}{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border p-3">{children}</div>
    </details>
  );
}

// Party-tinted label with icon so client and contractor fields read as separate.
function PartyLabel({ party, text }: { party: keyof typeof PARTY_STYLES; text: string }) {
  const { Icon, chip } = PARTY_STYLES[party];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('flex size-5 items-center justify-center rounded border', chip)}>
        <Icon className="size-3" aria-hidden />
      </span>
      {text}
    </span>
  );
}

// One chip per parsed address; invalid ones get a red border and warning icon.
function EmailChips({ party, value }: { party: keyof typeof PARTY_STYLES; value?: string }) {
  const emails = parseEmails(value);
  if (emails.length === 0) return null;
  const { label, Icon, chip } = PARTY_STYLES[party];

  return (
    <ul aria-label={`${label} recipients`} className="flex flex-wrap gap-1.5">
      {emails.map((email, i) => {
        const valid = EMAIL_REGEX.test(email);
        const ChipIcon = valid ? Icon : AlertTriangle;
        return (
          <li
            key={`${email}-${i}`}
            className={cn(
              'inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-xs',
              valid ? chip : 'border-destructive/40 bg-destructive/10 text-destructive',
            )}
          >
            <ChipIcon className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{email}</span>
            {!valid && <span className="sr-only">(invalid address)</span>}
          </li>
        );
      })}
    </ul>
  );
}

function AmountInput({
  error,
  ...props
}: React.ComponentProps<typeof Input> & { error?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-medium text-muted-foreground">
        AED
      </span>
      <Input
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        className="pl-12 font-mono text-xs"
        aria-invalid={!!error}
        onFocus={(e) => {
          if (e.target.value === '0') e.target.select();
        }}
        {...props}
      />
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
  const [step, setStep] = useState<1 | 2>(1);
  const [team, setTeam] = useState<TeamAssignment>(createEmptyTeam);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [initialAutoCode, setInitialAutoCode] = useState<string | null>(null);
  const [codeAvailability, setCodeAvailability] = useState<{
    checked: boolean;
    available?: boolean;
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
      summary: '',
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
  const summary = useWatch({ control, name: 'summary' });
  const clientEmails = useWatch({ control, name: 'client_emails' });
  const contractorEmails = useWatch({ control, name: 'contractor_emails' });

  const members = collectMembers(team);

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

  const isFormDirty = isDirty || step > 1 || members.length > 0 || hasFilledText;

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
        setCodeAvailability({ checked: true, available: true });
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
      setCodeAvailability({ checked: true, available: res.available });
    }
  };

  // Pre-populate next sequential code if blank on mount
  useEffect(() => {
    if (!projectCode) {
      getNextProjectCode().then((res) => {
        if (res.ok && res.code) {
          setValue('code', res.code, { shouldValidate: true, shouldDirty: false });
          setInitialAutoCode(res.code);
          setCodeAvailability({ checked: true, available: true });
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

  const handleProceedToStep2 = async () => {
    if (await trigger()) setStep(2);
  };

  const submitProject = (values: ProjectFormValues, withTeam: boolean) => {
    startTransition(async () => {
      const teamMembers = withTeam ? members : [];
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
        summary: values.summary,
        members: teamMembers,
      });

      if (!res.ok) {
        toast.error(res.error ?? 'Failed to create project.');
        return;
      }

      setIsSubmitted(true);
      modalContext?.setIsDirty(false);

      toast.success(
        teamMembers.length > 0
          ? `Project ${values.code} created with ${teamMembers.length} team members.`
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
  const Container = isModal ? 'div' : Card;

  return (
    <>
      <Container
        className={cn('space-y-5', !isModal && 'border-border bg-card p-6 shadow-xs')}
      >
        <div className="space-y-1.5" aria-label="Registration progress">
          <p className="text-xs text-muted-foreground">
            Step {step} of 2 ·{' '}
            <span className="font-medium text-foreground">
              {STEP_LABELS[step - 1]}
            </span>
          </p>
          <div className="flex gap-1" aria-hidden>
            {[1, 2].map((n) => (
              <div
                key={n}
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  n <= step ? 'bg-primary' : 'bg-border',
                )}
              />
            ))}
          </div>
        </div>

        <form noValidate className="space-y-5">
          {step === 1 ? (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field
                    id="code"
                    label="Project code"
                    error={errors.code?.message}
                    hint={
                      codeAvailability.checked
                        ? codeAvailability.available
                          ? 'Code available.'
                          : 'Code already in use.'
                        : undefined
                    }
                  >
                    <div className="relative">
                      <Input
                        id="code"
                        placeholder="e.g. 26004"
                        className="pr-9 font-mono text-xs tracking-wider"
                        aria-invalid={
                          !!errors.code ||
                          (codeAvailability.checked && !codeAvailability.available)
                        }
                        {...register('code', {
                          onBlur: (e) => handleCheckCodeAvailability(e.target.value),
                        })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleAutoGenerateCode}
                        disabled={isGeneratingCode || pending}
                        aria-label="Generate next project code"
                        title="Generate next project code"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        {isGeneratingCode ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Hash className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </Field>

                  <Field
                    id="masterAuthority"
                    label="Master authority"
                    error={errors.master_authority_id?.message}
                  >
                    <Controller
                      name="master_authority_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(Number(v))}
                        >
                          <SelectTrigger id="masterAuthority" className="w-full">
                            <SelectValue placeholder="Select authority">
                              {authorities.find((a) => a.id === field.value)?.name}
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
                      )}
                    />
                    {authorities.length === 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        No authorities found.{' '}
                        <Link
                          href={'/authorities' as Route}
                          className="underline"
                        >
                          Register one first
                        </Link>
                        .
                      </p>
                    )}
                  </Field>

                  <Field id="stage" label="Initial stage" error={errors.stage?.message}>
                    <Controller
                      name="stage"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
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
                  </Field>
                </div>

                <Field id="name" label="Project name" error={errors.name?.message}>
                  <Input
                    id="name"
                    placeholder="e.g. Commercial Tower & Hotel"
                    aria-invalid={!!errors.name}
                    {...register('name')}
                  />
                </Field>

                <Field
                  id="summary"
                  label={
                    <>
                      Description{' '}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </>
                  }
                  error={errors.summary?.message}
                  hint={`${(summary ?? '').length}/500 · Scope or notes, separate from the name.`}
                >
                  <Textarea
                    id="summary"
                    rows={2}
                    maxLength={500}
                    placeholder="e.g. 42-storey mixed-use tower with podium parking"
                    className="min-h-0 resize-none text-sm"
                    aria-invalid={!!errors.summary}
                    {...register('summary')}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    id="clientName"
                    label="Client"
                    error={errors.client_name?.message}
                  >
                    <Input
                      id="clientName"
                      placeholder="e.g. Dubai Holding"
                      aria-invalid={!!errors.client_name}
                      {...register('client_name')}
                    />
                  </Field>
                  <Field
                    id="contractorName"
                    label="Contractor"
                    error={errors.contractor_name?.message}
                  >
                    <Input
                      id="contractorName"
                      placeholder="e.g. Al Naboodah Contracting"
                      aria-invalid={!!errors.contractor_name}
                      {...register('contractor_name')}
                    />
                  </Field>
                </div>
              </div>

              <div className="space-y-2">
                <OptionalSection
                  title="Contract values and dates"
                  forceOpen={Boolean(
                    errors.client_contractor_amount ||
                      errors.client_consultant_amount ||
                      errors.design_completion_date ||
                      errors.supervision_completion_date,
                  )}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      id="contractorAmount"
                      label="Contractor contract sum"
                      error={errors.client_contractor_amount?.message}
                    >
                      <AmountInput
                        id="contractorAmount"
                        error={errors.client_contractor_amount?.message}
                        {...register('client_contractor_amount', {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Field
                      id="consultantAmount"
                      label="Consultant contract sum"
                      error={errors.client_consultant_amount?.message}
                      hint="Visible to Admin, CEO, and Area Manager only."
                    >
                      <AmountInput
                        id="consultantAmount"
                        error={errors.client_consultant_amount?.message}
                        {...register('client_consultant_amount', {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Field id="designStart" label="Design commencement">
                      <Input
                        id="designStart"
                        type="date"
                        className="h-9 text-xs"
                        {...register('design_commencement_date')}
                      />
                    </Field>
                    <Field
                      id="designEnd"
                      label="Design completion"
                      error={errors.design_completion_date?.message}
                    >
                      <Input
                        id="designEnd"
                        type="date"
                        className="h-9 text-xs"
                        aria-invalid={!!errors.design_completion_date}
                        {...register('design_completion_date')}
                      />
                    </Field>
                    <Field id="supervisionStart" label="Supervision commencement">
                      <Input
                        id="supervisionStart"
                        type="date"
                        className="h-9 text-xs"
                        {...register('supervision_commencement_date')}
                      />
                    </Field>
                    <Field
                      id="supervisionEnd"
                      label="Supervision completion"
                      error={errors.supervision_completion_date?.message}
                    >
                      <Input
                        id="supervisionEnd"
                        type="date"
                        className="h-9 text-xs"
                        aria-invalid={!!errors.supervision_completion_date}
                        {...register('supervision_completion_date')}
                      />
                    </Field>
                  </div>
                </OptionalSection>

                <OptionalSection
                  title="Notification emails"
                  forceOpen={Boolean(
                    errors.client_emails || errors.contractor_emails,
                  )}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      id="clientEmails"
                      label={<PartyLabel party="client" text="Client emails" />}
                      error={errors.client_emails?.message}
                    >
                      <Input
                        id="clientEmails"
                        placeholder="pm@client.ae, director@client.ae"
                        aria-invalid={!!errors.client_emails}
                        {...register('client_emails')}
                      />
                      <EmailChips party="client" value={clientEmails} />
                    </Field>
                    <Field
                      id="contractorEmails"
                      label={<PartyLabel party="contractor" text="Contractor emails" />}
                      error={errors.contractor_emails?.message}
                    >
                      <Input
                        id="contractorEmails"
                        placeholder="project@contractor.ae"
                        aria-invalid={!!errors.contractor_emails}
                        {...register('contractor_emails')}
                      />
                      <EmailChips party="contractor" value={contractorEmails} />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Separate multiple addresses with commas. Used for automated alerts.
                  </p>
                </OptionalSection>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSubmit((vals) => submitProject(vals, false))}
                    disabled={pending}
                  >
                    {pending ? 'Registering...' : 'Register without team'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleProceedToStep2}
                    disabled={pending}
                  >
                    Next: team
                    <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">
                  {projectCode}
                </span>{' '}
                · {projectName}. Team can be changed later from the projects list.
              </p>

              <TeamAssignmentFields
                team={team}
                profiles={teamProfiles}
                onChange={(key, ids) => setTeam((t) => ({ ...t, [key]: ids }))}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={pending}
                >
                  <ArrowLeft className="mr-1.5 size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit((vals) => submitProject(vals, true))}
                  disabled={pending}
                >
                  {pending
                    ? 'Registering...'
                    : members.length > 0
                      ? `Register project (${members.length} assigned)`
                      : 'Register project'}
                </Button>
              </div>
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
