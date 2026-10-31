'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { RotateCcw, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reactivateUser } from '@/app/actions/admin';

interface RestoreUserButtonProps {
  userId: string;
  displayName: string;
  disabled?: boolean;
}

// Button to restore and reactivate an archived user profile.
export function RestoreUserButton({
  userId,
  displayName,
  disabled,
}: RestoreUserButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      const res = await reactivateUser(userId);
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to restore user.');
        return;
      }
      toast.success(`${displayName} reactivated successfully.`);
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || isPending}
      onClick={handleRestore}
      className="h-7 px-2 text-xs gap-1 border-border/80 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/10"
      aria-label={`Restore ${displayName}`}
    >
      {isPending ? (
        <LoaderCircle className="size-3 animate-spin" />
      ) : (
        <RotateCcw className="size-3" />
      )}
      <span>Restore</span>
    </Button>
  );
}
