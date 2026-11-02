'use server';

import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  archiveDocument as appArchiveDocument,
  restoreDocument as appRestoreDocument,
  getDownloadUrl as appGetDownloadUrl,
} from '@/app/actions/documents';

export async function getDownloadUrl(documentId: string): Promise<
  | {
      ok: true;
      url: string;
      fileName?: string;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const res = await appGetDownloadUrl(documentId);
  if (!res.ok || !res.url) {
    return { ok: false, error: res.error || 'Failed to generate download URL.' };
  }
  return { ok: true, url: res.url, fileName: res.fileName };
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
