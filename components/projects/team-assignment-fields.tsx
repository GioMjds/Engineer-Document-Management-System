'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from 'cn';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  TEAM_FIELDS,
  availableProfiles,
  type TeamAssignment,
  type TeamKey,
} from '@/lib/team-assignment';

export interface ProfileItem {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
}

const GROUPS = ['Oversight', 'Discipline leads'] as const;

const ROLE_LABELS: Record<string, string> = {
  resident_engineer: 'Resident Engineer',
  area_manager: 'Area Manager',
  authority_engineer: 'Authority Engineer',
  dc: 'Doc Controller',
  doc_controller: 'Doc Controller',
  engineer: 'Discipline Engineer',
  admin: 'System Admin',
  ceo: 'Executive',
};

const formatRole = (role: string) =>
  ROLE_LABELS[role] ?? role.replace(/_/g, ' ');

const profileName = (p: ProfileItem) =>
  p.full_name?.trim() || p.email?.trim() || 'Unknown';

interface StaffMultiSelectProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  profiles: ProfileItem[];
  roles: readonly string[];
  taken: readonly string[];
}

// Chips for chosen staff plus a searchable picker that stays open for repeated adds.
function StaffMultiSelect({
  id,
  value,
  onChange,
  profiles,
  roles,
  taken,
}: StaffMultiSelectProps) {
  const [open, setOpen] = useState(false);

  // Keep ids with no matching profile visible so they can still be removed.
  const chosen = value.map(
    (v) =>
      profiles.find((p) => p.id === v) ?? {
        id: v,
        full_name: null,
        role: '',
        email: null,
      },
  );
  const available = availableProfiles(profiles, roles, taken);

  const renderItem = (p: ProfileItem) => (
    <CommandItem
      key={p.id}
      value={p.id}
      keywords={[profileName(p), formatRole(p.role)]}
      onSelect={() => onChange([...value, p.id])}
      className="gap-2 text-xs"
    >
      <span className="truncate">{profileName(p)}</span>
      <span className="ml-auto shrink-0 text-muted-foreground">
        {formatRole(p.role)}
      </span>
    </CommandItem>
  );

  return (
    <div className="min-w-0 space-y-1.5">
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {chosen.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-1 rounded-md border border-border bg-muted/40 py-0.5 pl-2 pr-0.5 text-xs"
            >
              <span className="max-w-40 truncate">{profileName(p)}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== p.id))}
                aria-label={`Remove ${profileName(p)}`}
                className="rounded p-0.5 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-xs text-muted-foreground outline-none transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>{value.length > 0 ? 'Add another' : 'Add staff'}</span>
          <Plus className="size-3.5 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput
              placeholder="Search name or role"
              className="text-xs"
            />
            <CommandList className="max-h-64">
              <CommandEmpty className="py-4 text-xs">
                No staff found.
              </CommandEmpty>
              <CommandGroup>{available.map(renderItem)}</CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface TeamAssignmentFieldsProps {
  team: TeamAssignment;
  profiles: ProfileItem[];
  onChange: (key: TeamKey, userIds: string[]) => void;
}

// Label-left, picker-right rows grouped under plain headings.
export function TeamAssignmentFields({
  team,
  profiles,
  onChange,
}: TeamAssignmentFieldsProps) {
  const taken = Object.values(team).flat();

  return (
    <div className="space-y-4">
      {GROUPS.map((group, i) => (
        <fieldset
          key={group}
          className={cn('min-w-0', i > 0 && 'border-t border-border pt-4')}
        >
          <legend className="mb-2 text-xs font-medium text-muted-foreground">
            {group}
          </legend>
          <div className="space-y-2">
            {TEAM_FIELDS.filter((f) => f.group === group).map((f) => (
              <div
                key={f.key}
                className="grid items-start gap-1.5 sm:grid-cols-[9rem_1fr] sm:gap-3"
              >
                <Label htmlFor={`team-${f.key}`} className="pt-2 text-xs">
                  {f.label}
                </Label>
                <StaffMultiSelect
                  id={`team-${f.key}`}
                  value={team[f.key]}
                  onChange={(ids) => onChange(f.key, ids)}
                  profiles={profiles}
                  roles={f.roles}
                  taken={taken}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
