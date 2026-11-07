'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { parseEmailList } from '@/lib/project-edit';

interface EmailListInputProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
}

const isEmail = (v: string) => z.email().safeParse(v).success;

export function EmailListInput({ id, value, onChange }: EmailListInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');

  // Adds new addresses from typed or pasted text, skipping case-insensitive duplicates.
  const commit = (text: string) => {
    const known = new Set(value.map((v) => v.toLowerCase()));
    const added = parseEmailList(text).filter((e) => {
      const key = e.toLowerCase();
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
    if (added.length) onChange([...value, ...added]);
    setDraft('');
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
    >
      {value.map((email) => {
        const valid = isEmail(email);
        return (
          <span
            key={email}
            title={valid ? undefined : 'Not a valid email address'}
            className={cn(
              'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
              valid
                ? 'border-border bg-muted text-foreground'
                : 'border-destructive/50 bg-destructive/10 text-destructive',
            )}
          >
            <span className="truncate">{email}</span>
            <button
              type="button"
              aria-label={`Remove ${email}`}
              onClick={() => onChange(value.filter((v) => v !== email))}
              className="rounded-full p-0.5 hover:bg-foreground/10"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        );
      })}
      <input
        ref={inputRef}
        id={id}
        type="email"
        value={draft}
        placeholder={value.length ? '' : 'name@company.com'}
        onChange={(e) =>
          e.target.value.includes(',')
            ? commit(e.target.value)
            : setDraft(e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim()) {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        className="min-w-32 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
