'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  documentMetaSchema,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} from '@/lib/documents';

type ActionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function createDocument(input: {
  doc_number: string;
  title: string;
  description?: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}): Promise<ActionResult> {
  const user = await requireUser();

  const meta = documentMetaSchema.safeParse(input);
  if (!meta.success) {
    return {
      ok: false,
      error: meta.error.issues[0].message,
    };
  }

  // Server-side re-validation: never trust the client
  if (input.file_size > MAX_FILE_SIZE) {
    return { ok: false, error: 'File is too large (max 50 MB).' };
  }
  if (!ALLOWED_MIME_TYPES.includes(input.mime_type)) {
    return { ok: false, error: 'File type not allowed.' };
  }
  // The path must live under the uploader's own folder
  if (!input.file_path.startsWith(`${user.id}/`)) {
    return { ok: false, error: 'Invalid file path.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('documents').insert({
    doc_number: meta.data.doc_number,
    title: meta.data.title,
    description: meta.data.description || null,
    file_path: input.file_path,
    file_name: input.file_name,
    file_size: input.file_size,
    mime_type: input.mime_type,
    uploaded_by: user.id,
    status: 'submitted',
  });

  if (error) {
    const { error: cleanupError } = await supabase.storage
      .from('documents')
      .remove([input.file_path]);

    if (cleanupError) {
      console.error(
        `Orphan cleanup failed: ${input.file_path} - ${cleanupError.message}`,
      );
    }

    if (error.code === '23505') {
      return { ok: false, error: 'Document number already exists.' };
    }
    return {
      ok: false,
      error: error.message,
    };
  }

  revalidatePath('/documents');
  revalidatePath('/review');
  return { ok: true };
}

export async function getDownloadUrl(documentId: string): Promise<
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      error: string;
    }
> {
  await requireUser();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('file_path, file_name')
    .eq('id', documentId)
    .single();

  if (!doc) return { ok: false, error: 'Document not found.' };

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 60, { download: doc.file_name }); // URL valid for 60 seconds

  if (error || !data)
    return {
      ok: false,
      error: error?.message || 'Failed to generate download URL.',
    };
  return { ok: true, url: data.signedUrl };
}

export async function docNumberExists(docNumber: string): Promise<boolean> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('documents')
    .select('id')
    .eq('doc_number', docNumber)
    .maybeSingle();
  return !!data;
}

import {
  archiveDocument as appArchiveDocument,
  restoreDocument as appRestoreDocument,
} from '@/app/actions/documents';

export async function archiveDocument(documentId: string): Promise<
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const res = await appArchiveDocument(documentId);
  if (!res.success) {
    return { ok: false, error: res.error || 'Failed to archive document.' };
  }
  return { ok: true };
}

export async function restoreDocument(
  documentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await appRestoreDocument(documentId);
  if (!res.success) {
    return { ok: false, error: res.error || 'Failed to restore document.' };
  }
  return { ok: true };
}
