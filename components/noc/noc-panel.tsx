'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NocPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  variant?: 'drawer' | 'modal';
  children: ReactNode;
}

// Shared overlay so every NOC tracker panel opens, closes and stacks the same way.
export function NocPanel({
  open,
  onClose,
  title,
  subtitle,
  variant = 'drawer',
  children,
}: NocPanelProps) {
  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-in bg-black/40 backdrop-blur-xs fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'fixed z-40 flex flex-col overflow-hidden border-border bg-background shadow-2xl animate-in duration-200',
          variant === 'drawer'
            ? 'inset-y-0 right-0 w-full border-l slide-in-from-right sm:w-130'
            : 'inset-x-3 top-[5vh] max-h-[90vh] rounded-xl border fade-in zoom-in-95 sm:inset-x-6 lg:inset-x-auto lg:left-1/2 lg:w-full lg:max-w-6xl lg:-translate-x-1/2',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose}>
            <X aria-hidden />
            <span className="sr-only">Close {title}</span>
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
