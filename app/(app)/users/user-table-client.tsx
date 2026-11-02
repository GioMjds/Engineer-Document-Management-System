'use client';

import { useState, useMemo } from 'react';
import { Search, X, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleSelect } from './role-select';
import { EditUserDialog } from './edit-user-dialog';
import { ResendInviteButton } from './resend-invite-button';
import { ArchiveUserDialog } from './archive-user-dialog';
import { RestoreUserButton } from './restore-user-button';
import { ROLES, type AppRole } from '@/lib/permissions';

export interface UserRowData {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  active: boolean;
  created_at: string;
  isPendingInvite: boolean;
}

interface UserTableClientProps {
  users: UserRowData[];
  currentUserId: string;
  currentUserEmail?: string | null;
}

type StatusTab = 'all' | 'active' | 'pending' | 'archived';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  ceo: 'CEO',
  area_manager: 'Area Manager',
  resident_engineer: 'Resident Engineer',
  authority_engineer: 'Authority Engineer',
  engineer: 'Engineer',
  dc: 'Document Controller',
};

// Client-side user management table with real-time search, status filtering, and soft delete.
export function UserTableClient({
  users,
  currentUserId,
  currentUserEmail,
}: UserTableClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusTab>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    let archived = 0;

    users.forEach((u) => {
      if (!u.active) {
        archived += 1;
      } else if (u.isPendingInvite) {
        pending += 1;
      } else {
        active += 1;
      }
    });

    return {
      all: users.length,
      active,
      pending,
      archived,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return users.filter((u) => {
      // Status filter
      if (selectedStatus === 'active' && (!u.active || u.isPendingInvite)) {
        return false;
      }
      if (selectedStatus === 'pending' && (!u.active || !u.isPendingInvite)) {
        return false;
      }
      if (selectedStatus === 'archived' && u.active) {
        return false;
      }

      // Role filter
      if (selectedRole !== 'all' && u.role !== selectedRole) {
        return false;
      }

      // Text search
      if (!q) return true;

      const nameMatch = u.full_name?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const roleLabelMatch = (ROLE_LABELS[u.role] ?? u.role)
        .toLowerCase()
        .includes(q);

      return nameMatch || emailMatch || roleLabelMatch;
    });
  }, [users, searchQuery, selectedStatus, selectedRole]);

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full" role="search">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or specialty..."
              className="pl-8 pr-8 h-9 text-xs"
              aria-label="Search users"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('active')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'active'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active ({counts.active})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('pending')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'pending'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('archived')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'archived'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Archived ({counts.archived})
            </button>
          </div>

          <div className="w-40">
            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val ?? 'all')}
              items={[
                { value: 'all', label: 'All Roles' },
                ...ROLES.map((r) => ({
                  value: r,
                  label: ROLE_LABELS[r],
                })),
              ]}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Users className="size-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No users found.</p>
                    <p className="text-xs text-muted-foreground">
                      Try adjusting your search query or status filter.
                    </p>
                    {(searchQuery ||
                      selectedStatus !== 'all' ||
                      selectedRole !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 mt-2"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedStatus('all');
                          setSelectedRole('all');
                        }}
                      >
                        Reset filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => {
                const isSelf =
                  u.id === currentUserId ||
                  (Boolean(currentUserEmail) &&
                    u.email?.toLowerCase() ===
                      currentUserEmail?.toLowerCase());
                const match = u.full_name?.match(/^(.*?)\s*\((.*?)\)$/);
                const displayName = match ? match[1] : u.full_name || '-';
                const specialtyTag = match ? match[2] : null;

                return (
                  <TableRow
                    key={u.id}
                    className={!u.active ? 'opacity-70 bg-muted/20' : undefined}
                  >
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={!u.active ? 'line-through text-muted-foreground' : undefined}>
                          {displayName}
                        </span>
                        {specialtyTag && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal py-0 px-1.5 border border-border bg-muted/60 text-muted-foreground"
                          >
                            {specialtyTag}
                          </Badge>
                        )}
                        {isSelf && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1 border-(--site-cyan)/30 text-(--site-cyan)"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <RoleSelect
                        userId={u.id}
                        currentRole={u.role}
                        isSelf={isSelf}
                      />
                    </TableCell>
                    <TableCell>
                      {!u.active ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal border-destructive/30 text-destructive bg-destructive/10"
                        >
                          Archived
                        </Badge>
                      ) : u.isPendingInvite ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                        >
                          Pending Invite
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        >
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.active && u.isPendingInvite && u.email && (
                          <ResendInviteButton email={u.email} />
                        )}
                        <EditUserDialog
                          user={{
                            id: u.id,
                            full_name: u.full_name || '',
                            email: u.email || '',
                            role: u.role,
                            active: u.active,
                          }}
                          isSelf={isSelf}
                        />
                        {u.active ? (
                          <ArchiveUserDialog
                            userId={u.id}
                            displayName={displayName}
                            email={u.email}
                            disabled={isSelf}
                          />
                        ) : (
                          <RestoreUserButton
                            userId={u.id}
                            displayName={displayName}
                            disabled={isSelf}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
