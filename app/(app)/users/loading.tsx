import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { Search, ChevronDown, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Standard 6-row uniform structural skeleton matrix.
const SKELETON_ROWS = [
  { nameW: 130, specW: 90, emailW: 175, roleW: 110, statusW: 50, dateW: 70 },
  { nameW: 115, specW: 80, emailW: 160, roleW: 125, statusW: 50, dateW: 72 },
  { nameW: 125, specW: null, emailW: 190, roleW: 95, statusW: 78, dateW: 74 },
  { nameW: 110, specW: 85, emailW: 170, roleW: 105, statusW: 50, dateW: 68 },
  { nameW: 105, specW: 75, emailW: 155, roleW: 120, statusW: 62, dateW: 70 },
  { nameW: 135, specW: 95, emailW: 185, roleW: 115, statusW: 50, dateW: 72 },
];

function Bone({
  w = '100%',
  h = 12,
  r = 'calc(var(--radius) * 0.8)',
  circle = false,
  className,
}: {
  w?: number | string;
  h?: number;
  r?: number | string;
  circle?: boolean;
  className?: string;
}) {
  return (
    <Skeleton
      width={circle ? h : w}
      height={h}
      circle={circle}
      borderRadius={circle ? undefined : r}
      containerClassName={cn('block shrink-0 leading-none', className)}
    />
  );
}

export default function UsersLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading user management directory...</span>

      <SkeletonTheme
        baseColor="var(--skeleton-base)"
        highlightColor="var(--skeleton-highlight)"
        duration={1.5}
      >
        <div
          className="space-y-6 select-none pointer-events-none"
          aria-hidden="true"
        >
          {/* Header matching page.tsx */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                User Management
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Admin oversight: Invite team members, manage access permissions, and archive accounts.
              </p>
            </div>
            {/* Solid invite button placeholder matching InviteUserDialog */}
            <div className="h-8 rounded-md bg-(--site-cyan) px-2.5 flex items-center gap-1.5 text-white shadow-xs opacity-90">
              <UserPlus className="h-4 w-4" />
              <span className="text-xs font-medium">Invite User</span>
            </div>
          </div>

          {/* UserTableClient Controls */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search input wireframe */}
              <div className="flex flex-1 items-center gap-2 max-w-md">
                <div className="relative w-full">
                  <Search
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60"
                  />
                  <div className="h-9 rounded-md border border-input bg-background/50 pl-8 pr-3 flex items-center text-xs text-muted-foreground/60">
                    Search by name, email, or specialty...
                  </div>
                </div>
              </div>

              {/* Status pills with preserved static labels and dynamic count bones */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs text-muted-foreground">
                  <span className="px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 bg-background text-foreground shadow-2xs">
                    All <Bone w={14} h={10} r={4} />
                  </span>
                  <span className="px-2.5 py-1 font-medium flex items-center gap-1.5">
                    Active <Bone w={14} h={10} r={4} />
                  </span>
                  <span className="px-2.5 py-1 font-medium flex items-center gap-1.5">
                    Pending <Bone w={14} h={10} r={4} />
                  </span>
                  <span className="px-2.5 py-1 font-medium flex items-center gap-1.5">
                    Archived <Bone w={14} h={10} r={4} />
                  </span>
                </div>

                {/* Role select wireframe */}
                <div className="w-40">
                  <div className="h-9 rounded-md border border-input bg-background/50 px-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>All Roles</span>
                    <ChevronDown className="size-3.5 text-muted-foreground/60 shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Users Data Table */}
            <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-52 text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SKELETON_ROWS.map((row, idx) => (
                    <TableRow key={idx}>
                      {/* User name + optional discipline tag */}
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Bone w={row.nameW} h={13} />
                          {row.specW && (
                            <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted/60">
                              <Bone w={row.specW} h={10} r={4} />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="text-muted-foreground">
                        <Bone w={row.emailW} h={12} />
                      </TableCell>

                      {/* System Role dropdown container */}
                      <TableCell>
                        <div className="h-9 w-52 rounded-md border border-input bg-background/50 px-3 flex items-center justify-between">
                          <Bone w={row.roleW} h={12} />
                          <ChevronDown className="size-3.5 text-muted-foreground/60 shrink-0" />
                        </div>
                      </TableCell>

                      {/* Status badge pill */}
                      <TableCell>
                        <div className="inline-flex items-center px-2 py-0.5 rounded border border-border bg-muted/40">
                          <Bone w={row.statusW} h={12} r={4} />
                        </div>
                      </TableCell>

                      {/* Joined date */}
                      <TableCell className="text-xs text-muted-foreground">
                        <Bone w={row.dateW} h={12} />
                      </TableCell>

                      {/* Neutral action button placeholders without dead-click icons */}
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="h-7 w-12 rounded-md border border-border/80 bg-background/50 flex items-center justify-center">
                            <Bone w={26} h={10} />
                          </div>
                          <div className="h-7 w-16 rounded-md border border-border/80 bg-background/50 flex items-center justify-center">
                            <Bone w={38} h={10} />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </SkeletonTheme>
    </div>
  );
}
