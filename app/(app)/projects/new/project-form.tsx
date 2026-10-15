'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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

export function ProjectRegistrationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [stage, setStage] = useState<
    'planning' | 'design' | 'construction' | 'handover' | 'completed'
  >('design');
  const [clientName, setClientName] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [clientEmails, setClientEmails] = useState('');
  const [contractorEmails, setContractorEmails] = useState('');
  const [contractorAmount, setContractorAmount] = useState('0');
  const [consultantAmount, setConsultantAmount] = useState('0');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parseEmails = (str: string) =>
      str
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

    const clientEmailList = parseEmails(clientEmails);
    const contractorEmailList = parseEmails(contractorEmails);

    startTransition(async () => {
      const res = await createProject({
        code,
        name,
        stage,
        client_name: clientName,
        contractor_name: contractorName,
        client_emails: clientEmailList,
        contractor_emails: contractorEmailList,
        client_contractor_amount: parseFloat(contractorAmount) || 0,
        client_consultant_amount: parseFloat(consultantAmount) || 0,
        description: name,
      });

      if (!res.ok) {
        toast.error(res.error ?? 'Failed to create project.');
        return;
      }

      toast.success(`Project ${code} created successfully.`);
      router.push('/noc-tracker');
    });
  }

  return (
    <Card className="border-border bg-card shadow-xs">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Project Metadata & Stakeholders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">Project Code</Label>
              <Input
                id="code"
                placeholder="e.g. 23017"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stage">Initial Stage</Label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v as typeof stage)}
              >
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
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Project Name / Description</Label>
            <Input
              id="name"
              placeholder="e.g. CVTEC Commercial Tower & Hotel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Client Entity</Label>
              <Input
                id="clientName"
                placeholder="e.g. Dubai Holding"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contractorName">General Contractor</Label>
              <Input
                id="contractorName"
                placeholder="e.g. Al Naboodah Contracting"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="clientEmails">Client Notification Emails</Label>
              <Input
                id="clientEmails"
                placeholder="pm@client.ae, director@client.ae"
                value={clientEmails}
                onChange={(e) => setClientEmails(e.target.value)}
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
                value={contractorEmails}
                onChange={(e) => setContractorEmails(e.target.value)}
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
                value={contractorAmount}
                onChange={(e) => setContractorAmount(e.target.value)}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Visible to internal project team.
              </p>
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
                value={consultantAmount}
                onChange={(e) => setConsultantAmount(e.target.value)}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Restricted to Admin, CEO, and Area Manager.
              </p>
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
