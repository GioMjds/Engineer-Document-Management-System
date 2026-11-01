'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  Archive,
  Building2,
  CheckSquare,
  FileText,
  Landmark,
  Layers,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { AppBreadcrumbs } from '@/components/layout/app-breadcrumbs';
import { CommandMenu } from '@/components/layout/command-menu';
import { NotificationsPopover } from '@/components/layout/notifications-popover';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserProfileMenu } from '@/components/layout/user-profile-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { navFor, type Capability } from '@/lib/permissions';
import { cn } from '@/lib/utils';

// Navigation grouping and icon metadata.
const NAV_META = {
  'dashboard.view': { group: 'Overview', icon: LayoutDashboard },
  'project.view': { group: 'Overview', icon: Building2 },
  'noc.view': { group: 'Authorities', icon: ShieldCheck },
  'noc.matrix.view': { group: 'Authorities', icon: Layers },
  'document.view': { group: 'Documents', icon: FileText },
  'review.queue': { group: 'Documents', icon: CheckSquare },
  'archive.view': { group: 'Documents', icon: Archive },
  'authority.master.manage': { group: 'Administration', icon: Landmark },
  'users.manage': { group: 'Administration', icon: Users },
  'audit.view': { group: 'Administration', icon: ScrollText },
} satisfies Partial<Record<Capability, { group: string; icon: LucideIcon }>>;

const GROUP_ORDER = [
  'Overview',
  'Authorities',
  'Documents',
  'Administration',
  'More',
] as const;

interface AppShellProps {
  user: {
    email?: string | null;
    full_name?: string | null;
    role: string;
    specialty?: string | null;
    engineering_specialty?: string | null;
  };
  roleLabel: string;
  onSignOut: () => Promise<void>;
  badges?: Record<string, number>;
  children: ReactNode;
}

// Redesigned application shell with collapsible sidebar and comprehensive header utilities.
export function AppShell({
  user,
  roleLabel,
  onSignOut,
  badges = {},
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore sidebar state from localStorage safely after mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cvtec_edms_sidebar_collapsed');
      if (stored !== null) {
        window.setTimeout(() => setCollapsed(stored === 'true'), 0);
      }
    } catch {
      // Handle private browsing or blocked storage
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cvtec_edms_sidebar_collapsed', String(next));
      } catch {
        // Storage access might be disabled
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar state.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const targetTag = (e.target as HTMLElement)?.tagName;
        if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const items = navFor(user.role).map((item) => {
    const meta = NAV_META[item.capability as keyof typeof NAV_META];
    return {
      label: item.label,
      href: item.href as Route,
      group: meta?.group ?? 'More',
      icon: meta?.icon ?? FileText,
      active:
        item.href === '/dashboard'
          ? pathname === '/dashboard' ||
            pathname === '/' ||
            pathname.startsWith('/dashboard/')
          : item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(`${item.href}/`),
    };
  });

  const navLabels = Object.fromEntries(
    items.map((i) => [i.href as string, i.label]),
  );

  // Close mobile drawer on Escape key.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <TooltipProvider delay={150} closeDelay={100}>
      <div className="flex min-h-dvh bg-background text-foreground">
        <Link
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-100 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to main content
        </Link>

        {/* Desktop collapsible sidebar */}
        <aside
          className={cn(
            'hidden lg:block shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out',
            collapsed ? 'w-18' : 'w-64',
          )}
        >
          <div className="sticky top-0 h-dvh">
            <SidebarContent
              items={items}
              badges={badges}
              collapsed={collapsed}
              onToggleCollapsed={toggleCollapsed}
            />
          </div>
        </aside>

        {/* Main layout surface */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header with sidebar toggles, breadcrumbs, notifications, theme, and profile */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 sm:gap-3 border-b border-border bg-background/90 px-3 sm:px-6 lg:px-8 backdrop-blur">
            {/* Mobile menu drawer trigger */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-9 lg:hidden text-muted-foreground hover:text-foreground"
              aria-label="Open navigation drawer"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            {/* Desktop collapse toggle */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hidden lg:flex size-8.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                    aria-label={
                      collapsed
                        ? 'Expand sidebar (Ctrl+B)'
                        : 'Collapse sidebar (Ctrl+B)'
                    }
                    aria-expanded={!collapsed}
                    onClick={toggleCollapsed}
                  >
                    {collapsed ? (
                      <PanelLeftOpen className="size-4" />
                    ) : (
                      <PanelLeftClose className="size-4" />
                    )}
                  </Button>
                }
              />
              <TooltipContent side="bottom" sideOffset={6}>
                {collapsed
                  ? 'Expand sidebar (Ctrl+B)'
                  : 'Collapse sidebar (Ctrl+B)'}
              </TooltipContent>
            </Tooltip>

            {/* Dynamic breadcrumb trail */}
            <AppBreadcrumbs navLabels={navLabels} />

            {/* Right utility deck with Command Menu (Ctrl+K), Notifications, Theme, and Profile */}
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <CommandMenu
                userRole={user.role}
                onToggleSidebar={toggleCollapsed}
                onSignOut={onSignOut}
              />
              <NotificationsPopover />
              <ThemeToggle />
              <div
                className="h-5 w-px bg-border/80 mx-0.5 sm:mx-1 hidden sm:block"
                aria-hidden="true"
              />
              <UserProfileMenu
                user={user}
                roleLabel={roleLabel}
                onSignOut={onSignOut}
              />
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-5 sm:px-6 sm:py-6 lg:px-8 outline-none"
          >
            {children}
          </main>
        </div>

        {/* Mobile slide-over navigation drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
              aria-hidden="true"
              onClick={() => setMobileOpen(false)}
            />
            <div
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Main navigation"
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground shadow-2xl animate-in slide-in-from-left duration-200 motion-reduce:animate-none flex flex-col"
            >
              <Button
                variant="ghost"
                autoFocus
                className="absolute right-2 top-2 z-10 size-9 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-4.5" />
              </Button>
              <SidebarContent
                items={items}
                badges={badges}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
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
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
}

// Internal sidebar component rendering logo, grouped navigation, and collapse toggle.
function SidebarContent({
  items,
  badges,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: SidebarContentProps) {
  const groups = GROUP_ORDER.map((name) => ({
    name,
    items: items.filter((i) => i.group === name),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand Header */}
      {collapsed ? (
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-sidebar-border">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/dashboard"
                  onClick={onNavigate}
                  className="flex size-10 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  aria-label="CVTEC EDMS Dashboard"
                >
                  <Image
                    src="/cvtec-logo.svg"
                    alt="CVTEC Logo"
                    width={28}
                    height={28}
                    quality={100}
                    loading="lazy"
                  />
                </Link>
              }
            />
            <TooltipContent side="right" sideOffset={12}>
              CVTEC EDMS
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border px-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Image
            src="/cvtec-logo.svg"
            alt="CVTEC Logo"
            width={34}
            height={34}
            quality={100}
            loading="lazy"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              CVTEC EDMS
            </span>
            <span className="text-[11px] text-sidebar-foreground/70">
              Consulting Engineers
            </span>
          </span>
        </Link>
      )}

      {/* Nav List */}
      <nav
        aria-label="Main navigation"
        className={cn(
          'flex-1 overflow-y-auto py-4',
          collapsed ? 'space-y-4 px-2' : 'space-y-5 px-3',
        )}
      >
        {groups.map((group, groupIdx) => (
          <div key={group.name}>
            {collapsed ? (
              groupIdx > 0 && (
                <div
                  className="mx-1 my-2 border-t border-sidebar-border/60"
                  aria-hidden="true"
                />
              )
            ) : (
              <p className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                {group.name}
              </p>
            )}

            <ul className={cn(collapsed ? 'space-y-1.5' : 'space-y-0.5')}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const count = badges[item.href as string];

                if (collapsed) {
                  return (
                    <li key={item.href} className="flex justify-center">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Link
                              href={item.href}
                              onClick={onNavigate}
                              aria-current={item.active ? 'page' : undefined}
                              aria-label={
                                count
                                  ? `${item.label} (${count} pending)`
                                  : item.label
                              }
                              className={cn(
                                'relative flex size-10 items-center justify-center rounded-md outline-none transition-colors motion-reduce:transition-none',
                                'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                                item.active
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-xs'
                                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                              )}
                            >
                              <Icon
                                className="size-5 shrink-0"
                                aria-hidden="true"
                              />
                              {count ? (
                                <span
                                  className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-sidebar-primary font-mono text-[9px] font-bold text-sidebar-primary-foreground ring-2 ring-sidebar"
                                  aria-hidden="true"
                                >
                                  {count > 99 ? '99+' : count}
                                </span>
                              ) : null}
                            </Link>
                          }
                        />
                        <TooltipContent
                          side="right"
                          sideOffset={12}
                          className="flex items-center gap-2"
                        >
                          <span className="font-medium">{item.label}</span>
                          {count ? (
                            <span className="rounded-full bg-sidebar-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sidebar-primary-foreground">
                              {count}
                            </span>
                          ) : null}
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                }

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
                      <span className="flex-1 truncate">{item.label}</span>
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

      {/* Sidebar Footer with Collapse/Expand Action */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        {onToggleCollapsed &&
          (collapsed ? (
            <div className="flex justify-center">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={onToggleCollapsed}
                      className="size-9 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      aria-label="Expand sidebar navigation"
                    >
                      <PanelLeftOpen className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  Expand sidebar (Ctrl+B)
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onToggleCollapsed}
              className="h-9 w-full justify-between px-2.5 text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              aria-label="Collapse sidebar navigation"
            >
              <span className="flex items-center gap-2.5">
                <PanelLeftClose className="size-4" />
                <span>Collapse sidebar</span>
              </span>
              <kbd className="hidden sm:inline-block rounded border border-sidebar-border bg-sidebar-accent/40 px-1.5 py-0.5 font-mono text-[10px] text-sidebar-foreground/60">
                Ctrl+B
              </kbd>
            </Button>
          ))}
      </div>
    </div>
  );
}
