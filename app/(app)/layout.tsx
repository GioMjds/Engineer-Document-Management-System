import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: {
    default: 'CVTEC EDMS | Engineering Document Management',
    template: '%s | CVTEC EDMS',
  },
  description:
    'High-density engineering document management, authority NOC compliance, and workflow tracking for CVTEC Consulting Engineers',
};

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();

  const roleLabelMap = {
    admin: 'Admin',
    ceo: 'CEO',
    area_manager: 'Area Manager',
    resident_engineer: 'Resident Engineer',
    authority_engineer: 'Authority Engineer',
    dc: 'Document Controller',
    engineer: 'Engineer',
  } satisfies Record<string, string>;

  return (
    <AppShell
      user={{
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        specialty: user.specialty,
      }}
      roleLabel={roleLabelMap[user.role] ?? user.role.replace('_', ' ')}
      onSignOut={signOut}
      // Optional: pass pending counts keyed by nav href, e.g. { '/review': 4 }
      // badges={await getNavBadges(user)}
    >
      {children}
    </AppShell>
  );
}
