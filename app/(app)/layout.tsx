import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';

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
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <AppHeader
        user={{
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        }}
        roleLabel={roleLabelMap[user.role] ?? user.role.replace('_', ' ')}
        onSignOut={signOut}
      />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
