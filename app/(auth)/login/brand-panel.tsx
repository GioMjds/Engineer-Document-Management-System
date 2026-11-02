import Image from 'next/image';
import { BellRing, FileCheck2, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: BellRing,
    title: 'Authority NOC tracking',
    description:
      'Every NOC per project, with expiry alerts well ahead of time.',
  },
  {
    icon: FileCheck2,
    title: 'Controlled review & approval',
    description:
      'Submissions move through RE and AM sign-off with a full history.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    description: 'People only see the projects and files they are assigned to.',
  },
];

export function BrandPanel() {
  return (
    <aside className="relative isolate flex flex-col justify-between overflow-hidden border-b border-white/10 bg-brand-navy-deep px-6 py-5 text-white sm:px-10 lg:border-b-0 lg:px-14 lg:py-12">
      {/* Blueprint grid: decorative, fades out from the top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-size:40px_40px mask-[radial-gradient(ellipse_at_top_left,black,transparent_75%)]"
      />
      {/* Soft brand glow, desktop only */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 -z-10 hidden size-96 rounded-full bg-brand-cyan/20 blur-3xl lg:block"
      />

      {/* The logo wordmark is white, so it must always sit on a dark surface. */}
      <Image
        src="/cvtec-logo.svg"
        alt="CVTEC Consulting Engineers"
        width={260}
        height={86}
        priority
        className="h-auto w-40 lg:w-52"
      />

      <div className="hidden max-w-md space-y-10 lg:block">
        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-widest text-brand-cyan uppercase">
            EDMS
          </p>
          <p className="text-3xl leading-tight font-semibold text-balance xl:text-4xl">
            Engineering Document Management System
          </p>
          <p className="text-base leading-relaxed text-white/70">
            One secure place for project documents, authority approvals and
            status, replacing scattered folders and spreadsheets.
          </p>
        </div>

        <ul className="space-y-5">
          {features.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-cyan/15 text-brand-cyan ring-1 ring-brand-cyan/30">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm leading-relaxed text-white/65">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="hidden text-xs text-white/50 lg:block">
        © {new Date().getFullYear()} CVTEC Consulting Engineers. Authorized
        users only.
      </p>
    </aside>
  );
}
