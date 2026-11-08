'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getScopedProject } from '@/lib/project-access';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ALL_SPECIALIST_TYPES,
  actorLabel,
  canUserUploadSpecialist,
  emptyDisciplineStatus,
} from '@/lib/project-status';
import type { Json } from '@/types/database';
import type {
  ThirdPartySpecialistType,
  ThirdPartySpecialistRecord,
  ProjectDisciplineStatus,
} from '@/types/noc';

const MAX_SPECIALIST_FILE_SIZE = 50 * 1024 * 1024; // 50 MB limit, and file size might be larger than 50 MB, so we need to handle that case.

interface StoredMilestones {
  disciplineStatus?: ProjectDisciplineStatus;
  [key: string]: unknown;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function isSpecialistType(value: unknown): value is ThirdPartySpecialistType {
  return (
    typeof value === 'string' &&
    (ALL_SPECIALIST_TYPES as string[]).includes(value)
  );
}

// Every specialist file lives under its project folder; stored paths outside it are never touched.
function specialistPrefix(projectCode: string): string {
  return `specialists/${projectCode}/`;
}

/**
 * Uploads a specialist technical report to Supabase storage and attaches it to the project record.
 */
export async function uploadSpecialistFileAction(
  projectCode: string,
  type: ThirdPartySpecialistType,
  formData: FormData,
  revision?: string,
): Promise<{
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: string;
  revision?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized.' };
    if (!canUserUploadSpecialist(user.role)) {
      return { success: false, error: 'Your role cannot upload specialist studies.' };
    }
    if (!isSpecialistType(type)) {
      return { success: false, error: 'Unknown specialist study type.' };
    }

    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return { success: false, error: 'No file provided for upload.' };
    }

    if (file.size > MAX_SPECIALIST_FILE_SIZE) {
      return { success: false, error: 'File size exceeds 50 MB limit.' };
    }

    const project = await getScopedProject(user, projectCode);
    if (!project) return { success: false, error: 'Project not found.' };

    const safeName = sanitizeFileName(file.name);
    const typeSlug = type.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const storagePath = `${specialistPrefix(project.code)}${typeSlug}-${Date.now()}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Storage upload failed: ${uploadError.message}`,
      };
    }

    const currentMilestones =
      (project.milestones as unknown as StoredMilestones) || {};
    const disciplineStatus: ProjectDisciplineStatus =
      currentMilestones.disciplineStatus || emptyDisciplineStatus(project.code);

    const specialistsList: ThirdPartySpecialistRecord[] =
      disciplineStatus.specialists || [];
    const prev = specialistsList.find(
      (s: ThirdPartySpecialistRecord) => s.type === type,
    );
    const computedRevision =
      (revision && /^R\d{2,3}$/.test(revision) ? revision : undefined) ||
      (prev?.revision
        ? `R${String(parseInt(prev.revision.replace(/\D/g, '') || '0', 10) + 1).padStart(2, '0')}`
        : 'R00');

    const formattedSize = formatBytes(file.size);

    const updatedRecord: ThirdPartySpecialistRecord = {
      id:
        prev?.id ||
        `spec-${project.code}-${type.toLowerCase().replace(/\s+/g, '-')}`,
      type,
      fileName: file.name,
      fileSize: formattedSize,
      filePath: storagePath,
      revision: computedRevision,
      uploadedBy: actorLabel(user.role),
      uploadedAt: new Date().toISOString(),
      status: 'Uploaded',
      remarks: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
    };

    const exists = specialistsList.some(
      (s: ThirdPartySpecialistRecord) => s.type === type,
    );
    const updatedSpecialists = exists
      ? specialistsList.map((s: ThirdPartySpecialistRecord) =>
          s.type === type ? updatedRecord : s,
        )
      : [...specialistsList, updatedRecord];

    const updatedMilestones: StoredMilestones = {
      ...currentMilestones,
      disciplineStatus: {
        ...disciplineStatus,
        specialists: updatedSpecialists,
      },
    };

    const { error: updateError } = await admin
      .from('projects')
      .update({ milestones: updatedMilestones as unknown as Json })
      .eq('id', project.id);

    if (updateError) {
      await admin.storage.from('documents').remove([storagePath]);
      return {
        success: false,
        error: `Database update failed: ${updateError.message}`,
      };
    }

    revalidatePath(`/noc-tracker/${project.code}`);
    return {
      success: true,
      filePath: storagePath,
      fileName: file.name,
      fileSize: formattedSize,
      revision: computedRevision,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Unexpected file upload error.',
    };
  }
}

/**
 * Generates a signed download URL for a specialist study report.
 */
export async function getSpecialistDownloadUrlAction(
  projectCode: string,
  type: ThirdPartySpecialistType,
): Promise<{
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized.' };

    const project = await getScopedProject(user, projectCode);
    if (!project) return { success: false, error: 'Project record not found.' };

    const currentMilestones =
      (project.milestones as unknown as StoredMilestones) || {};
    const specialists = currentMilestones.disciplineStatus?.specialists || [];
    const specialist = specialists.find(
      (s: ThirdPartySpecialistRecord) => s.type === type,
    );

    if (!specialist || !specialist.fileName) {
      return {
        success: false,
        error: 'No report attached for this specialist.',
      };
    }

    if (!specialist.filePath) {
      return {
        success: false,
        error:
          'Legacy report without storage path; download fallback transmittal.',
        fileName: specialist.fileName,
      };
    }

    if (!specialist.filePath.startsWith(specialistPrefix(project.code))) {
      return { success: false, error: 'Report location is invalid.' };
    }

    const admin = createAdminClient();
    const { data: signed, error: signError } = await admin.storage
      .from('documents')
      .createSignedUrl(specialist.filePath, 60, {
        download: specialist.fileName,
      });

    if (signError || !signed) {
      return {
        success: false,
        error: signError?.message || 'Failed to generate download URL.',
      };
    }

    return {
      success: true,
      url: signed.signedUrl,
      fileName: specialist.fileName,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Download error.',
    };
  }
}

/**
 * Removes an attached specialist file from storage and resets the record to Pending.
 */
export async function removeSpecialistFileAction(
  projectCode: string,
  type: ThirdPartySpecialistType,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized.' };
    if (!canUserUploadSpecialist(user.role)) {
      return { success: false, error: 'Your role cannot remove specialist studies.' };
    }

    const project = await getScopedProject(user, projectCode);
    if (!project) return { success: false, error: 'Project not found.' };

    const admin = createAdminClient();
    const currentMilestones =
      (project.milestones as unknown as StoredMilestones) || {};
    const disciplineStatus: ProjectDisciplineStatus =
      currentMilestones.disciplineStatus || emptyDisciplineStatus(project.code);

    const specialistsList: ThirdPartySpecialistRecord[] =
      disciplineStatus.specialists || [];
    const specialist = specialistsList.find(
      (s: ThirdPartySpecialistRecord) => s.type === type,
    );

    if (specialist?.filePath?.startsWith(specialistPrefix(project.code))) {
      await admin.storage.from('documents').remove([specialist.filePath]);
    }

    const updatedSpecialists = specialistsList.map(
      (s: ThirdPartySpecialistRecord) =>
        s.type === type
          ? {
              id: s.id,
              type: s.type,
              status: 'Pending' as const,
            }
          : s,
    );

    const updatedMilestones: StoredMilestones = {
      ...currentMilestones,
      disciplineStatus: {
        ...disciplineStatus,
        specialists: updatedSpecialists,
      },
    };

    const { error: updateError } = await admin
      .from('projects')
      .update({ milestones: updatedMilestones as unknown as Json })
      .eq('id', project.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/noc-tracker/${project.code}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove file.',
    };
  }
}
