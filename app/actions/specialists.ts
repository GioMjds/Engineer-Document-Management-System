'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { emptyDisciplineStatus } from '@/lib/project-status';
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
    const user = await requireUser();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return { success: false, error: 'No file provided for upload.' };
    }

    if (file.size > MAX_SPECIALIST_FILE_SIZE) {
      return { success: false, error: 'File size exceeds 50 MB limit.' };
    }

    const safeName = sanitizeFileName(file.name);
    const typeSlug = type.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const storagePath = `specialists/${projectCode}/${typeSlug}-${Date.now()}-${safeName}`;
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

    // Fetch existing milestones
    const { data: projectData, error: fetchError } = await admin
      .from('projects')
      .select('milestones')
      .eq('code', projectCode)
      .single();

    if (fetchError || !projectData) {
      return {
        success: false,
        error: 'Project record not found in database.',
      };
    }

    const currentMilestones =
      (projectData.milestones as unknown as StoredMilestones) || {};
    const disciplineStatus: ProjectDisciplineStatus =
      currentMilestones.disciplineStatus || emptyDisciplineStatus(projectCode);

    const specialistsList: ThirdPartySpecialistRecord[] =
      disciplineStatus.specialists || [];
    const prev = specialistsList.find(
      (s: ThirdPartySpecialistRecord) => s.type === type,
    );
    const computedRevision =
      revision ||
      (prev?.revision
        ? `R${String(parseInt(prev.revision.replace(/\D/g, '') || '0', 10) + 1).padStart(2, '0')}`
        : 'R00');

    const formattedSize = formatBytes(file.size);
    const actor =
      user.role === 'admin'
        ? 'System Administrator'
        : user.role.replace(/_/g, ' ');

    const updatedRecord: ThirdPartySpecialistRecord = {
      id:
        prev?.id ||
        `spec-${projectCode}-${type.toLowerCase().replace(/\s+/g, '-')}`,
      type,
      fileName: file.name,
      fileSize: formattedSize,
      filePath: storagePath,
      revision: computedRevision,
      uploadedBy: actor,
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
      .eq('code', projectCode);

    if (updateError) {
      return {
        success: false,
        error: `Database update failed: ${updateError.message}`,
      };
    }

    revalidatePath(`/noc-tracker/${projectCode}`);
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
    await requireUser();
    const admin = createAdminClient();

    const { data: projectData, error: fetchError } = await admin
      .from('projects')
      .select('milestones')
      .eq('code', projectCode)
      .single();

    if (fetchError || !projectData) {
      return { success: false, error: 'Project record not found.' };
    }

    const currentMilestones =
      (projectData.milestones as unknown as StoredMilestones) || {};
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
    await requireUser();
    const admin = createAdminClient();

    const { data: projectData, error: fetchError } = await admin
      .from('projects')
      .select('milestones')
      .eq('code', projectCode)
      .single();

    if (fetchError || !projectData) {
      return { success: false, error: 'Project not found.' };
    }

    const currentMilestones =
      (projectData.milestones as unknown as StoredMilestones) || {};
    const disciplineStatus: ProjectDisciplineStatus =
      currentMilestones.disciplineStatus || emptyDisciplineStatus(projectCode);

    const specialistsList: ThirdPartySpecialistRecord[] =
      disciplineStatus.specialists || [];
    const specialist = specialistsList.find(
      (s: ThirdPartySpecialistRecord) => s.type === type,
    );

    if (specialist?.filePath) {
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
      .eq('code', projectCode);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/noc-tracker/${projectCode}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove file.',
    };
  }
}
