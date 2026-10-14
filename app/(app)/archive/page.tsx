import { requireCan } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { RestoreButton } from './restore-button';
import { PurgeButton } from './purge-button';
import { DownloadButton } from '../documents/download-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ArchivePage() {
  const user = await requireCan('archive.view');
  const canPurge = can(user.role, 'archive.purge');
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from('documents')
    .select(
      'id, doc_number, title, status_before_archive, archived_at, archiver:profiles!documents_archived_by_fkey(full_name)',
    )
    .eq('status', 'archived')
    .order('archived_at', { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Archive
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Soft-deleted documents. Restore to reactivate or permanently purge
          (Admin only).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doc #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Previous Status</TableHead>
              <TableHead>Archived by</TableHead>
              <TableHead>Archived on</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs?.length ? (
              docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm">
                    {d.doc_number}
                  </TableCell>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell className="capitalize">
                    {d.status_before_archive ?? '-'}
                  </TableCell>
                  <TableCell>{d.archiver?.full_name || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.archived_at
                      ? new Date(d.archived_at).toLocaleString()
                      : '-'}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <DownloadButton documentId={d.id} />
                    <RestoreButton documentId={d.id} />
                    {canPurge && (
                      <PurgeButton documentId={d.id} documentTitle={d.title} />
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No archived documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
