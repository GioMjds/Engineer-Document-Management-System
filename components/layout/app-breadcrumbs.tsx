'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface Crumb {
  label: string;
  href: Route;
}

/**
 * Label for a dynamic segment, keyed by its PARENT segment.
 * e.g. /noc-tracker/23015 -> "Project 23015".
 * Add a line here when a new [param] route appears.
 */
const DYNAMIC_SEGMENT_LABEL: Record<string, (value: string) => string> = {
  'noc-tracker': (v) => `Project ${v}`,
  projects: (v) => `Project ${v}`,
};

/** Static child routes that must not be treated as a dynamic value. */
const STATIC_CHILDREN = new Set(['new']);

function titleCase(segment: string) {
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildCrumbs(
  pathname: string,
  navLabels: Record<string, string>,
): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);

  return segments.map((raw, i) => {
    const href = `/${segments.slice(0, i + 1).join('/')}`;
    const value = decodeURIComponent(raw);
    const parent = segments[i - 1];

    let label = navLabels[href];
    if (!label && parent && !STATIC_CHILDREN.has(value)) {
      label = DYNAMIC_SEGMENT_LABEL[parent]?.(value) ?? '';
    }
    return { label: label || titleCase(value), href: href as Route };
  });
}

export function AppBreadcrumbs({
  navLabels,
}: {
  /** href -> label, built from the same navFor() items as the sidebar. */
  navLabels: Record<string, string>;
}) {
  const pathname = usePathname();

  const crumbs: Crumb[] = [
    { label: navLabels['/'] ?? 'Dashboard', href: '/' as Route },
    ...buildCrumbs(pathname, navLabels),
  ].filter(
    // Guards against "Dashboard / Dashboard" if the dashboard lives at /dashboard.
    (crumb, i, all) => i === 0 || crumb.label !== all[i - 1].label,
  );

  const last = crumbs.length - 1;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1.5 sm:gap-2">
        {crumbs.map((crumb, i) => {
          const isLast = i === last;
          // Small screens: show only the parent + current page.
          const hideItemOnMobile = i < last - 1;
          const hideSeparatorOnMobile = i < last;

          return (
            <Fragment key={crumb.href}>
              {i > 0 && (
                <BreadcrumbSeparator
                  className={cn(hideSeparatorOnMobile && 'hidden sm:block')}
                />
              )}
              <BreadcrumbItem
                className={cn(
                  'min-w-0',
                  hideItemOnMobile && 'hidden sm:inline-flex',
                )}
              >
                {isLast ? (
                  <BreadcrumbPage className="block max-w-[50vw] truncate font-semibold sm:max-w-none">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  // Base UI flavour of shadcn: use `render`.
                  // On the Radix flavour, swap for: asChild + <Link /> child.
                  <BreadcrumbLink
                    render={<Link href={crumb.href} />}
                    className="inline-flex min-h-10 items-center gap-1.5"
                  >
                    {i === 0 ? (
                      <>
                        <LayoutDashboard className="size-4" aria-hidden />
                        <span className="sr-only sm:not-sr-only">
                          {crumb.label}
                        </span>
                      </>
                    ) : (
                      crumb.label
                    )}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
