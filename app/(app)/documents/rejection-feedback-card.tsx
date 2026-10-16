'use client';

import { useState } from 'react';
import { AlertCircle, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentRevisionModal } from './document-revision-modal';

interface RejectionFeedbackCardProps {
  document: {
    id: string;
    doc_number: string;
    title: string;
    revision: string;
    file_name: string;
    uploaded_by?: string;
  };
  review: {
    reviewerName?: string;
    level: string;
    comment: string | null;
    createdAt: string;
  };
  canUploadRevision: boolean;
}

export function RejectionFeedbackCard({
  document,
  review,
  canUploadRevision,
}: RejectionFeedbackCardProps) {
  const [revisionOpen, setRevisionOpen] = useState(false);
  const reviewerRoleTitle =
    review.level === 're'
      ? 'Resident Engineer'
      : review.level === 'am'
        ? 'Area Manager'
        : 'Admin';

  return (
    <div className="mt-2 rounded-md border border-red-200 bg-red-50/60 p-3 text-xs dark:border-red-900/50 dark:bg-red-950/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="space-y-1">
            <div className="font-semibold text-red-900 dark:text-red-300">
              Rejection Feedback ({reviewerRoleTitle})
              {review.reviewerName && ` — ${review.reviewerName}`}
            </div>
            <div className="text-red-800 dark:text-red-300/90 whitespace-pre-wrap">
              {review.comment || 'No specific feedback notes provided.'}
            </div>
            <div className="text-[10px] text-red-600 dark:text-red-400/80">
              {new Date(review.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {canUploadRevision && (
          <div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-red-300 bg-white text-xs font-semibold text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:bg-card dark:text-red-300 dark:hover:bg-red-950"
              onClick={() => setRevisionOpen(true)}
            >
              <FileUp className="h-3 w-3" />
              Upload Revision
            </Button>
            <DocumentRevisionModal
              open={revisionOpen}
              onOpenChange={setRevisionOpen}
              document={document}
            />
          </div>
        )}
      </div>
    </div>
  );
}
