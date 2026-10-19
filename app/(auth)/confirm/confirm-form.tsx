'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircleAlert, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Handles invitation verification, auth exchange, and initial password creation.
export function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

    async function initAuth() {
      try {
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type') as any;
        const code = searchParams.get('code');

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || 'invite',
          });
          if (error) {
            setErrorMsg(error.message);
            setIsLoadingSession(false);
            return;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(error.message);
            setIsLoadingSession(false);
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUserEmail(session.user.email ?? null);
          setIsLoadingSession(false);
        } else {
          // If hash fragment contains access_token, onAuthStateChange catches it
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            if (currentSession?.user) {
              setUserEmail(currentSession.user.email ?? null);
              setIsLoadingSession(false);
            }
          });

          // Timeout fallback if no session received
          setTimeout(() => {
            setIsLoadingSession(false);
          }, 2500);

          return () => subscription.unsubscribe();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication verification failed';
        setErrorMsg(message);
        setIsLoadingSession(false);
      }
    }

    initAuth();
  }, [searchParams]);

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
      }, 1500);
    });
  };

  if (isLoadingSession) {
    return (
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-14 space-y-3">
          <LoaderCircle className="size-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Verifying invitation access...
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
              Account Activated
            </h2>
            <p className="text-sm text-muted-foreground">
              Your password has been set. Redirecting you to the system dashboard...
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
          <h1 className="text-2xl font-semibold tracking-tight">Invalid Invitation</h1>
          <p className="text-sm text-muted-foreground">
            This invitation or activation link is invalid or has expired.
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
            Return to Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Activate Account</h1>
        <p className="text-sm text-muted-foreground">
          {userEmail ? (
            <>
              Setting up access for{' '}
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
                Activating Account...
              </>
            ) : (
              'Set Password & Sign In'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
