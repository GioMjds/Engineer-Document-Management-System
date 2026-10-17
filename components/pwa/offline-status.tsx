'use client';

import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';
import { useOffline } from 'next/offline';
import { useEffect, useRef, useState } from 'react';

export function OfflineStatus() {
  const isOffline = useOffline();
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (isOffline) {
      wasOffline.current = true;
      return;
    }
    if (!wasOffline.current) return;

    wasOffline.current = false;
    setShowRestored(true);
    const timer = setTimeout(() => setShowRestored(false), 3000);
    return () => clearTimeout(timer);
  }, [isOffline]);

  if (!isOffline && !showRestored) return null;

  const Icon = isOffline ? WifiOff : Wifi;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      <div
        className={cn(
          'pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-medium shadow-lg',
          'animate-in fade-in slide-in-from-bottom-2 duration-200',
          isOffline
            ? 'border-warning/30 bg-warning-subtle text-warning-fg'
            : 'border-success/30 bg-success-subtle text-success-fg',
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          {isOffline
            ? "You're offline. Blocked requests will retry automatically when you reconnect."
            : 'Back online'}
        </span>
      </div>
    </div>
  );
}
