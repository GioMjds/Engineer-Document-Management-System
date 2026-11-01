'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Archive,
  Building2,
  CheckSquare,
  FileText,
  FolderPlus,
  Landmark,
  Layers,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeft,
  ScrollText,
  Search,
  ShieldCheck,
  Sun,
  Laptop,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { can, navFor, type Capability } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface CommandMenuProps {
  userRole: string;
  onToggleSidebar?: () => void;
  onSignOut?: () => Promise<void>;
  className?: string;
}

// Icon and descriptive metadata for navigation routes.
const NAV_ICON_MAP = {
  'dashboard.view': {
    icon: LayoutDashboard,
    desc: 'Real-time KPIs, submittal alerts, and pipeline stats',
  },
  'project.view': {
    icon: Building2,
    desc: 'Project directory, timelines, and discipline records',
  },
  'noc.view': {
    icon: ShieldCheck,
    desc: 'Authority permits, submissions, and stage gates',
  },
  'noc.matrix.view': {
    icon: Layers,
    desc: 'Master authority matrix, stage requirements, and rules',
  },
  'document.view': {
    icon: FileText,
    desc: 'Engineering drawings, specifications, and revisions',
  },
  'review.queue': {
    icon: CheckSquare,
    desc: 'Pending drawings, markups, and engineering reviews',
  },
  'archive.view': {
    icon: Archive,
    desc: 'Superseded drawings, past revisions, and records',
  },
  'authority.master.manage': {
    icon: Landmark,
    desc: 'DEWA, RTA, Dubai Municipality directories',
  },
  'users.manage': {
    icon: Users,
    desc: 'Staff roles, permissions, and consultant assignments',
  },
  'audit.view': {
    icon: ScrollText,
    desc: 'Immutable event logs and compliance audit trail',
  },
} satisfies Partial<Record<Capability, { icon: LucideIcon; desc: string }>>;

const subscribeToPlatform = () => () => {};
const getIsMac = () =>
  typeof navigator !== 'undefined' &&
  /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

export function CommandMenu({
  userRole,
  onToggleSidebar,
  onSignOut,
  className,
}: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const isMac = useSyncExternalStore(
    subscribeToPlatform,
    getIsMac,
    () => false,
  );
  const router = useRouter();
  const { setTheme } = useTheme();

  // Global keyboard shortcut listener for Ctrl+K and Cmd+K.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to execute selection and close dialog.
  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const permittedNav = navFor(userRole);
  const canCreateProject = can(userRole, 'project.create');

  return (
    <>
      {/* Header Search Trigger Button */}
      <div className={cn('flex items-center', className)}>
        {/* Desktop interactive search bar trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="hidden md:inline-flex h-8.5 w-44 lg:w-60 xl:w-72 justify-between items-center rounded-lg border-border/80 bg-muted/30 px-2.5 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all shadow-2xs group"
          aria-label="Open command palette (Ctrl+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="size-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span className="truncate">Search workspace...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/90 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-2xs">
            <span>{isMac ? '⌘' : 'Ctrl'}</span>
            <span>K</span>
          </kbd>
        </Button>

        {/* Mobile icon button trigger */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          className="md:hidden size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60"
          aria-label="Open command palette (Ctrl+K)"
        >
          <Search className="size-4.5" />
        </Button>
      </div>

      {/* Command Palette Modal Dialog */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Workspace Command Menu"
        description="Search pages, run engineering actions, or configure settings"
      >
        <CommandInput placeholder="Type a command or search pages..." />
        <CommandList>
          <CommandEmpty className="py-8 text-center text-sm">
            <p className="font-medium text-foreground">
              No matching results found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try searching for &ldquo;NOC&rdquo;, &ldquo;projects&rdquo;,
              &ldquo;review&rdquo;, or &ldquo;theme&rdquo;.
            </p>
          </CommandEmpty>

          {/* Quick Actions Group */}
          <CommandGroup heading="Quick Actions">
            {canCreateProject && (
              <CommandItem
                value="New Project Create Register Scope"
                onSelect={() => runCommand(() => router.push('/projects/new'))}
              >
                <FolderPlus className="mr-2 size-4 text-emerald-600 dark:text-emerald-400" />
                <div className="flex flex-col">
                  <span>Register New Project</span>
                  <span className="text-[11px] text-muted-foreground">
                    Initialize project scope and team roles
                  </span>
                </div>
              </CommandItem>
            )}

            {onToggleSidebar && (
              <CommandItem
                value="Toggle Sidebar Collapse Expand Rail"
                onSelect={() => runCommand(onToggleSidebar)}
              >
                <PanelLeft className="mr-2 size-4 text-sky-600 dark:text-sky-400" />
                <div className="flex flex-col">
                  <span>Toggle Sidebar</span>
                  <span className="text-[11px] text-muted-foreground">
                    Switch between icon rail and expanded view
                  </span>
                </div>
                <CommandShortcut>{isMac ? '⌘B' : 'Ctrl+B'}</CommandShortcut>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandSeparator />

          {/* Navigation Pages Group */}
          <CommandGroup heading="Navigation">
            {permittedNav.map((item) => {
              const meta = NAV_ICON_MAP[item.capability as keyof typeof NAV_ICON_MAP];
              const Icon = meta?.icon ?? FileText;
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.href} ${meta?.desc ?? ''}`}
                  onSelect={() =>
                    runCommand(() => router.push(item.href as Route))
                  }
                >
                  <Icon className="mr-2 size-4 text-primary" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{item.label}</span>
                    {meta?.desc && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {meta.desc}
                      </span>
                    )}
                  </div>
                </CommandItem>
              );
            })}

            {/* My Account navigation */}
            <CommandItem
              value="Account Profile Settings Security Password"
              onSelect={() => runCommand(() => router.push('/account'))}
            >
              <User className="mr-2 size-4 text-primary" />
              <div className="flex flex-col">
                <span>My Account</span>
                <span className="text-[11px] text-muted-foreground">
                  Profile details, security, and credentials
                </span>
              </div>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Theme & Appearance Group */}
          <CommandGroup heading="Theme & Appearance">
            <CommandItem
              value="Theme Light Mode Sun Daytime"
              onSelect={() => runCommand(() => setTheme('light'))}
            >
              <Sun className="mr-2 size-4 text-amber-500" />
              <span>Switch to Light Theme</span>
            </CommandItem>
            <CommandItem
              value="Theme Dark Mode Moon Night"
              onSelect={() => runCommand(() => setTheme('dark'))}
            >
              <Moon className="mr-2 size-4 text-indigo-400" />
              <span>Switch to Dark Theme</span>
            </CommandItem>
            <CommandItem
              value="Theme System Default Auto OS"
              onSelect={() => runCommand(() => setTheme('system'))}
            >
              <Laptop className="mr-2 size-4 text-muted-foreground" />
              <span>Use System Theme</span>
            </CommandItem>
          </CommandGroup>

          {/* Session / Account Actions */}
          {onSignOut && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Session">
                <CommandItem
                  value="Sign Out Logout Exit Session"
                  onSelect={() => runCommand(() => void onSignOut())}
                  className="text-destructive focus:text-destructive data-selected:bg-destructive/10"
                >
                  <LogOut className="mr-2 size-4 text-destructive" />
                  <span>Sign Out</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* Dialog keyboard guidance footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3.5 py-2 text-[11px] text-muted-foreground select-none">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-background px-1 py-0.5 font-mono text-[9px] shadow-2xs">
                ↑
              </kbd>
              <kbd className="rounded border border-border/80 bg-background px-1 py-0.5 font-mono text-[9px] shadow-2xs">
                ↓
              </kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-background px-1 py-0.5 font-mono text-[9px] shadow-2xs">
                ↵
              </kbd>
              Select
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[9px] shadow-2xs">
                esc
              </kbd>
              Close
            </span>
          </div>
          <span className="hidden sm:inline text-muted-foreground/80 font-mono text-[10px]">
            CVTEC EDMS
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
