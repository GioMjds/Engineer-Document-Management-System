'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
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
  client_name: z.string().trim().min(1, 'Client entity is required.'),
  contractor_name: z.string().trim().min(1, 'General contractor is required.'),
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
}

const parseEmails = (str?: string) =>
  (str ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

export function ProjectRegistrationForm({
  authorities = [],
}: ProjectRegistrationFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      code: '',
      name: '',
      stage: 'design',
      master_authority_id: authorities[0]?.id ?? 1,
      client_name: '',
      contractor_name: '',
      client_emails: '',
      contractor_emails: '',
      client_contractor_amount: 0,
      client_consultant_amount: 0,
    },
  });

  const onSubmit = (values: ProjectFormValues) => {
    startTransition(async () => {
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
      });

      if (!res.ok) {
        toast.error(res.error ?? 'Failed to create project.');
        return;
      }

      toast.success(`Project ${values.code} created successfully.`);
      router.push('/noc-tracker');
    });
  };

  return (
    <Card className="border-border bg-card shadow-xs">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger id="masterAuthority">
                      <SelectValue placeholder="Select Authority" />
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
              {errors.master_authority_id && (
                <p className="text-xs text-destructive">
                  {errors.master_authority_id.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stage">Initial Stage</Label>
              <Controller
                name="stage"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design">
                        Pre-Construction (Information and Design)
                      </SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="handover">Handover</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
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
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Client Entity</Label>
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
              <Label htmlFor="contractorName">General Contractor</Label>
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
              <Label htmlFor="clientEmails">Client Notification Emails</Label>
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
        <CardFooter className="flex justify-end gap-3 border-t border-border py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="bg-(--site-cyan) hover:bg-(--site-cyan-hover) text-white"
          >
            {pending ? 'Registering...' : 'Register Project'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
