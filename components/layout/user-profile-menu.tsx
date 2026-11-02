'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HardHat, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface UserProfileMenuProps {
  user: {
    email?: string | null;
    full_name?: string | null;
    role: string;
    specialty?: string | null;
    engineering_specialty?: string | null;
  };
  roleLabel: string;
  onSignOut: () => Promise<void>;
}

// Extract initials from user full name or email for high-density avatar badge.
function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'ED';
}

// User profile trigger and popover containing account overview and log out action.
export function UserProfileMenu({
  user,
  roleLabel,
  onSignOut,
}: UserProfileMenuProps) {
  const [open, setOpen] = useState(false);

  // Check if system role is Engineer.
  const isEngineer =
    user.role?.toLowerCase() === 'engineer' ||
    roleLabel?.toLowerCase() === 'engineer';

  // Extract base name and parenthetical specialty from full_name if present.
  const match = user.full_name?.match(/^(.*?)\s*\((.*?)\)$/);
  const parsedName = match ? match[1].trim() : (user.full_name || '').trim();
  const parsedSpecialty = match ? match[2].trim() : null;

  // Resolve engineering specialty only if user role is Engineer.
  const engineeringSpecialty = isEngineer
    ? (user.engineering_specialty || user.specialty || parsedSpecialty)
    : null;

  const displayName = parsedName || user.email || 'User';
  const initials = getInitials(parsedName || user.full_name, user.email);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="flex h-9 items-center gap-2 rounded-lg px-1.5 sm:px-2 py-1 text-left transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="User profile and account options"
            aria-expanded={open}
          >
            {/* User Avatar Circle */}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-navy font-bold text-white shadow-2xs ring-1 ring-border dark:bg-brand-cyan dark:text-brand-navy-deep text-[11px]">
              {initials}
            </span>

            <ChevronDown className="size-3 text-muted-foreground shrink-0 hidden sm:block" />
          </Button>
        }
      />

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-72 p-0 border border-border shadow-lg rounded-lg overflow-hidden bg-popover"
      >
        {/* User Identity Header */}
        <div className="border-b border-border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white shadow-xs ring-1 ring-border dark:bg-brand-cyan dark:text-brand-navy-deep">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold text-foreground"
                title={displayName}
              >
                {displayName}
              </p>
              <p
                className="truncate text-xs text-muted-foreground"
                title={user.email ?? ''}
              >
                {user.email || 'No email provided'}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
              <Shield className="size-3 text-brand-cyan" />
              {roleLabel}
            </span>
            {isEngineer && engineeringSpecialty && (
              <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <HardHat className="size-3 text-brand-cyan shrink-0" />
                {engineeringSpecialty}
              </span>
            )}
          </div>
        </div>

        {/* Quick Account Navigation Links */}
        <div className="p-1.5">
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-foreground/90 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <UserIcon className="size-4 text-muted-foreground" />
            <span>Account Profile</span>
          </Link>
        </div>

        {/* Basic Sign Out Action */}
        <div className="border-t border-border p-1.5 bg-muted/15">
          <form action={onSignOut} onSubmit={() => setOpen(false)}>
            <Button
              type="submit"
              variant="ghost"
              className="h-8.5 w-full justify-start gap-2.5 rounded-md px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </Button>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
