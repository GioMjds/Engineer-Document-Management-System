'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Archive, LoaderCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { archiveUser } from '@/app/actions/admin';

interface ArchiveUserDialogProps {
  userId: string;
  displayName: string;
  email: string;
  disabled?: boolean;
}

// Confirmation dialog to soft delete and archive a user profile.
export function ArchiveUserDialog({
  userId,
  displayName,
  email,
  disabled,
}: ArchiveUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    startTransition(async () => {
      const res = await archiveUser(userId);
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to archive user.');
        return;
      }
      toast.success(`${displayName || email} archived successfully.`);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-7 px-2 text-xs gap-1 border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10"
            aria-label={`Archive ${displayName || email}`}
          >
            <Archive className="size-3" />
            <span>Archive</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive User</DialogTitle>
          <DialogDescription>
            Soft delete this user profile. Archived users cannot log in or perform actions until reactivated.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-foreground space-y-1">
          <p className="font-semibold text-destructive">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleArchive}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
                Archiving...
              </>
            ) : (
              'Archive User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
