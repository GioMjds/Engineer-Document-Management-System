import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoaderCircle } from 'lucide-react';
import { BrandPanel } from '../login/brand-panel';
import { ConfirmForm } from './confirm-form';

export const metadata: Metadata = {
  title: 'Activate Account - CVTEC EDMS',
  description: 'Activate your CVTEC EDMS account and set your access password.',
};

export default function ConfirmPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />
      <main className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <LoaderCircle className="size-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading activation details...</p>
            </div>
          }
        >
          <ConfirmForm />
        </Suspense>
      </main>
    </div>
  );
}