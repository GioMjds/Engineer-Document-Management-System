'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Mail, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resendUserInvite } from '@/app/actions/admin';

interface ResendInviteButtonProps {
  email: string;
}

// Resend invitation button with pending transition state and feedback.
export function ResendInviteButton({ email }: ResendInviteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
    startTransition(async () => {
      const res = await resendUserInvite(email);
      if (!res.ok) {
        toast.error(res.error ?? 'Failed to resend invitation.');
        return;
      }
      toast.success(`Invitation resent to ${email}`);
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-500/10"
      onClick={handleResend}
      disabled={isPending}
      aria-label={`Resend invitation email to ${email}`}
    >
      {isPending ? (
        <LoaderCircle className="size-3.5 animate-spin mr-1" />
      ) : (
        <Mail className="size-3.5 mr-1" />
      )}
      Resend
    </Button>
  );
}
