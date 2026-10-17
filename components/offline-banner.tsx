'use client';

import { useOffline } from 'next/offline';

export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;
}