'use client';

import { useEffect, useState } from 'react';
import { BellOff, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type PushState = 'loading' | 'unsupported' | 'denied' | 'off' | 'on';

// VAPID public key arrives as base64url; the Push API needs raw bytes.
function keyToBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function getRegistration() {
  return navigator.serviceWorker.ready;
}

export function PushToggle() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (
      !publicKey ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    void getRegistration()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'on' : 'off'));
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await getRegistration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(publicKey),
        }));
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error('save failed');
      setState('on');
      toast.success('Push notifications enabled on this device.');
    } catch {
      toast.error('Could not enable push notifications. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await (await getRegistration()).pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState('off');
    } catch {
      toast.error('Could not disable push notifications. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading' || state === 'unsupported') return null;

  if (state === 'denied') {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellOff className="size-3.5 shrink-0" aria-hidden="true" />
        Notifications are blocked. Allow them in your browser site settings.
      </p>
    );
  }

  const isOn = state === 'on';
  return (
    <Button
      variant={isOn ? 'outline' : 'default'}
      size="sm"
      className="min-h-9 w-full"
      disabled={busy}
      onClick={isOn ? disable : enable}
    >
      {isOn ? (
        <BellOff className="size-3.5" aria-hidden="true" />
      ) : (
        <BellRing className="size-3.5" aria-hidden="true" />
      )}
      {isOn ? 'Turn off push on this device' : 'Turn on push notifications'}
    </Button>
  );
}
