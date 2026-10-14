import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { RoleSelect } from './role-select';
import { InviteUserDialog } from './invite-user-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { AppRole } from '@/lib/permissions';

export default async function UsersPage() {
  const me = await requireCan('users.manage');
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active, created_at')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">User Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin oversight: Invite team members and manage access permissions.
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>System Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u) => {
              const isSelf = u.id === me.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-foreground">
                    {u.full_name || '-'}
                    {isSelf && (
                      <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 border-(--site-cyan)/30 text-(--site-cyan)">
                        you
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <RoleSelect
                      userId={u.id}
                      currentRole={u.role as AppRole}
                      isSelf={isSelf}
                    />
                  </TableCell>
                  <TableCell>
                    {u.active !== false ? (
                      <Badge variant="outline" className="text-[11px] font-normal border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] font-normal border-destructive/30 text-destructive bg-destructive/10">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
