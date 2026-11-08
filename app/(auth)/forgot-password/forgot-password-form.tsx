'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleAlert, LoaderCircle, MailCheck } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { requestPasswordReset } from './actions';

// Email form that requests a password reset link.
export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setErrorMsg(result.error ?? 'Could not send the reset link. Try again.');
        return;
      }
      setSentTo(email.trim());
    });
  };

  if (sentTo) {
    return (
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="flex flex-col items-center space-y-4 py-12 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" aria-hidden />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an active account exists for{' '}
              <strong className="font-medium text-foreground">{sentTo}</strong>,
              a reset link is on its way.
            </p>
          </div>
          <Link
            href="/login"
            className={buttonVariants({ variant: 'outline', className: 'w-full' })}
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="gap-1.5">
        <div className="mb-1 flex items-center gap-2 text-primary">
          <MailCheck className="size-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Password Reset
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your account email. We will send you a link to set a new password.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={isPending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full text-base"
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? (
              <>
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>

        <p className="border-t pt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
