import { z } from 'zod';

export const PROJECT_STAGES = [
  'planning',
  'design',
  'construction',
  'handover',
  'completed',
] as const;

export const STAGE_LABELS: Record<(typeof PROJECT_STAGES)[number], string> = {
  planning: 'Planning',
  design: 'Pre-Construction (Design)',
  construction: 'Construction',
  handover: 'Handover',
  completed: 'Completed',
};

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.'),
  summary: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer.')
    .default(''),
  stage: z.enum(PROJECT_STAGES),
  client_name: z.string().trim().min(1, 'Client name is required.'),
  contractor_name: z.string().trim().min(1, 'Contractor name is required.'),
  client_emails: z.array(z.email()).default([]),
  contractor_emails: z.array(z.email()).default([]),
  master_authority_id: z.number().int().positive(),
});

export type ProjectEditInput = z.input<typeof updateProjectSchema>;

// Editable project fields as loaded for the edit dialog.
export interface ProjectEditDetails {
  summary: string;
  stage: (typeof PROJECT_STAGES)[number];
  clientName: string;
  contractorName: string;
  clientEmails: string[];
  contractorEmails: string[];
  masterAuthorityId: number;
}

// Splits a comma-separated address field into trimmed, non-empty entries.
export const parseEmailList = (value: string) =>
  value
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
