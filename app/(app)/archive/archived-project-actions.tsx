'use client';

import { useState, useTransition } from 'react';
import { Undo2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { restoreProjectAction } from '@/app/actions/admin';
import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog';

export function ArchivedProjectActions({
  project,
}: {
  project: {
    id: string;
    code: string;
    name: string;
  };
}) {
  const [isRestoring, startRestore] = useTransition();
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);

  const handleRestore = () => {
    startRestore(async () => {
      const res = await restoreProjectAction(project.id);
      if (!res.ok) {
        toast.error(res.error || 'Failed to restore project.');
        return;
      }
      toast.success(`Project ${project.code} restored to active portfolio.`);
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={isRestoring}
          className="h-7 px-2 text-xs gap-1"
        >
          {isRestoring ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Undo2 className="size-3" />
          )}
          <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsPurgeOpen(true)}
          disabled={isRestoring}
          className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
        >
          <Trash2 className="size-3" />
          <span>Purge</span>
        </Button>
      </div>

      {isPurgeOpen && (
        <DeleteProjectDialog
          open={isPurgeOpen}
          onOpenChange={setIsPurgeOpen}
          project={project}
        />
      )}
    </>
  );
}
