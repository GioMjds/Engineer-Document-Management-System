import type { Metadata } from 'next';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InviteUserDialog } from './invite-user-dialog';
import { UserTableClient, type UserRowData } from './user-table-client';
import { normalizeRole, type AppRole } from '@/lib/permissions';

export const metadata: Metadata = {
  title: 'Manage Users',
  description: 'Manage users and their access permissions.',
};

export default async function UsersPage() {
  const me = await requireCan('users.manage');
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [{ data: users }, { data: authData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, active, created_at')
      .order('created_at', { ascending: true }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const authUsersMap = new Map<string, { isPendingInvite: boolean }>();
  authData?.users?.forEach((au) => {
    // Mark as pending if user has invite timestamp and has not yet confirmed or logged in.
    const isPending =
      Boolean(au.invited_at) && !au.confirmed_at && !au.last_sign_in_at;
    authUsersMap.set(au.id, { isPendingInvite: isPending });
  });

  const formattedUsers: UserRowData[] = (users || []).map((u) => ({
    id: u.id,
    full_name: u.full_name || '',
    email: u.email || '',
    role: (normalizeRole(u.role) ?? 'engineer') as AppRole,
    active: u.active !== false,
    created_at: u.created_at,
    isPendingInvite: authUsersMap.get(u.id)?.isPendingInvite ?? false,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            User Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin oversight: Invite team members, manage access permissions, and archive accounts.
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <UserTableClient
        users={formattedUsers}
        currentUserId={me.id}
        currentUserEmail={me.email}
      />
    </div>
  );
}
