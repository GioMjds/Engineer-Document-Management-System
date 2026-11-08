import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { NocMatrixWorkspace } from '@/components/matrix/noc-matrix-workspace';
import { canEditMatrix } from '@/lib/noc-constants';
import {
  getMatrixTemplates,
  getMatrixRevisions,
  getMasterAuthorities,
  getReviewingAuthorities,
} from './actions';

export const metadata: Metadata = {
  title: 'Authority NOC Matrix Templates | CVTEC EDMS',
  description:
    'Standard statutory approval frameworks, sequential prerequisites, and baseline templates across Dubai authorities.',
};

export default async function NocMatrixPage() {
  const user = await requireUser();
  const canEdit = canEditMatrix(user.role);

  const [masterAuthRes, revAuthRes] = await Promise.all([
    getMasterAuthorities(),
    getReviewingAuthorities(),
  ]);

  const masterAuthorities = masterAuthRes.ok ? masterAuthRes.data : [];
  const reviewingAuthorities = revAuthRes.ok ? revAuthRes.data : [];
  const initialAuthorityId = masterAuthorities[0]?.id ?? 0;

  const [templatesRes, revisionsRes] =
    initialAuthorityId > 0
      ? await Promise.all([
          getMatrixTemplates(initialAuthorityId),
          getMatrixRevisions(initialAuthorityId),
        ])
      : [
          { ok: true, data: [] },
          { ok: true, data: [] },
        ];

  return (
    <div className="py-2">
      <NocMatrixWorkspace
        initialAuthorityId={initialAuthorityId}
        initialItems={templatesRes.ok ? templatesRes.data : []}
        initialRevisions={revisionsRes.ok ? revisionsRes.data : []}
        currentUserRole={user.role}
        canEdit={canEdit}
        initialMasterAuthorities={masterAuthorities}
        initialReviewingAuthorities={reviewingAuthorities}
      />
    </div>
  );
}
