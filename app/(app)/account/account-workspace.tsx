'use client';

import { useState } from 'react';
import { HardHat, MapPin, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateAccountProfile, updateAccountPassword } from '@/app/actions/account';

export interface AccountProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  office?: string | null;
  active: boolean;
  created_at: string;
  specialty?: string | null;
}

export interface AssignedProjectItem {
  id: string;
  code: string;
  description: string;
  stage: string;
  discipline?: string | null;
}

interface AccountWorkspaceProps {
  profile: AccountProfile;
  assignedProjects: AssignedProjectItem[];
  hasGlobalProjectScope: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  ceo: 'Chief Executive Officer',
  area_manager: 'Area Manager',
  resident_engineer: 'Resident Engineer',
  authority_engineer: 'Authority Liaison Engineer',
  engineer: 'Design Engineer',
  dc: 'Document Controller',
};

// Generates two-letter initials from full name or email for user avatar badge.
function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'ED';
}

// Full interactive account profile, credential management, and project scope workspace.
export function AccountWorkspace({
  profile,
  assignedProjects,
  hasGlobalProjectScope,
}: AccountWorkspaceProps) {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const roleLabel = ROLE_LABELS[profile.role] || profile.role;
  const initials = getInitials(profile.full_name, profile.email);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name is required.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateAccountProfile({ fullName });
      if (!res.ok) {
        toast.error(res.error || 'Failed to update profile name.');
      } else {
        toast.success('Account profile updated successfully.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await updateAccountPassword({ password, confirmPassword });
      if (!res.ok) {
        toast.error(res.error || 'Failed to update password.');
      } else {
        toast.success('Account password updated successfully.');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Account Profile & Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your professional engineering credentials, identity, and project assignments.
        </p>
      </div>

      {/* Profile Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Identity Summary Card */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-14 shrink-0 rounded-full bg-brand-navy flex items-center justify-center text-white font-bold text-lg dark:bg-brand-cyan dark:text-brand-navy-deep ring-1 ring-border">
              {initials}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <h2 className="text-base font-semibold text-foreground truncate" title={profile.full_name}>
                {profile.full_name}
              </h2>
              <p className="text-xs text-muted-foreground truncate" title={profile.email}>
                {profile.email}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Role</span>
              <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                <Shield className="size-3 text-brand-cyan" />
                {roleLabel}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Office Site</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground" />
                {profile.office || 'Dubai HQ'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Status</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Details Panel */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-5">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-foreground">Profile Details</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update your public profile display name and view professional credentials.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-xs font-medium text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="h-9 text-xs bg-muted/40 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-medium text-foreground">
                    Security Role & Scope
                  </Label>
                  <Input
                    id="role"
                    value={`${roleLabel}${profile.specialty ? ` (${profile.specialty})` : ''}`}
                    disabled
                    className="h-9 text-xs bg-muted/40 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="office" className="text-xs font-medium text-foreground">
                    Assigned Site Office
                  </Label>
                  <Input
                    id="office"
                    value={profile.office || 'Dubai HQ'}
                    disabled
                    className="h-9 text-xs bg-muted/40 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={savingProfile || fullName.trim() === profile.full_name}
                  className="h-8 px-4 text-xs font-medium bg-brand-navy text-white hover:bg-brand-navy/90 dark:bg-brand-cyan dark:text-brand-navy-deep dark:hover:bg-brand-cyan-hover"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>

          {/* Security & Authentication Panel */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-5">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-foreground">Security & Credentials</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your account credentials and password authentication.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new_password" className="text-xs font-medium text-foreground">
                    New Password
                  </Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password" className="text-xs font-medium text-foreground">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={savingPassword || !password || !confirmPassword}
                  className="h-8 px-4 text-xs font-medium bg-brand-navy text-white hover:bg-brand-navy/90 dark:bg-brand-cyan dark:text-brand-navy-deep dark:hover:bg-brand-cyan-hover"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </div>

          {/* Assigned Projects & Scope */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Assigned Projects & Scope</h3>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {hasGlobalProjectScope
                    ? 'Global Authority Access'
                    : `${assignedProjects.length} Active Project${assignedProjects.length === 1 ? '' : 's'}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasGlobalProjectScope
                  ? 'Your administrative role provides access to all firm engineering projects across Dubai and Abu Dhabi.'
                  : 'Active engineering projects and drawing submittal registers linked to your profile.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {assignedProjects.length > 0 ? (
                assignedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-md border border-border/80 bg-background/50 p-3 hover:bg-accent/40 transition-colors flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono text-xs font-bold text-foreground truncate">
                        {p.code}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {p.stage}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1" title={p.description}>
                      {p.description || 'No description provided'}
                    </p>
                    {p.discipline && (
                      <div className="flex items-center gap-1 text-[10px] text-brand-navy font-medium dark:text-brand-cyan">
                        <HardHat className="size-3 shrink-0" />
                        <span className="truncate">{p.discipline}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="sm:col-span-3 py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
                  No specific projects currently assigned. Contact your Resident Engineer or Admin to receive drawing assignments.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
