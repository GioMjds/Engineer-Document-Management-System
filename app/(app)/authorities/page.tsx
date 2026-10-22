import type { Metadata } from 'next';
import { requireCan } from '@/lib/auth';
import { getMasterAuthoritiesWithStats } from '@/app/actions/authorities';
import { AuthoritiesWorkspace } from './authorities-workspace';

export const metadata: Metadata = {
  title: 'Master Authorities',
  description: 'Manage master authorities and their associated statistics.',
}

export default async function MasterAuthoritiesPage() {
  await requireCan('authority.master.manage');
  const res = await getMasterAuthoritiesWithStats();

  return <AuthoritiesWorkspace initialAuthorities={res.ok ? res.data : []} />;
}
