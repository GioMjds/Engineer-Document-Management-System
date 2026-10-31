'use client';

import { useState, useTransition } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateUser } from '@/app/actions/admin';
import { ROLES, type AppRole } from '@/lib/permissions';

const ROLE_LABELS = {
  admin: 'Admin',
  ceo: 'CEO',
  area_manager: 'Area Manager',
  resident_engineer: 'Resident Engineer',
  authority_engineer: 'Authority Engineer',
  engineer: 'Engineer',
  dc: 'Document Controller',
} satisfies Record<AppRole, string>;

const ENGINEER_SPECIALIZATIONS = [
  { value: 'none', label: 'General / Unspecified' },
  { value: 'Architectural Engineer', label: 'Architectural Engineer' },
  { value: 'MEP Engineer', label: 'MEP Engineer' },
  { value: 'Structural Engineer', label: 'Structural Engineer' },
  { value: 'Civil Engineer', label: 'Civil Engineer' },
  { value: 'custom', label: 'Other Specialization...' },
] as const;

const editUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.'),
  role: z.enum(ROLES),
  active: z.boolean(),
  specialization: z.string(),
  customSpecialization: z.string(),
});

type EditUserValues = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: AppRole;
    active: boolean;
  };
  isSelf: boolean;
}

// Edit dialog for updating user profile, engineering specialization, and system role.
export function EditUserDialog({ user, isSelf }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const match = user.full_name?.match(/^(.*?)\s*\((.*?)\)$/);
  const initialName = match ? match[1].trim() : (user.full_name || '').trim();
  const initialSpecialty = match ? match[2].trim() : '';

  const matchingSpec = ENGINEER_SPECIALIZATIONS.find(
    (s) => s.value.toLowerCase() === initialSpecialty.toLowerCase(),
  );

  const defaultSpec = matchingSpec
    ? matchingSpec.value
    : initialSpecialty
      ? 'custom'
      : 'none';
  const defaultCustomSpec = defaultSpec === 'custom' ? initialSpecialty : '';

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      fullName: initialName,
      role: user.role,
      active: user.active !== false,
      specialization: defaultSpec,
      customSpecialization: defaultCustomSpec,
    },
  });

  const selectedRole = useWatch({ control, name: 'role' });
  const rawFullName = useWatch({ control, name: 'fullName' }) || '';
  const selectedSpecialization = useWatch({ control, name: 'specialization' });
  const customSpecialization =
    useWatch({ control, name: 'customSpecialization' }) || '';

  const activeSpecialty =
    selectedRole === 'engineer'
      ? selectedSpecialization === 'custom'
        ? customSpecialization.trim()
        : selectedSpecialization && selectedSpecialization !== 'none'
          ? selectedSpecialization
          : null
      : null;

  const previewName =
    activeSpecialty &&
    rawFullName.trim() &&
    !rawFullName.toLowerCase().includes(activeSpecialty.toLowerCase())
      ? `${rawFullName.trim()} (${activeSpecialty})`
      : rawFullName.trim();

  function onSubmit(values: EditUserValues) {
    let finalFullName = values.fullName.trim();
    const specialty =
      values.role === 'engineer'
        ? values.specialization === 'custom'
          ? values.customSpecialization?.trim()
          : values.specialization && values.specialization !== 'none'
            ? values.specialization
            : null
        : null;

    if (
      specialty &&
      !finalFullName.toLowerCase().includes(specialty.toLowerCase())
    ) {
      finalFullName = `${finalFullName} (${specialty})`;
    }

    startTransition(async () => {
      const res = await updateUser({
        user_id: user.id,
        full_name: finalFullName,
        role: values.role,
        active: values.active,
      });

      if (!res.ok) {
        toast.error(res.error ?? 'Failed to update user.');
        return;
      }

      toast.success('User updated successfully.');
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset({
            fullName: initialName,
            role: user.role,
            active: user.active !== false,
            specialization: defaultSpec,
            customSpecialization: defaultCustomSpec,
          });
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1 border-border/80 hover:bg-muted"
            aria-label={`Edit ${user.full_name || user.email}`}
          >
            <Pencil className="size-3" />
            <span>Edit</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update team member details, engineering discipline specialty, and access permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email Address</Label>
              <div className="text-sm font-medium px-3 py-2 rounded-md border border-border/60 bg-muted/40 text-muted-foreground select-all">
                {user.email}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-name-${user.id}`}>Full Name</Label>
              <Input
                id={`edit-name-${user.id}`}
                type="text"
                placeholder="Full name"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`edit-role-${user.id}`}>System Role</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSelf}
                      items={ROLES.map((r) => ({
                        value: r,
                        label: ROLE_LABELS[r],
                      }))}
                    >
                      <SelectTrigger id={`edit-role-${user.id}`} className="w-full">
                        <SelectValue>
                          {ROLE_LABELS[field.value] ?? field.value}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {isSelf && (
                  <p className="text-[11px] text-muted-foreground">Cannot change own role.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`edit-status-${user.id}`}>Account Status</Label>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? 'active' : 'inactive'}
                      onValueChange={(val) => field.onChange(val === 'active')}
                      disabled={isSelf}
                      items={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                    >
                      <SelectTrigger id={`edit-status-${user.id}`} className="w-full">
                        <SelectValue>
                          {field.value ? 'Active' : 'Inactive'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {isSelf && (
                  <p className="text-[11px] text-muted-foreground">Cannot deactivate own account.</p>
                )}
              </div>
            </div>

            {selectedRole === 'engineer' && (
              <div className="space-y-3 rounded-md border border-(--site-cyan)/30 bg-(--site-cyan)/5 p-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`edit-spec-${user.id}`} className="text-xs font-semibold text-foreground">
                      Engineering Specialty
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Appends to name</span>
                  </div>
                  <Controller
                    name="specialization"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(val) => {
                          field.onChange(val);
                          if (val !== 'custom') {
                            setValue('customSpecialization', '');
                          }
                        }}
                        items={ENGINEER_SPECIALIZATIONS.map((s) => ({
                          value: s.value,
                          label: s.label,
                        }))}
                      >
                        <SelectTrigger id={`edit-spec-${user.id}`} className="h-9 text-xs bg-background">
                          <SelectValue>
                            {ENGINEER_SPECIALIZATIONS.find((s) => s.value === field.value)?.label ?? field.value}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ENGINEER_SPECIALIZATIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value} className="text-xs">
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {selectedSpecialization === 'custom' && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-custom-${user.id}`} className="text-xs">
                      Custom Specialty Title
                    </Label>
                    <Input
                      id={`edit-custom-${user.id}`}
                      type="text"
                      placeholder="e.g. Façade Engineer, Geotechnical Lead"
                      className="h-8 text-xs bg-background"
                      {...register('customSpecialization')}
                    />
                  </div>
                )}

                {previewName && previewName !== rawFullName.trim() && (
                  <div className="rounded bg-background/80 px-2.5 py-1.5 border border-border text-[11px] text-muted-foreground">
                    <span>Will be saved as: </span>
                    <strong className="text-foreground font-semibold">{previewName}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-(--site-cyan) hover:bg-(--site-cyan-hover) text-white"
            >
              {pending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
