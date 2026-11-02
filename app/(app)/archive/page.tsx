import { requireCan } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { RestoreButton } from './restore-button';
import { PurgeButton } from './purge-button';
import { DownloadButton } from '../documents/download-button';
import { ArchivedProjectActions } from './archived-project-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, FileText } from 'lucide-react';

export default async function ArchivePage() {
  const user = await requireCan('archive.view');
  const canPurge = can(user.role, 'archive.purge');
  const canDeleteProject = can(user.role, 'project.delete');
  const supabase = await createClient();

  // Fetch soft-deleted documents
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

  // Fetch soft-deleted projects for Admin
  let archivedProjects: Array<{
    id: string;
    code: string;
    description: string;
    stage: string;
    archived_at: string | null;
  }> = [];

  if (canDeleteProject) {
    const { data: dbProjects } = await supabase
      .from('projects')
      .select('id, code, description, stage, archived_at')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });

    if (dbProjects) {
      archivedProjects = dbProjects;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Archive
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Soft-deleted projects and documents across assigned projects. Restore to reactivate, or permanently purge (Admin only).
        </p>
      </div>

      {/* Admin Archived Projects Section */}
      {canDeleteProject && (
        <section aria-label="Archived Projects" className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Archived Projects
            </h3>
            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
              {archivedProjects.length}
            </Badge>
          </div>

          <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-28 font-semibold">Code</TableHead>
                  <TableHead className="min-w-48 font-semibold">Project Name</TableHead>
                  <TableHead className="w-32 font-semibold">Stage</TableHead>
                  <TableHead className="w-40 font-semibold">Archived On</TableHead>
                  <TableHead className="w-36 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedProjects.length > 0 ? (
                  archivedProjects.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {p.code}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {p.description}
                      </TableCell>
                      <TableCell className="capitalize text-xs text-muted-foreground">
                        {p.stage || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {p.archived_at
                          ? new Date(p.archived_at).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <ArchivedProjectActions
                          project={{
                            id: p.id,
                            code: p.code,
                            name: p.description,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8 text-xs"
                    >
                      No archived projects.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Archived Documents Section */}
      <section aria-label="Archived Documents" className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Archived Documents
          </h3>
          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
            {docs?.length ?? 0}
          </Badge>
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
                    className="text-center text-muted-foreground py-8 text-xs"
                  >
                    No archived documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
