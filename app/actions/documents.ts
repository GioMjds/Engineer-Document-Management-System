'use server';

import { requireCan, requireUser } from '@/lib/auth';
import {
  MAX_FILE_SIZE,
  sanitizeFileName
} from '@/lib/documents';
import { can } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface DocumentUpdateInput {
  title?: string;
  description?: string;
  discipline?: 'mep' | 'architect' | 'structure' | 'civil';
  doc_number?: string;
}

export interface UploadDrawingInput {
  projectId: string;
  discipline: 'mep' | 'architect' | 'structure' | 'civil';
  drawingNumber: string;
  title: string;
  file: File;
}

const updateDocSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  discipline: z.enum(['mep', 'architect', 'structure', 'civil']).optional(),
  doc_number: z.string().trim().min(1).max(50).optional(),
});

/**
 * Checks if user has permission to access a project.
 */
async function canAccessProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: string | null | undefined,
  projectId: string | null | undefined,
): Promise<boolean> {
  if (!projectId) return true;
  if (role === 'admin' || role === 'ceo' || role === 'area_manager') {
    return true;
  }
  const { data } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * Uploads a document to an assigned project (initial revision R00).
 */
export async function uploadDocument(
  projectId: string,
  formData: FormData,
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  const user = await requireCan('document.upload');
  const supabase = await createClient();

  const allowed = await canAccessProject(
    supabase,
    user.id,
    user.role,
    projectId,
  );
  if (!allowed) {
    return { success: false, error: 'Project access denied.' };
  }

  const file = formData.get('file') as File | null;
  const docNumber = (formData.get('doc_number') as string)?.trim();
  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const discipline = (formData.get('discipline') as string)?.trim() || null;

  if (!file || !(file instanceof File)) {
    return { success: false, error: 'Please choose a file.' };
  }
  if (!docNumber) {
    return { success: false, error: 'Document number is required.' };
  }
  if (!title) {
    return { success: false, error: 'Title is required.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File is too large (max 50 MB).' };
  }

  // Check unique doc_number
  const { data: existingDoc } = await supabase
    .from('documents')
    .select('id')
    .eq('doc_number', docNumber)
    .maybeSingle();

  if (existingDoc) {
    return { success: false, error: 'Document number already exists.' };
  }



  const validDiscipline = ['mep', 'architect', 'structure', 'civil'].includes(
    discipline ?? '',
  )
    ? (discipline as 'mep' | 'architect' | 'structure' | 'civil')
    : null;

  // Enforce engineer discipline scope check: engineers can only submit drawings matching assigned discipline
  if (user.role === 'engineer') {
    const { data: member } = await supabase
      .from('project_members')
      .select('discipline')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (member?.discipline && validDiscipline && member.discipline !== validDiscipline) {
      return {
        success: false,
        error: `Upload rejected: Engineers can only upload drawings for their assigned discipline (${member.discipline.toUpperCase()}).`,
      };
    }
  }

  const filePath = `${user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }



  const { data: insertedDoc, error: insertError } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      doc_number: docNumber,
      title,
      description,
      discipline: validDiscipline,
      revision: 'R00',
      status: 'submitted',
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      uploaded_by: user.id,
    })
    .select('id')
    .single();

  if (insertError) {
    await supabase.storage.from('documents').remove([filePath]);
    return { success: false, error: insertError.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'DOCUMENT_UPLOAD',
    entity: 'documents',
    entity_id: insertedDoc.id,
    metadata: {
      title,
      doc_number: docNumber,
      revision: 'R00',
      project_id: projectId,
      file_name: file.name,
      file_size: file.size,
    },
  });

  revalidatePath('/documents');
  revalidatePath('/review');
  return { success: true, documentId: insertedDoc.id };
}

/** Initial drawing upload creates R00 */
export async function uploadDrawing(
  input: UploadDrawingInput,
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('doc_number', input.drawingNumber);
  formData.append('title', input.title);
  formData.append('discipline', input.discipline);

  return uploadDocument(input.projectId, formData);
}

/**
 * Edits or replaces metadata of any document within an assigned project.
 */
export async function editDocument(
  documentId: string,
  updates: DocumentUpdateInput,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  const canEditAny = can(user.role, 'document.edit');
  const canEditOwn = can(user.role, 'document.edit.own');

  if (!canEditAny && !canEditOwn) {
    return {
      success: false,
      error: 'Forbidden: Document edit capability required.',
    };
  }

  const supabase = await createClient();

  const parsed = updateDocSchema.safeParse(updates);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid update data',
    };
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('id, project_id, uploaded_by, title, doc_number')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc) {
    return { success: false, error: 'Document not found.' };
  }

  if (!canEditAny && canEditOwn && doc.uploaded_by !== user.id) {
    return {
      success: false,
      error: 'Forbidden: You can only edit your own uploads.',
    };
  }

  const allowed = await canAccessProject(
    supabase,
    user.id,
    user.role,
    doc.project_id,
  );
  if (!allowed) {
    return { success: false, error: 'Access denied to document project.' };
  }

  type DocumentUpdatePayload = {
    title?: string;
    description?: string | null;
    discipline?: 'mep' | 'architect' | 'structure' | 'civil' | null;
    doc_number?: string;
    updated_at: string;
  };

  const updatePayload: DocumentUpdatePayload = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    updatePayload.description = parsed.data.description;
  if (parsed.data.discipline !== undefined)
    updatePayload.discipline = parsed.data.discipline;
  if (parsed.data.doc_number !== undefined)
    updatePayload.doc_number = parsed.data.doc_number;

  const { error } = await supabase
    .from('documents')
    .update(updatePayload)
    .eq('id', documentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'DOCUMENT_EDIT',
    entity: 'documents',
    entity_id: documentId,
    metadata: {
      doc_number: doc.doc_number,
      title: doc.title,
      updates: parsed.data,
    },
  });

  revalidatePath('/documents');
  return { success: true };
}

/**
 * Uploads a successive revision (e.g. R00 -> R01).
 */
export async function uploadDocumentRevision(
  documentId: string,
  formData: FormData,
): Promise<{ success: boolean; newRevision?: string; error?: string }> {
  const user = await requireCan('document.upload');
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('id, project_id, revision, status, uploaded_by, title, doc_number')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc) {
    return { success: false, error: 'Document not found.' };
  }

  const allowed = await canAccessProject(
    supabase,
    user.id,
    user.role,
    doc.project_id,
  );
  if (!allowed) {
    return { success: false, error: 'Access denied to document project.' };
  }

  if (user.role === 'engineer') {
    if (doc.uploaded_by !== user.id) {
      return {
        success: false,
        error:
          'Forbidden: You can only upload revisions for your own drawings.',
      };
    }
    if (doc.status !== 'rejected') {
      return {
        success: false,
        error: 'Revisions can only be uploaded after a drawing has been rejected.',
      };
    }
  }

  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof File)) {
    return { success: false, error: 'Please choose a file.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File is too large (max 50 MB).' };
  }

  // Calculate next revision label (e.g. R00 -> R01, R01 -> R02)
  const currentRev = doc.revision || 'R00';
  const match = currentRev.match(/^R(\d+)$/i);
  let nextRevision = 'R01';
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    nextRevision = `R${String(nextNum).padStart(2, '0')}`;
  }

  const filePath = `${user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const adminClient = createAdminClient();
  const { error: updateError } = await adminClient
    .from('documents')
    .update({
      revision: nextRevision,
      status: 'submitted',
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (updateError) {
    await supabase.storage.from('documents').remove([filePath]);
    return { success: false, error: updateError.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'DOCUMENT_REVISION_UPLOAD',
    entity: 'documents',
    entity_id: documentId,
    metadata: {
      title: doc.title,
      doc_number: doc.doc_number,
      previous_revision: doc.revision,
      new_revision: nextRevision,
      file_name: file.name,
      file_size: file.size,
    },
  });

  revalidatePath('/documents');
  revalidatePath('/review');
  return { success: true, newRevision: nextRevision };
}

/**
 * Soft deletes a document (archives it).
 */
export async function archiveDocument(
  documentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireCan('document.archive');
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('id, project_id, status, title, doc_number')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc) {
    return { success: false, error: 'Document not found.' };
  }
  if (doc.status === 'archived') {
    return { success: false, error: 'Document is already archived.' };
  }

  const allowed = await canAccessProject(
    supabase,
    user.id,
    user.role,
    doc.project_id,
  );
  if (!allowed) {
    return { success: false, error: 'Access denied to document project.' };
  }

  const { error } = await supabase
    .from('documents')
    .update({
      status: 'archived',
      status_before_archive: doc.status,
      archived_at: new Date().toISOString(),
      archived_by: user.id,
    })
    .eq('id', documentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'DOCUMENT_ARCHIVE',
    entity: 'documents',
    entity_id: documentId,
    metadata: {
      title: doc.title,
      doc_number: doc.doc_number,
      previous_status: doc.status,
      project_id: doc.project_id,
    },
  });

  revalidatePath('/documents');
  revalidatePath('/archive');
  revalidatePath('/review');
  return { success: true };
}

/**
 * Restores an archived document.
 */
export async function restoreDocument(
  documentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireCan('archive.restore');
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('id, project_id, status, status_before_archive, title, doc_number')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc) {
    return { success: false, error: 'Document not found.' };
  }
  if (doc.status !== 'archived') {
    return { success: false, error: 'Document is not archived.' };
  }

  const allowed = await canAccessProject(
    supabase,
    user.id,
    user.role,
    doc.project_id,
  );
  if (!allowed) {
    return { success: false, error: 'Access denied to document project.' };
  }

  const { error } = await supabase
    .from('documents')
    .update({
      status: doc.status_before_archive ?? 'submitted',
      status_before_archive: null,
      archived_at: null,
      archived_by: null,
    })
    .eq('id', documentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'DOCUMENT_RESTORE',
    entity: 'documents',
    entity_id: documentId,
    metadata: {
      title: doc.title,
      doc_number: doc.doc_number,
      restored_status: doc.status_before_archive ?? 'submitted',
      project_id: doc.project_id,
    },
  });

  revalidatePath('/documents');
  revalidatePath('/archive');
  revalidatePath('/review');
  return { success: true };
}

/**
 * Generates a signed download URL for a document.
 */
export async function getDownloadUrl(documentId: string): Promise<{
  ok: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('id, project_id, file_path, file_name')
    .eq('id', documentId)
    .maybeSingle();

  if (!doc) {
    return { ok: false, error: 'Document not found.' };
  }

  const allowed = await canAccessProject(
    supabase,
    user.id,
    user.role,
    doc.project_id,
  );
  if (!allowed) {
    return { ok: false, error: 'Access denied to document project.' };
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 60, { download: doc.file_name });

  if (error || !data) {
    return {
      ok: false,
      error: error?.message || 'Failed to generate download URL.',
    };
  }

  return { ok: true, url: data.signedUrl, fileName: doc.file_name };
}
