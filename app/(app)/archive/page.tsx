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
    .select(`
      id,
      doc_number,
      title,
      status_before_archive,
      archived_at,
      projects (
        code,
        description
      ),
      archiver:profiles!documents_archived_by_fkey (
        full_name
      )
    `)
    .eq('status', 'archived')
    .order('archived_at', { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Archive
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Soft-deleted documents across assigned projects. Restore to reactivate, or permanently purge (Admin only).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-32 font-semibold">Doc #</TableHead>
              <TableHead className="min-w-48 font-semibold">Title</TableHead>
              <TableHead className="w-24 font-semibold">Project</TableHead>
              <TableHead className="w-32 font-semibold">Previous Status</TableHead>
              <TableHead className="w-36 font-semibold">Archived by</TableHead>
              <TableHead className="w-36 font-semibold">Archived on</TableHead>
              <TableHead className="w-36 text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs?.length ? (
              docs.map((d) => {
                const proj = d.projects as { code: string; description: string } | null;
                const archiver = d.archiver as { full_name: string } | null;

                return (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                      {d.doc_number}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{d.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {proj?.code || '-'}
                    </TableCell>
                    <TableCell className="capitalize text-xs">
                      {d.status_before_archive ?? '-'}
                    </TableCell>
                    <TableCell className="text-xs">{archiver?.full_name || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {d.archived_at
                        ? new Date(d.archived_at).toLocaleString()
                        : '-'}
                    </TableCell>
                    <TableCell className="flex justify-end gap-1.5 whitespace-nowrap">
                      <DownloadButton documentId={d.id} />
                      <RestoreButton documentId={d.id} />
                      {canPurge && (
                        <PurgeButton documentId={d.id} documentTitle={d.title} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-10"
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
