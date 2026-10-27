import type { Metadata } from 'next';
import { requireCan } from '@/lib/auth';
import {
  getMasterAuthoritiesWithStats,
  getReviewingAuthoritiesWithStats,
} from '@/app/actions/authorities';
import { AuthoritiesWorkspace } from './authorities-workspace';

export const metadata: Metadata = {
  title: 'Authorities | CVTEC EDMS',
  description:
    'Admin governance: Unified management of statutory Master Authorities and Reviewing Authorities.',
};

export default async function AuthoritiesPage() {
  await requireCan('authority.master.manage');
  const [masterRes, reviewingRes] = await Promise.all([
    getMasterAuthoritiesWithStats(),
    getReviewingAuthoritiesWithStats(),
  ]);

  return (
    <AuthoritiesWorkspace
      initialMasterAuthorities={masterRes.ok ? masterRes.data : []}
      initialReviewingAuthorities={reviewingRes.ok ? reviewingRes.data : []}
    />
  );
}
