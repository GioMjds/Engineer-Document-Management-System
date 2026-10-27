'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Landmark,
  Plus,
  Search,
  Building2,
  Layers,
  FolderKanban,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  createMasterAuthorityAction,
  updateMasterAuthorityAction,
  deleteMasterAuthorityAction,
  type MasterAuthorityWithStats,
} from '@/app/actions/authorities';

interface AuthoritiesWorkspaceProps {
  initialAuthorities: MasterAuthorityWithStats[];
}

type AuthorityFormValues = {
  name: string;
  jurisdiction: string;
};

export function AuthoritiesWorkspace({
  initialAuthorities,
}: AuthoritiesWorkspaceProps) {
  const router = useRouter();
  const [authorities, setAuthorities] =
    useState<MasterAuthorityWithStats[]>(initialAuthorities);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAuth, setEditingAuth] =
    useState<MasterAuthorityWithStats | null>(null);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingAuth, setDeletingAuth] =
    useState<MasterAuthorityWithStats | null>(null);

  const {
    register: registerCreate,
    handleSubmit: handleCreateFormSubmit,
    reset: resetCreateForm,
    formState: { errors: createErrors },
  } = useForm<AuthorityFormValues>({
    defaultValues: {
      name: '',
      jurisdiction: '',
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditFormSubmit,
    reset: resetEditForm,
    formState: { errors: editErrors },
  } = useForm<AuthorityFormValues>({
    defaultValues: {
      name: '',
      jurisdiction: '',
    },
  });

  // Filter authorities by search query
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return authorities;
    return authorities.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.jurisdiction && a.jurisdiction.toLowerCase().includes(q)),
    );
  }, [authorities, searchQuery]);

  // Aggregate KPI metrics
  const totalProjects = useMemo(
    () => authorities.reduce((sum, a) => sum + a.projectsCount, 0),
    [authorities],
  );
  const totalMatrixItems = useMemo(
    () => authorities.reduce((sum, a) => sum + a.matrixItemsCount, 0),
    [authorities],
  );

  // Handle register authority submit
  const handleCreateSubmit = (values: AuthorityFormValues) => {
    startTransition(async () => {
      const res = await createMasterAuthorityAction({
        name: values.name.trim(),
        jurisdiction: values.jurisdiction.trim() || null,
      });

      if (!res.ok || !res.data) {
        toast.error(res.error || 'Failed to register authority.');
        return;
      }

      toast.success(
        `Registered master authority "${res.data.name}" successfully.`,
      );
      setAuthorities((prev) => [...prev, res.data!]);
      setIsCreateOpen(false);
      resetCreateForm();
      router.refresh();
    });
  };

  // Open edit dialog
  const handleOpenEdit = (auth: MasterAuthorityWithStats) => {
    setEditingAuth(auth);
    resetEditForm({
      name: auth.name,
      jurisdiction: auth.jurisdiction || '',
    });
    setIsEditOpen(true);
  };

  // Handle edit authority submit
  const handleEditSubmit = (values: AuthorityFormValues) => {
    if (!editingAuth) return;

    const trimmedName = values.name.trim();
    const trimmedJurisdiction = values.jurisdiction.trim() || null;

    startTransition(async () => {
      const res = await updateMasterAuthorityAction({
        id: editingAuth.id,
        name: trimmedName,
        jurisdiction: trimmedJurisdiction,
      });

      if (!res.ok) {
        toast.error(res.error || 'Failed to update authority.');
        return;
      }

      toast.success(`Updated authority "${trimmedName}".`);
      setAuthorities((prev) =>
        prev.map((a) =>
          a.id === editingAuth.id
            ? { ...a, name: trimmedName, jurisdiction: trimmedJurisdiction }
            : a,
        ),
      );
      setIsEditOpen(false);
      setEditingAuth(null);
      router.refresh();
    });
  };

  // Open delete dialog
  const handleOpenDelete = (auth: MasterAuthorityWithStats) => {
    setDeletingAuth(auth);
    setIsDeleteOpen(true);
  };

  // Handle delete authority submit
  const handleDeleteSubmit = () => {
    if (!deletingAuth) return;

    startTransition(async () => {
      const res = await deleteMasterAuthorityAction(deletingAuth.id);
      if (!res.ok) {
        toast.error(res.error || 'Failed to delete authority.');
        return;
      }

      toast.success(`Deleted authority "${deletingAuth.name}".`);
      setAuthorities((prev) => prev.filter((a) => a.id !== deletingAuth.id));
      setIsDeleteOpen(false);
      setDeletingAuth(null);
      router.refresh();
    });
  };

  return (
    <section className="space-y-6" aria-label="Master Authorities Management">
      {/* Header and Actions */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Master Authorities</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin oversight: Manage statutory regulatory bodies and municipal
            jurisdictions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-8 gap-1.5 text-xs cursor-pointer font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register Authority</span>
          </Button>
        </div>
      </header>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Jurisdictions
            </span>
            <Building2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {authorities.length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Registered approving authorities
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              Active Projects Linked
            </span>
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {totalProjects}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Projects governed across authorities
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              NOC Matrix Requirements
            </span>
            <Layers className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {totalMatrixItems}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Statutory template requirements mapped
          </p>
        </div>
      </div>

      {/* Filter and Directory Workspace */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search authorities"
              placeholder="Search by authority name or jurisdiction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs shadow-none"
            />
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            {filtered.length} of {authorities.length} records
          </span>
        </div>

        {/* Authorities Data Table */}
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Authority Name</TableHead>
                <TableHead>Governing Jurisdiction</TableHead>
                <TableHead className="text-center">Projects</TableHead>
                <TableHead className="text-center">Matrix Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-xs text-muted-foreground"
                  >
                    {authorities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
                        <p className="font-semibold text-foreground">
                          No master authorities registered yet.
                        </p>
                        <p className="text-[11px] max-w-md">
                          Click &quot;Seed UAE Baseline&quot; above to populate
                          Dubai Municipality, Trakhees, and DDA defaults, or
                          register one manually.
                        </p>
                      </div>
                    ) : (
                      <span>
                        No authorities found matching &quot;{searchQuery}&quot;.
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((auth) => (
                  <TableRow key={auth.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs text-muted-foreground font-medium">
                      #{auth.id}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{auth.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {auth.jurisdiction || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] h-5 px-1.5"
                      >
                        {auth.projectsCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] h-5 px-1.5"
                      >
                        {auth.matrixItemsCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${auth.name}`}
                          onClick={() => handleOpenEdit(auth)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${auth.name}`}
                          onClick={() => handleOpenDelete(auth)}
                          disabled={
                            auth.projectsCount > 0 || auth.matrixItemsCount > 0
                          }
                          title={
                            auth.projectsCount > 0 || auth.matrixItemsCount > 0
                              ? 'Cannot delete authority while assigned to projects or matrix items'
                              : 'Delete authority'
                          }
                          className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Register Authority Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={handleCreateFormSubmit(handleCreateSubmit)}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Register Master Authority
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add a new statutory approving body for project permitting and
                NOC frameworks.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-xs font-semibold">
                  Authority Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Dubai Civil Aviation Authority (DCAA)"
                  aria-invalid={createErrors.name ? 'true' : 'false'}
                  {...registerCreate('name', {
                    validate: (v) =>
                      v.trim().length > 0 || 'Authority name is required.',
                  })}
                  className="h-8 text-xs"
                />
                {createErrors.name && (
                  <p className="text-[11px] text-destructive" role="alert">
                    {createErrors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="create-jurisdiction"
                  className="text-xs font-semibold"
                >
                  Governing Jurisdiction / Zone
                </Label>
                <Input
                  id="create-jurisdiction"
                  placeholder="e.g. Aviation Corridors & Free Zones"
                  {...registerCreate('jurisdiction')}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-8 text-xs cursor-pointer font-medium"
              >
                {isPending && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                )}
                Register Authority
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Authority Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={handleEditFormSubmit(handleEditSubmit)}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Edit Master Authority
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update entity title or geographic jurisdiction coverage.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-semibold">
                  Authority Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  aria-invalid={editErrors.name ? 'true' : 'false'}
                  {...registerEdit('name', {
                    validate: (v) =>
                      v.trim().length > 0 || 'Authority name is required.',
                  })}
                  className="h-8 text-xs"
                />
                {editErrors.name && (
                  <p className="text-[11px] text-destructive" role="alert">
                    {editErrors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-jurisdiction"
                  className="text-xs font-semibold"
                >
                  Governing Jurisdiction / Zone
                </Label>
                <Input
                  id="edit-jurisdiction"
                  {...registerEdit('jurisdiction')}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-8 text-xs cursor-pointer font-medium"
              >
                {isPending && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Delete Authority</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete &quot;{deletingAuth?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleDeleteSubmit}
              className="h-8 text-xs cursor-pointer font-medium"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
