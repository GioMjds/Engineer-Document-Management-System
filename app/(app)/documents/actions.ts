'use server';

import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  archiveDocument as appArchiveDocument,
  restoreDocument as appRestoreDocument,
} from '@/app/actions/documents';

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
    .createSignedUrl(doc.file_path, 60, { download: doc.file_name });

  if (error || !data)
    return {
      ok: false,
      error: error?.message || 'Failed to generate download URL.',
    };
  return { ok: true, url: data.signedUrl };
}

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
