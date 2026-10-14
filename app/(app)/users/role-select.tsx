'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateUserRole } from '@/app/actions/admin';
import type { AppRole } from '@/lib/permissions';

const LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  ceo: 'CEO',
  area_manager: 'Area Manager',
  resident_engineer: 'Resident Engineer',
  authority_engineer: 'Authority Engineer',
  engineer: 'Engineer',
  dc: 'Document Controller (DC)',
};

export function RoleSelect({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: AppRole;
  isSelf: boolean;
}) {
  const [value, setValue] = useState<AppRole>(currentRole);
  const [pending, startTransition] = useTransition();

  function onChange(next: AppRole) {
    const previous = value;
    setValue(next); // optimistic update

    startTransition(async () => {
      const result = await updateUserRole({ user_id: userId, role: next });
      if (!result.ok) {
        setValue(previous); // roll back on failure
        toast.error(result.error ?? 'Failed to update role.');
        return;
      }
      toast.success('Role updated.');
    });
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AppRole)}
      disabled={pending || isSelf}
    >
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(LABELS) as AppRole[]).map((r) => (
          <SelectItem key={r} value={r}>
            {LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
