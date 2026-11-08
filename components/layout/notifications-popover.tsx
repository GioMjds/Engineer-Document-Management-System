'use client';

import { useState } from 'react';
import { Bell, Layers, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PushToggle } from '@/components/pwa/push-toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative size-8.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  aria-label="View notifications (to build soon)"
                  aria-expanded={open}
                >
                  <Bell className="size-4" />
                  <span
                    className="absolute top-1.5 right-1.5 flex size-2"
                    aria-hidden="true"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-cyan opacity-60 motion-reduce:hidden" />
                    <span className="relative inline-flex size-2 rounded-full bg-brand-cyan" />
                  </span>
                </Button>
              }
            />
          }
        />
        <TooltipContent side="bottom" sideOffset={6}>
          Notifications
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-80 sm:w-96 p-0 border border-border shadow-lg rounded-lg overflow-hidden bg-popover"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-brand-cyan" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2 py-0.5 text-[10px] font-medium text-brand-cyan">
            <Sparkles className="size-2.5" />
            To build soon
          </span>
        </div>

        {/* Empty State / In-Development Notice */}
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-foreground ring-1 ring-border">
            <Layers className="size-5 text-brand-cyan" aria-hidden="true" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
              <span className="relative inline-flex size-2.5 rounded-full bg-brand-cyan ring-2 ring-popover" />
            </span>
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Notification Center
          </h4>
          <p className="mt-1 max-w-70 text-xs text-muted-foreground leading-relaxed">
            Real-time alerts for drawing revision uploads, authority NOC
            approvals, and stage-gate milestones are currently being built for
            Phase 2.
          </p>
        </div>

        <div className="border-t border-border p-3">
          <PushToggle />
        </div>
      </PopoverContent>
    </Popover>
  );
}
