'use client';

import { useOffline } from 'next/offline';

export default function Loading() {
  const isOffline = useOffline();

  return (
    <div>
      {isOffline ? 'Waiting for connection to load this page...' : 'Loading...'}
    </div>
  );
}
