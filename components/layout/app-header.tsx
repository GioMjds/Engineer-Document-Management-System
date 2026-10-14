'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  CheckSquare,
  Users,
  Archive,
  LogOut,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { navFor, type Capability } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<Capability, React.ComponentType<{ className?: string }>> = {
  'dashboard.view': LayoutDashboard,
  'noc.view': ShieldCheck,
  'noc.matrix.view': Layers,
  'document.view': FileText,
  'review.queue': CheckSquare,
  'archive.view': Archive,
  'users.manage': Users,
  'project.viewAll': LayoutDashboard,
  'project.create': LayoutDashboard,
  'project.contacts.manage': LayoutDashboard,
  'document.upload': FileText,
  'document.edit': FileText,
  'document.edit.own': FileText,
  'document.archive': Archive,
  'archive.restore': Archive,
  'archive.purge': Archive,
  'review.decide': CheckSquare,
  'review.escalate': CheckSquare,
  'noc.tracker.update': ShieldCheck,
  'noc.sequence.override': ShieldCheck,
  'noc.matrix.edit': Layers,
  'amount.consultant.view': LayoutDashboard,
  'amount.contractor.view': LayoutDashboard,
  'expiry.notify': ShieldCheck,
};

interface AppHeaderProps {
  user: {
    email?: string | null;
    full_name?: string | null;
    role: string;
  };
  roleLabel: string;
  onSignOut: () => Promise<void>;
}

export function AppHeader({
  user,
  roleLabel,
  onSignOut,
}: AppHeaderProps) {
  const pathname = usePathname();

  const allowedNav = navFor(user.role);

  const navItems = allowedNav.map((item) => {
    const isDashboard = item.href === '/';
    const active = isDashboard ? pathname === '/' : pathname.startsWith(item.href);
    return {
      label: item.label,
      href: item.href as Route,
      icon: ICON_MAP[item.capability] ?? FileText,
      active,
    };
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md supports-backdrop-filter:bg-card/85 transition-colors">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Identity */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-(--site-navy) text-white shadow-xs ring-1 ring-(--site-cyan)/40 transition group-hover:scale-105 dark:bg-[#070e1a] dark:ring-(--site-cyan)/60">
              <span className="font-mono text-sm font-black tracking-wider text-(--site-cyan)">
                CV
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-heading text-base font-bold tracking-tight text-foreground">
                  CVTEC
                </span>
                <Badge
                  variant="outline"
                  className="h-4.5 rounded px-1.5 py-0 font-mono text-[10px] font-semibold text-(--site-cyan) border-(--site-cyan)/30 bg-(--site-cyan)/10"
                >
                  EDMS
                </Badge>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Consulting Engineers
              </span>
            </div>
          </Link>

          {/* Vertical divider */}
          <div className="hidden h-6 w-px bg-border md:block" />

          {/* Primary Navigation Tabs */}
          <nav
            aria-label="Main Navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                    item.active
                      ? 'bg-(--site-cyan)/15 text-(--site-cyan) dark:text-(--site-cyan) font-bold'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      item.active
                        ? 'text-(--site-cyan)'
                        : 'text-muted-foreground',
                    )}
                  />
                  <span>{item.label}</span>
                  {item.active && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-(--site-cyan)" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Utility Deck */}
        <div className="flex items-center gap-3">
          {/* Mobile Navigation Dropdown/Scroll (visible on small screens) */}
          <div className="flex items-center gap-1 md:hidden">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    'rounded-md p-1.5 transition',
                    item.active
                      ? 'bg-(--site-cyan)/20 text-(--site-cyan)'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* User & Role Badge */}
          <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-foreground leading-tight max-w-35 truncate">
                {user.full_name || user.email || 'User'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {user.email}
              </span>
            </div>
            <Badge
              variant="secondary"
              className="text-[11px] font-medium border border-border"
            >
              {roleLabel}
            </Badge>
          </div>

          {/* Sign Out */}
          <form action={onSignOut}>
            <Button
              variant="ghost"
              size="icon-sm"
              type="submit"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
