'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, CheckCircle2, Eye, EyeOff, LoaderCircle, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const COPY = {
  activate: {
    verifying: 'Verifying your invitation...',
    expiredNote: 'Your invitation link may have expired.',
    expiredSub: 'Your invitation or activation link is no longer valid.',
    badge: 'Account Activation',
    title: 'Set Your Password',
    intro: 'Welcome! Setting up access for',
    successTitle: 'Account Activated',
    successSub: 'Your password has been set. Redirecting you to the system dashboard...',
    submit: 'Save Password & Access EDMS',
  },
  reset: {
    verifying: 'Verifying your reset link...',
    expiredNote: 'Your reset link may have expired.',
    expiredSub: 'Your password reset link is no longer valid.',
    badge: 'Password Reset',
    title: 'Reset Your Password',
    intro: 'Choosing a new password for',
    successTitle: 'Password Updated',
    successSub: 'Your password has been changed. Redirecting you to the system dashboard...',
    submit: 'Save New Password',
  },
} as const;

// Form to set a password after an invite (activate) or a recovery link (reset).
export function SetPasswordForm({ mode = 'activate' }: { mode?: 'activate' | 'reset' }) {
  const copy = COPY[mode];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUserEmail(session.user.email ?? null);
          setIsLoadingSession(false);
          return;
        }

        // Listen for client-side auth events in case token is in URL hash
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, currentSession) => {
          if (currentSession?.user) {
            setUserEmail(currentSession.user.email ?? null);
            setIsLoadingSession(false);
          }
        });

        // Fallback timeout: If no session found after 2.5s, report expired
        const timer = setTimeout(() => {
          setIsLoadingSession((loading) => {
            if (loading) {
              setErrorMsg(`No active session found. ${copy.expiredNote}`);
            }
            return false;
          });
        }, 2500);

        return () => {
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Session verification failed.';
        setErrorMsg(message);
        setIsLoadingSession(false);
      }
    }

    checkSession();
  }, [copy.expiredNote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    });
  };

  if (isLoadingSession) {
    return (
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-14 space-y-3">
          <LoaderCircle className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            {copy.verifying}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-sm border-emerald-500/30 bg-emerald-50/20">
        <CardContent className="flex flex-col items-center text-center py-12 space-y-4">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {copy.successTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {copy.successSub}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userEmail && errorMsg) {
    return (
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Session Expired</h1>
          <p className="text-sm text-muted-foreground">
            {copy.expiredSub}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{errorMsg}</p>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Go to Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="gap-1.5">
        <div className="flex items-center gap-2 text-primary mb-1">
          <KeyRound className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">{copy.badge}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">
          {userEmail ? (
            <>
              {copy.intro}{' '}
              <strong className="text-foreground font-medium">{userEmail}</strong>.
            </>
          ) : (
            'Set your account password to activate your access.'
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="password">Create Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isPending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="h-11 pr-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 size-11 rounded-l-none text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              disabled={isPending}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-medium mt-2"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Saving Password...
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
