import Link from 'next/link';
import { ArrowLeft, FolderSearch } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ProjectNotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border bg-card p-12 text-center">
      <FolderSearch
        className="mx-auto size-12 text-muted-foreground/60"
        aria-hidden
      />
      <h1 className="text-lg font-semibold">Project not found</h1>
      <p className="text-sm text-muted-foreground">
        This project doesn&apos;t exist, or you haven&apos;t been assigned to
        it. Contact an administrator if you think this is a mistake.
      </p>
      <Link
        href="/noc-tracker"
        className={cn(buttonVariants({ variant: 'outline' }), 'h-10 gap-1.5')}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to projects
      </Link>
    </div>
  );
}
