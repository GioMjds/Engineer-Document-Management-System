import Link from 'next/link';
import { ArrowLeft, FolderSearch, Link2Off, ShieldAlert } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const REASONS = [
  { icon: Link2Off, text: 'The project code or link is incorrect.' },
  { icon: ShieldAlert, text: 'You are not assigned to this project.' },
];

export default function ProjectNotFound() {
  return (
    <section
      aria-labelledby="project-not-found-title"
      className="mx-auto flex min-h-[60dvh] max-w-lg items-center px-4"
    >
      <div className="relative w-full overflow-hidden rounded-xl border bg-card p-8 text-center shadow-sm sm:p-12">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20"
        />

        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
          <FolderSearch className="size-9 text-primary" aria-hidden />
        </div>

        <p className="mt-6 inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
          Error 404
        </p>

        <h1
          id="project-not-found-title"
          className="mt-3 text-2xl font-semibold tracking-tight text-balance"
        >
          Project not found
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
          We could not find the project you are looking for. It may have been
          moved or removed.
        </p>

        <ul className="mt-6 space-y-2 rounded-lg border bg-muted/40 p-4 text-left text-sm">
          {REASONS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <Icon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/noc-tracker"
          className={cn(buttonVariants(), 'mt-6 h-10 gap-1.5 px-5')}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to projects
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          Still stuck? Contact an administrator.
        </p>
      </div>
    </section>
  );
}
