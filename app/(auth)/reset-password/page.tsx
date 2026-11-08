import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoaderCircle } from 'lucide-react';
import { BrandPanel } from '../login/brand-panel';
import { SetPasswordForm } from '../set-password/set-password-form';

export const metadata: Metadata = {
  title: 'Reset Your Password - CVTEC EDMS',
  description: 'Choose a new password for your CVTEC EDMS account.',
};

export default function ResetPasswordPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />
      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <LoaderCircle className="size-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          }
        >
          <SetPasswordForm mode="reset" />
        </Suspense>
      </main>
    </div>
  );
}
