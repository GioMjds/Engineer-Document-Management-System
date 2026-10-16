'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  Archive,
  CheckSquare,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { navFor, type Capability } from '@/lib/permissions';
import { cn } from '@/lib/utils';

/** Nav grouping + icons live here; navFor() still decides WHO sees WHAT. */
const NAV_META: Partial<
  Record<Capability, { group: string; icon: LucideIcon }>
> = {
  'dashboard.view': { group: 'Overview', icon: LayoutDashboard },
  'noc.view': { group: 'Authorities', icon: ShieldCheck },
  'noc.matrix.view': { group: 'Authorities', icon: Layers },
  'document.view': { group: 'Documents', icon: FileText },
  'review.queue': { group: 'Documents', icon: CheckSquare },
  'archive.view': { group: 'Documents', icon: Archive },
  'users.manage': { group: 'Administration', icon: Users },
};
const GROUP_ORDER = [
  'Overview',
  'Authorities',
  'Documents',
  'Administration',
  'More',
];

interface AppShellProps {
  user: { email?: string | null; full_name?: string | null; role: string };
  roleLabel: string;
  onSignOut: () => Promise<void>;
  /** Pending counts keyed by nav href. Cleared by the page itself, not here. */
  badges?: Record<string, number>;
  children: ReactNode;
}

export function AppShell({
  user,
  roleLabel,
  onSignOut,
  badges = {},
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = navFor(user.role).map((item) => {
    const meta = NAV_META[item.capability];
    return {
      label: item.label,
      href: item.href as Route,
      group: meta?.group ?? 'More',
      icon: meta?.icon ?? FileText,
      // Match on a segment boundary so '/review' doesn't light up on
      // '/reviews' and '/noc' doesn't light up on '/noc-tracker'.
      active:
        item.href === '/'
          ? pathname === '/'
          : pathname === item.href || pathname.startsWith(`${item.href}/`),
    };
  });
  const navLabels = Object.fromEntries(
    items.map((i) => [i.href as string, i.label]),
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const sidebar = (onNavigate?: () => void) => (
    <SidebarContent
      items={items}
      badges={badges}
      user={user}
      roleLabel={roleLabel}
      onSignOut={onSignOut}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <Link
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-100 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </Link>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-0 h-dvh">{sidebar()}</div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="size-11 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <AppBreadcrumbs navLabels={navLabels} />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl animate-in slide-in-from-left duration-200 motion-reduce:animate-none"
          >
            <Button
              variant="ghost"
              autoFocus
              className="absolute right-2 top-2 z-10 size-11 text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </Button>
            {sidebar(() => setOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SidebarContentProps {
  items: {
    label: string;
    href: Route;
    group: string;
    icon: LucideIcon;
    active: boolean;
  }[];
  badges: Record<string, number>;
  user: AppShellProps['user'];
  roleLabel: string;
  onSignOut: () => Promise<void>;
  onNavigate?: () => void;
}

function SidebarContent({
  items,
  badges,
  user,
  roleLabel,
  onSignOut,
  onNavigate,
}: SidebarContentProps) {
  const groups = GROUP_ORDER.map((name) => ({
    name,
    items: items.filter((i) => i.group === name),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border px-4 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary font-mono text-sm font-black text-sidebar-primary-foreground">
          CV
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">CVTEC EDMS</span>
          <span className="text-xs text-sidebar-foreground/70">
            Consulting Engineers
          </span>
        </span>
      </Link>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
      >
        {groups.map((group) => (
          <div key={group.name}>
            <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
              {group.name}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const count = badges[item.href as string];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={item.active ? 'page' : undefined}
                      className={cn(
                        'relative flex min-h-10 items-center gap-3 rounded-md px-2.5 text-sm font-medium outline-none transition-colors motion-reduce:transition-none',
                        'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                        item.active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                      )}
                    >
                      {item.active && (
                        <span
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary"
                        />
                      )}
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {count ? (
                        <span
                          aria-label={`${count} pending`}
                          className="rounded-full bg-sidebar-primary px-1.5 font-mono text-xs font-semibold tabular-nums text-sidebar-primary-foreground"
                        >
                          {count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account + sign out, spatially separated from navigation */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="px-2 pb-2">
          <p className="truncate text-sm font-semibold">
            {user.full_name || user.email || 'User'}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            {user.email}
          </p>
          <span className="mt-1.5 inline-block rounded border border-sidebar-border px-1.5 py-0.5 text-xs font-medium">
            {roleLabel}
          </span>
        </div>
        <form action={onSignOut}>
          <Button
            type="submit"
            variant="ghost"
            className="h-10 w-full justify-start gap-3 px-2.5 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
