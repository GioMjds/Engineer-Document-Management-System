'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Coins,
  Info,
  ListChecks,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  createMatrixItem,
  saveMatrixItem,
  createReviewingAuthority,
} from '@/app/(app)/noc-matrix/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getAvailablePrerequisites } from '@/lib/noc-matrix';
import { cn } from '@/lib/utils';
import type {
  NocMatrixItem,
  NocStage,
  ReviewingAuthorityRecord,
  SubmittedBy,
} from '@/types/noc';

export interface MatrixItemEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: NocMatrixItem | null;
  allAuthorityItems?: NocMatrixItem[];
  allItems?: NocMatrixItem[];
  masterAuthorityId: number;
  canEdit?: boolean;
  currentUserRole?: string;
  availableReviewingAuthorities?: ReviewingAuthorityRecord[];
  onReviewingAuthorityCreated?: (newAuth: ReviewingAuthorityRecord) => void;
  onSaveSuccess?: (
    savedItem: NocMatrixItem,
    projectsUpdated?: number,
    nocsUpdated?: number,
  ) => void;
  onSaved?: () => void;
}

const STAGES = [
  'Design NOC',
  'Construction NOC',
  'Information NOC',
  'Handover NOC',
] satisfies NocStage[];

const SUBMITTERS = [
  'Consultant',
  'Client',
  'Contractor',
  'Specialists',
] satisfies SubmittedBy[];

/**
 * NOTE: the DB id is stored as `reqId`, not `id`. useFieldArray reserves `id`
 * as its internal React key and will clobber a custom `id` field.
 */
interface RequirementField {
  reqId?: string;
  title: string;
  mandatory: boolean;
}

interface MatrixItemFormValues {
  description: string;
  reviewingAuthority: string;
  stage: NocStage;
  submittedBy: SubmittedBy;
  blockingSequenceNo: string; // 'none' | String(sequenceNo)
  defaultFee: number;
  validityDays: number;
  requirements: RequirementField[];
  changeSummary: string;
}

interface AddAuthorityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: ReviewingAuthorityRecord) => void;
}

function AddAuthorityForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (created: ReviewingAuthorityRecord) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({ defaultValues: { name: '' } });

  const name = useWatch({ control, name: 'name' });

  const onSubmit = async ({ name }: { name: string }) => {
    const res = await createReviewingAuthority({ name: name.trim() });

    if (!res.ok || !res.data) {
      toast.error(res.error || 'Failed to add reviewing authority');
      return;
    }

    onCreated(res.data);
    toast.success(`Reviewing Authority "${res.data.name}" registered.`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new-rev-auth-name" className="text-xs font-semibold">
          Authority Name / Department{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="new-rev-auth-name"
          placeholder="e.g. Etihad Rail, ADDC, Tadweer"
          aria-invalid={!!errors.name}
          className="h-8 text-xs"
          {...register('name', {
            validate: (v) => v.trim().length > 0 || 'Name is required.',
          })}
        />
        {errors.name && (
          <p className="text-[11px] text-destructive">{errors.name.message}</p>
        )}
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-xs h-8 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !name?.trim()}
          className="bg-(--site-cyan) text-white hover:bg-(--site-cyan-hover) text-xs h-8 cursor-pointer gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Registering...</span>
            </>
          ) : (
            <span>Register Authority</span>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddAuthorityDialog({
  open,
  onOpenChange,
  onCreated,
}: AddAuthorityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register Reviewing Authority</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so form state resets on every open. */}
        <AddAuthorityForm
          onCancel={() => onOpenChange(false)}
          onCreated={(created) => {
            onCreated(created);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main drawer form                                                          */
/* -------------------------------------------------------------------------- */

function MatrixItemEditorDrawerForm({
  isOpen,
  onClose,
  item,
  allAuthorityItems,
  allItems,
  masterAuthorityId,
  canEdit = true,
  currentUserRole,
  availableReviewingAuthorities,
  onReviewingAuthorityCreated,
  onSaveSuccess,
  onSaved,
}: MatrixItemEditorDrawerProps) {
  const effectiveCanEdit =
    canEdit &&
    (currentUserRole
      ? ['admin', 'authority_engineer', 'dc'].includes(currentUserRole)
      : true);

  const itemsList = allAuthorityItems || allItems || [];
  const currentSeq = item ? item.sequenceNo : itemsList.length + 1;
  const availablePrerequisites = getAvailablePrerequisites(
    itemsList,
    currentSeq,
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<MatrixItemFormValues>({
    mode: 'onChange',
    // The wrapper remounts this component per item (see formKey below),
    // so defaultValues are always fresh and no reset() is needed.
    defaultValues: {
      description: item?.description ?? '',
      reviewingAuthority:
        item?.reviewingAuthority ??
        availableReviewingAuthorities?.[0]?.name ??
        '',
      stage: item?.stage ?? 'Design NOC',
      submittedBy: item?.submittedBy ?? 'Consultant',
      blockingSequenceNo:
        item?.blockingSequenceNo !== null &&
        item?.blockingSequenceNo !== undefined
          ? String(item.blockingSequenceNo)
          : 'none',
      defaultFee: item?.defaultFee ?? 0,
      validityDays: item?.validityDays ?? 365,
      requirements: (item?.requirements ?? []).map((r) => ({
        reqId: r.id,
        title: r.title,
        mandatory: r.mandatory,
      })),
      changeSummary: '',
    },
  });

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'requirements',
  });

  const changeSummary = useWatch({ control, name: 'changeSummary' }) ?? '';

  // Local UI state (not form data): the inline "add requirement" input.
  const [newReqTitle, setNewReqTitle] = useState('');

  // Reviewing-authority creation (UI state, not form data).
  const [isAddRevAuthOpen, setIsAddRevAuthOpen] = useState(false);
  const [createdAuthorities, setCreatedAuthorities] = useState<
    ReviewingAuthorityRecord[]
  >([]);

  const authorityOptions = useMemo(() => {
    const combined = [
      ...(availableReviewingAuthorities || []),
      ...createdAuthorities,
    ];
    const seen = new Set<string>();
    const result: ReviewingAuthorityRecord[] = [];
    for (const a of combined) {
      const key = a.name.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(a);
      }
    }
    return result;
  }, [availableReviewingAuthorities, createdAuthorities]);

  const handleAuthorityCreated = (created: ReviewingAuthorityRecord) => {
    setCreatedAuthorities((prev) =>
      prev.some((a) => a.id === created.id) ? prev : [...prev, created],
    );
    setValue('reviewingAuthority', created.name, {
      shouldDirty: true,
      shouldValidate: true,
    });
    onReviewingAuthorityCreated?.(created);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddRequirement = () => {
    const title = newReqTitle.trim();
    if (!title) return;
    append({
      reqId: `draft-req-${Date.now()}-${fields.length + 1}`,
      title,
      mandatory: true,
    });
    setNewReqTitle('');
  };

  const handleToggleMandatory = (index: number) => {
    if (!effectiveCanEdit) return;
    update(index, { ...fields[index], mandatory: !fields[index].mandatory });
  };

  const handleRemoveRequirement = (index: number) => {
    if (!effectiveCanEdit) return;
    remove(index);
  };

  const onSubmit = async (values: MatrixItemFormValues) => {
    if (!effectiveCanEdit) return;

    try {
      const trimmedDescription = values.description.trim();
      const trimmedChangeSummary = values.changeSummary.trim();
      const parsedBlocking =
        values.blockingSequenceNo === 'none'
          ? null
          : Number(values.blockingSequenceNo);

      const formattedReqs = values.requirements.map((r, i) => ({
        id: r.reqId,
        title: r.title.trim(),
        mandatory: r.mandatory,
        sortOrder: i + 1,
      }));

      const selectedRevAuth = authorityOptions.find(
        (a) => a.name.toLowerCase() === values.reviewingAuthority.toLowerCase(),
      );
      const revAuthId = selectedRevAuth?.id ?? item?.reviewingAuthorityId;

      const payload = {
        masterAuthorityId,
        description: trimmedDescription,
        stage: values.stage,
        reviewingAuthorityId: revAuthId,
        reviewingAuthority: values.reviewingAuthority,
        submittedBy: values.submittedBy,
        blockingSequenceNo: parsedBlocking,
        defaultFee: values.defaultFee,
        validityDays: values.validityDays,
        requirements: formattedReqs,
        changeSummary: trimmedChangeSummary,
      };

      if (item) {
        // Edit existing blueprint item.
        const res = await saveMatrixItem({ matrixItemId: item.id, ...payload });

        if (!res.ok) {
          toast.error(res.error || 'Failed to update statutory blueprint.');
          return;
        }

        const projectsCount = res.data?.projectsUpdated ?? 0;
        const nocsCount = res.data?.nocsUpdated ?? 0;

        const updatedItem: NocMatrixItem = {
          ...item,
          description: trimmedDescription,
          stage: values.stage,
          reviewingAuthorityId: revAuthId ?? item.reviewingAuthorityId ?? 0,
          reviewingAuthority: values.reviewingAuthority,
          submittedBy: values.submittedBy,
          blockingSequenceNo: parsedBlocking,
          defaultFee: values.defaultFee,
          validityDays: values.validityDays,
          requirements: formattedReqs.map((r, i) => ({
            id: r.id || `req-${Date.now()}-${i}`,
            matrixItemId: item.id,
            title: r.title,
            mandatory: r.mandatory,
            sortOrder: r.sortOrder,
          })),
          updatedAt: new Date().toISOString(),
        };

        toast.success(
          `NOC #${item.sequenceNo} blueprint updated. Propagated to ${projectsCount} active ${
            projectsCount === 1 ? 'project' : 'projects'
          } (${nocsCount} NOCs).`,
        );

        onSaveSuccess?.(updatedItem, projectsCount, nocsCount);
        onSaved?.();
        onClose();
      } else {
        // Create new blueprint item.
        const res = await createMatrixItem(payload);

        if (!res.ok || !res.data) {
          toast.error(res.error || 'Failed to create statutory blueprint.');
          return;
        }

        toast.success(
          `Standard NOC #${res.data.sequenceNo} added and propagated to active projects.`,
        );

        onSaveSuccess?.(res.data, 0, 0);
        onSaved?.();
        onClose();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unexpected error during save';
      toast.error(msg);
    }
  };

  const fieldsDisabled = !effectiveCanEdit || isSubmitting;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer aside */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={item ? `Edit NOC: ${item.description}` : 'Add Standard NOC'}
        className="fixed inset-y-0 right-0 z-40 w-full sm:w-120 bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="p-4 border-b border-border bg-muted/40 shrink-0 flex items-center justify-between">
          <div className="space-y-0.5 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border">
                {item ? `Seq #${item.sequenceNo}` : `Seq #${currentSeq}`}
              </span>
              <h2 className="text-sm font-semibold text-foreground truncate">
                {item ? 'Edit NOC Blueprint' : 'Add Standard NOC Blueprint'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {item
                ? item.description
                : 'Configure statutory approval baseline and sequence requirements'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Read-Only Notice if user cannot edit */}
        {!effectiveCanEdit && (
          <div
            role="status"
            className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 shrink-0"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="font-medium">
              Read-Only View: Editing is reserved for Authority Engineers and
              Document Controllers.
            </p>
          </div>
        )}

        {/* Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-4 text-xs">
            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="matrix-item-description"
                className="text-xs font-semibold"
              >
                NOC Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="matrix-item-description"
                placeholder="e.g. Master Developer Concept & Architectural Clearance"
                disabled={fieldsDisabled}
                aria-invalid={!!errors.description}
                className="min-h-16 text-xs resize-none"
                {...register('description', {
                  validate: (v) =>
                    v.trim().length >= 3 ||
                    'NOC description must be at least 3 characters.',
                })}
              />
              {errors.description ? (
                <p className="text-[11px] text-destructive">
                  {errors.description.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Official permit or clearance title published to project NOC
                  registers.
                </p>
              )}
            </div>

            {/* Authority & Stage Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Reviewing Authority */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="matrix-item-authority"
                    className="text-xs font-semibold"
                  >
                    Reviewing Authority{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  {effectiveCanEdit && (
                    <button
                      type="button"
                      onClick={() => setIsAddRevAuthOpen(true)}
                      className="text-[11px] font-semibold text-(--site-cyan) hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New</span>
                    </button>
                  )}
                </div>
                <Controller
                  control={control}
                  name="reviewingAuthority"
                  rules={{ required: 'Select a reviewing authority.' }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => val && field.onChange(val)}
                      disabled={fieldsDisabled}
                    >
                      <SelectTrigger
                        id="matrix-item-authority"
                        className="w-full h-8 text-xs bg-card"
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Select authority" />
                      </SelectTrigger>
                      <SelectContent>
                        {authorityOptions.map((auth) => (
                          <SelectItem
                            key={auth.id}
                            value={auth.name}
                            className="text-xs"
                          >
                            {auth.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.reviewingAuthority && (
                  <p className="text-[11px] text-destructive">
                    {errors.reviewingAuthority.message}
                  </p>
                )}
              </div>

              {/* Stage */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="matrix-item-stage"
                  className="text-xs font-semibold"
                >
                  Project Stage <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="stage"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) =>
                        val && field.onChange(val as NocStage)
                      }
                      disabled={fieldsDisabled}
                    >
                      <SelectTrigger
                        id="matrix-item-stage"
                        className="w-full h-8 text-xs bg-card"
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Submitter & Prerequisite Sequence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Submitted By */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="matrix-item-submitter"
                  className="text-xs font-semibold"
                >
                  Submitted By <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="submittedBy"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) =>
                        val && field.onChange(val as SubmittedBy)
                      }
                      disabled={fieldsDisabled}
                    >
                      <SelectTrigger
                        id="matrix-item-submitter"
                        className="w-full h-8 text-xs bg-card"
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Select submitter" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBMITTERS.map((sub) => (
                          <SelectItem key={sub} value={sub} className="text-xs">
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Prerequisite Sequence */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="matrix-item-prereq"
                  className="text-xs font-semibold"
                >
                  Prerequisite Sequence
                </Label>
                <Controller
                  control={control}
                  name="blockingSequenceNo"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => val && field.onChange(val)}
                      disabled={fieldsDisabled}
                    >
                      <SelectTrigger
                        id="matrix-item-prereq"
                        className="w-full h-8 text-xs bg-card"
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Select prerequisite" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">
                          None / Independent
                        </SelectItem>
                        {availablePrerequisites.map((p) => (
                          <SelectItem
                            key={p.sequenceNo}
                            value={String(p.sequenceNo)}
                            className="text-xs font-mono"
                          >
                            #{p.sequenceNo} {p.reviewingAuthority} -{' '}
                            {p.description.slice(0, 24)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Default Fee & Validity Days */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="matrix-item-fee"
                  className="text-xs font-semibold"
                >
                  Default Fee (AED) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="matrix-item-fee"
                    type="number"
                    min={0}
                    step={100}
                    disabled={fieldsDisabled}
                    aria-invalid={!!errors.defaultFee}
                    className="h-8 pl-8 text-xs font-mono"
                    {...register('defaultFee', {
                      valueAsNumber: true,
                      validate: (v) =>
                        (Number.isFinite(v) && v >= 0) ||
                        'Default fee must be 0 or more.',
                    })}
                  />
                </div>
                {errors.defaultFee && (
                  <p className="text-[11px] text-destructive">
                    {errors.defaultFee.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="matrix-item-validity"
                  className="text-xs font-semibold"
                >
                  Validity Period (Days){' '}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="matrix-item-validity"
                    type="number"
                    min={1}
                    disabled={fieldsDisabled}
                    aria-invalid={!!errors.validityDays}
                    className="h-8 pl-8 text-xs font-mono"
                    {...register('validityDays', {
                      valueAsNumber: true,
                      validate: (v) =>
                        (Number.isFinite(v) && v >= 1) ||
                        'Validity period must be at least 1 day.',
                    })}
                  />
                </div>
                {errors.validityDays && (
                  <p className="text-[11px] text-destructive">
                    {errors.validityDays.message}
                  </p>
                )}
              </div>
            </div>

            {/* Statutory Requirements Checklist Builder */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-(--site-cyan)" />
                  <Label className="text-xs font-semibold">
                    Statutory Requirements Checklist
                  </Label>
                </div>
                <Badge
                  variant="secondary"
                  className="font-mono text-[10px] h-5 px-1.5"
                >
                  {fields.length} {fields.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>

              {/* Requirement Items List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {fields.length === 0 ? (
                  <div className="rounded border border-dashed border-border p-3 text-center text-muted-foreground text-[11px]">
                    No statutory submittal requirements attached yet.
                  </div>
                ) : (
                  fields.map((req, idx) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-2 rounded border border-border bg-card p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="truncate text-foreground text-[11px]">
                          {req.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleMandatory(idx)}
                          disabled={fieldsDisabled}
                          className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer',
                            req.mandatory
                              ? 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300'
                              : 'bg-muted text-muted-foreground border-border',
                          )}
                          title="Toggle Mandatory / Optional"
                        >
                          {req.mandatory ? 'Mandatory' : 'Optional'}
                        </button>

                        {effectiveCanEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRequirement(idx)}
                            disabled={isSubmitting}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition cursor-pointer"
                            aria-label={`Remove requirement: ${req.title}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Inline Input to Add Requirement */}
              {effectiveCanEdit && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newReqTitle}
                    onChange={(e) => setNewReqTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRequirement();
                      }
                    }}
                    placeholder="Add statutory submittal requirement..."
                    disabled={isSubmitting}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRequirement}
                    disabled={!newReqTitle.trim() || isSubmitting}
                    className="h-8 px-2.5 text-xs shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Add</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Mandatory Change Justification */}
            <div className="space-y-1.5 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="matrix-item-change-summary"
                  className="text-xs font-semibold"
                >
                  Reason for Template Change{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    changeSummary.trim().length >= 5
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground',
                  )}
                >
                  {changeSummary.trim().length}/5 min chars
                </span>
              </div>
              <Textarea
                id="matrix-item-change-summary"
                placeholder="Explain the statutory authority, circular revision, or engineering requirement rationale..."
                disabled={fieldsDisabled}
                aria-invalid={!!errors.changeSummary}
                className="min-h-16 text-xs resize-none"
                {...register('changeSummary', {
                  validate: (v) =>
                    v.trim().length >= 5 ||
                    'Reason for template change must be at least 5 characters.',
                })}
              />
              <p className="text-[11px] text-muted-foreground">
                Required audit justification logged permanently with this
                template revision.
              </p>
            </div>

            {/* Blueprint Propagation Policy Card */}
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-(--site-cyan) mt-0.5" />
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">
                      Automatic Project Propagation
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] h-4.5 px-1.5 border-border bg-card text-muted-foreground uppercase tracking-wider"
                    >
                      Policy
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Saving automatically updates unobtained NOCs (
                    <span className="text-foreground font-medium">
                      Not Started
                    </span>
                    ,{' '}
                    <span className="text-foreground font-medium">Pending</span>
                    ,{' '}
                    <span className="text-foreground font-medium">
                      Rejected
                    </span>
                    ) across all active projects under this Master Authority.
                    Approved certificates remain locked and unchanged.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <footer className="p-4 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>

            {effectiveCanEdit && (
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !isValid}
                className="bg-(--site-cyan) text-white hover:bg-(--site-cyan-hover) text-xs h-8 px-4 cursor-pointer gap-1.5 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>
                    {item ? 'Save Blueprint & Propagate' : 'Create & Propagate'}
                  </span>
                )}
              </Button>
            )}
          </footer>
        </form>
      </aside>

      <AddAuthorityDialog
        open={isAddRevAuthOpen}
        onOpenChange={setIsAddRevAuthOpen}
        onCreated={handleAuthorityCreated}
      />
    </>
  );
}

export function MatrixItemEditorDrawer(props: MatrixItemEditorDrawerProps) {
  const formKey = `${props.isOpen ? 'open' : 'closed'}-${props.item?.id ?? 'new'}`;

  return <MatrixItemEditorDrawerForm key={formKey} {...props} />;
}
