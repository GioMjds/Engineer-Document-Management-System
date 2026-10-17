import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Offline | Engineer Document Control',
  description: 'You are currently working in offline mode.',
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <WifiOff className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Connection Unavailable
        </h1>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          The engineering document portal requires an active connection to sync document revisions and authority NOC matrices.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/">
            <Button size="sm" className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Reconnect
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
