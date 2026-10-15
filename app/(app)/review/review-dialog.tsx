'use client';

import {
  DrawingReviewModal,
  type ReviewDocument,
} from '@/components/review/drawing-review-modal';

export function ReviewDialog({
  documentId,
  docNumber,
  title,
}: {
  documentId: string;
  docNumber: string;
  title: string;
}) {
  const doc: ReviewDocument = {
    id: documentId,
    project_id: null,
    doc_number: docNumber,
    title,
    description: null,
    discipline: null,
    revision: 'R00',
    file_name: `${docNumber}.pdf`,
    file_size: null,
    createdAt: new Date().toISOString(),
  };

  return <DrawingReviewModal document={doc} />;
}
