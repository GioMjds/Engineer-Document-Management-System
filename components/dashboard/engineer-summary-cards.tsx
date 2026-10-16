'use client';

import { FileText, Clock, AlertTriangle } from 'lucide-react';

interface EngineerSummaryCardsProps {
  totalUploaded: number;
  underReview: number;
  requiringRevision: number;
}

export function EngineerSummaryCards({
  totalUploaded,
  underReview,
  requiringRevision,
}: EngineerSummaryCardsProps) {
  const cards = [
    {
      title: 'My Uploaded Drawings',
      value: totalUploaded,
      description: 'Total technical drawings submitted',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      title: 'Drawings Under Review',
      value: underReview,
      description: 'Pending Resident Engineer or AM review',
      icon: Clock,
      color:
        'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      title: 'Drawings Requiring Revision',
      value: requiringRevision,
      description: 'Rejected submittals requiring R01+ upload',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {card.title}
              </span>
              <div className={`rounded-md p-1.5 ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
