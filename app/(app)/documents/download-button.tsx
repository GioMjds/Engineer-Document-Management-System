'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDownloadUrl } from './actions';
import { downloadFileFromUrl } from '@/lib/download';

export function DownloadButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const result = await getDownloadUrl(documentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await downloadFileFromUrl(
        result.url,
        result.fileName || 'engineering-document.pdf',
      );
      toast.success('Document downloaded.');
    } catch {
      toast.error('Download failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
      <Download className="mr-1 h-4 w-4" />
      {loading ? '...' : 'Download'}
    </Button>
  );
}
