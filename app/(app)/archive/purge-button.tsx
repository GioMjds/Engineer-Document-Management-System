'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { purgeDocument } from '@/app/actions/admin';

export function PurgeButton({
  documentId,
  documentTitle,
}: {
  documentId: string;
  documentTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pending, startTransition] = useTransition();

  const isConfirmed = confirmText.trim().toUpperCase() === 'CONFIRM PURGE';

  function handlePurge() {
    if (!isConfirmed) return;

    startTransition(async () => {
      const res = await purgeDocument(documentId);
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to purge document.');
        return;
      }
      toast.success(`Document "${documentTitle}" permanently purged.`);
      setOpen(false);
      setConfirmText('');
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Permanent Document Purge
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete <strong>{documentTitle}</strong> from both the database and cloud storage. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <Label htmlFor="confirmPurge" className="text-xs">
            Type <span className="font-mono font-bold text-foreground">CONFIRM PURGE</span> to authorize deletion:
          </Label>
          <Input
            id="confirmPurge"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="CONFIRM PURGE"
            className="font-mono text-sm"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmed || pending}
            onClick={handlePurge}
          >
            {pending ? 'Purging...' : 'Permanently Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
