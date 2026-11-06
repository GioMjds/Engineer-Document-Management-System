'use client';

import { useState, useTransition } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
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
import { inviteUser } from '@/app/actions/admin';
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

const inviteUserSchema = z.object({
  email: z.email('Valid email address is required.').trim(),
  fullName: z.string().trim().min(1, 'Full name is required.'),
  role: z.enum(ROLES),
  specialization: z.string(),
  customSpecialization: z.string(),
});

type InviteUserValues = z.infer<typeof inviteUserSchema>;

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InviteUserValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      fullName: '',
      role: 'engineer',
      specialization: 'none',
      customSpecialization: '',
    },
  });

  const selectedRole = useWatch({ control, name: 'role' });
  const rawFullName = useWatch({ control, name: 'fullName' }) || '';
  const selectedSpecialization = useWatch({ control, name: 'specialization' });
  const customSpecialization = useWatch({ control, name: 'customSpecialization' }) || '';

  const activeSpecialty =
    selectedRole === 'engineer'
      ? selectedSpecialization === 'custom'
        ? customSpecialization.trim()
        : selectedSpecialization && selectedSpecialization !== 'none'
          ? selectedSpecialization
          : null
      : null;

  const previewName =
    activeSpecialty && rawFullName.trim() && !rawFullName.toLowerCase().includes(activeSpecialty.toLowerCase())
      ? `${rawFullName.trim()} (${activeSpecialty})`
      : rawFullName.trim();

  function onSubmit(values: InviteUserValues) {
    let finalFullName = values.fullName.trim();
    const specialty =
      values.role === 'engineer'
        ? values.specialization === 'custom'
          ? values.customSpecialization?.trim()
          : values.specialization && values.specialization !== 'none'
            ? values.specialization
            : null
        : null;

    if (specialty && !finalFullName.toLowerCase().includes(specialty.toLowerCase())) {
      finalFullName = `${finalFullName} (${specialty})`;
    }

    startTransition(async () => {
      const res = await inviteUser({
        email: values.email,
        full_name: finalFullName,
        role: values.role,
      });
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to invite user.');
        return;
      }
      if (res.warning) toast.warning(res.warning);
      else toast.success(`Invitation sent to ${values.email}.`);
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2 bg-(--site-cyan) hover:bg-(--site-cyan-hover) text-white font-medium">
            <UserPlus className="h-4 w-4" />
            <span>Invite User</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation email to a new team member and assign their system role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@cvtec.ae"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="First Last"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">System Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={ROLES.map((r) => ({
                      value: r,
                      label: ROLE_LABELS[r],
                    }))}
                  >
                    <SelectTrigger id="role">
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
              {errors.role && (
                <p className="text-xs text-destructive">{errors.role.message}</p>
              )}
            </div>

            {selectedRole === 'engineer' && (
              <div className="space-y-3 rounded-md border border-(--site-cyan)/30 bg-(--site-cyan)/5 p-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="specialization" className="text-xs font-semibold text-foreground">
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
                        <SelectTrigger id="specialization" className="h-9 text-xs bg-background">
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
                    <Label htmlFor="customSpecialization" className="text-xs">
                      Custom Specialty Title
                    </Label>
                    <Input
                      id="customSpecialization"
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
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-(--site-cyan) hover:bg-(--site-cyan-hover) text-white"
            >
              {pending ? 'Inviting...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
