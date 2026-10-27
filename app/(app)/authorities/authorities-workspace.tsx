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
  ShieldCheck,
  FileCheck2,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  createMasterAuthorityAction,
  updateMasterAuthorityAction,
  deleteMasterAuthorityAction,
  createReviewingAuthorityAction,
  updateReviewingAuthorityAction,
  deleteReviewingAuthorityAction,
  type MasterAuthorityWithStats,
  type ReviewingAuthorityWithStats,
} from '@/app/actions/authorities';

interface AuthoritiesWorkspaceProps {
  initialMasterAuthorities: MasterAuthorityWithStats[];
  initialReviewingAuthorities: ReviewingAuthorityWithStats[];
}

type MasterAuthorityFormValues = {
  name: string;
  jurisdiction: string;
};

type ReviewingAuthorityFormValues = {
  name: string;
};

export function AuthoritiesWorkspace({
  initialMasterAuthorities,
  initialReviewingAuthorities,
}: AuthoritiesWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'master' | 'reviewing'>('master');
  const [isPending, startTransition] = useTransition();

  // Master authorities state
  const [masterAuthorities, setMasterAuthorities] = useState<
    MasterAuthorityWithStats[]
  >(initialMasterAuthorities);
  const [searchMaster, setSearchMaster] = useState('');
  const [isCreateMasterOpen, setIsCreateMasterOpen] = useState(false);
  const [isEditMasterOpen, setIsEditMasterOpen] = useState(false);
  const [editingMaster, setEditingMaster] =
    useState<MasterAuthorityWithStats | null>(null);
  const [isDeleteMasterOpen, setIsDeleteMasterOpen] = useState(false);
  const [deletingMaster, setDeletingMaster] =
    useState<MasterAuthorityWithStats | null>(null);

  // Reviewing authorities state
  const [reviewingAuthorities, setReviewingAuthorities] = useState<
    ReviewingAuthorityWithStats[]
  >(initialReviewingAuthorities);
  const [searchReviewing, setSearchReviewing] = useState('');
  const [isCreateReviewingOpen, setIsCreateReviewingOpen] = useState(false);
  const [isEditReviewingOpen, setIsEditReviewingOpen] = useState(false);
  const [editingReviewing, setEditingReviewing] =
    useState<ReviewingAuthorityWithStats | null>(null);
  const [isDeleteReviewingOpen, setIsDeleteReviewingOpen] = useState(false);
  const [deletingReviewing, setDeletingReviewing] =
    useState<ReviewingAuthorityWithStats | null>(null);

  // Master forms
  const {
    register: registerCreateMaster,
    handleSubmit: handleCreateMasterSubmit,
    reset: resetCreateMaster,
    formState: { errors: createMasterErrors },
  } = useForm<MasterAuthorityFormValues>({
    defaultValues: { name: '', jurisdiction: '' },
  });

  const {
    register: registerEditMaster,
    handleSubmit: handleEditMasterSubmit,
    reset: resetEditMaster,
    formState: { errors: editMasterErrors },
  } = useForm<MasterAuthorityFormValues>({
    defaultValues: { name: '', jurisdiction: '' },
  });

  // Reviewing forms
  const {
    register: registerCreateReviewing,
    handleSubmit: handleCreateReviewingSubmit,
    reset: resetCreateReviewing,
    formState: { errors: createReviewingErrors },
  } = useForm<ReviewingAuthorityFormValues>({
    defaultValues: { name: '' },
  });

  const {
    register: registerEditReviewing,
    handleSubmit: handleEditReviewingSubmit,
    reset: resetEditReviewing,
    formState: { errors: editReviewingErrors },
  } = useForm<ReviewingAuthorityFormValues>({
    defaultValues: { name: '' },
  });

  // Filtered lists
  const filteredMaster = useMemo(() => {
    const q = searchMaster.trim().toLowerCase();
    if (!q) return masterAuthorities;
    return masterAuthorities.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.jurisdiction && a.jurisdiction.toLowerCase().includes(q)),
    );
  }, [masterAuthorities, searchMaster]);

  const filteredReviewing = useMemo(() => {
    const q = searchReviewing.trim().toLowerCase();
    if (!q) return reviewingAuthorities;
    return reviewingAuthorities.filter((r) => r.name.toLowerCase().includes(q));
  }, [reviewingAuthorities, searchReviewing]);

  // Master KPIs
  const totalMasterProjects = useMemo(
    () => masterAuthorities.reduce((sum, a) => sum + a.projectsCount, 0),
    [masterAuthorities],
  );
  const totalMasterMatrixItems = useMemo(
    () => masterAuthorities.reduce((sum, a) => sum + a.matrixItemsCount, 0),
    [masterAuthorities],
  );

  // Reviewing KPIs
  const totalRevMatrixItems = useMemo(
    () => reviewingAuthorities.reduce((sum, r) => sum + r.matrixItemsCount, 0),
    [reviewingAuthorities],
  );
  const totalRevProjectNocs = useMemo(
    () => reviewingAuthorities.reduce((sum, r) => sum + r.projectNocsCount, 0),
    [reviewingAuthorities],
  );

  // Master Handlers
  const onCreateMaster = (values: MasterAuthorityFormValues) => {
    startTransition(async () => {
      const res = await createMasterAuthorityAction({
        name: values.name.trim(),
        jurisdiction: values.jurisdiction.trim() || null,
      });

      if (!res.ok || !res.data) {
        toast.error(res.error || 'Failed to register master authority.');
        return;
      }

      toast.success(
        `Registered master authority "${res.data.name}" successfully.`,
      );
      setMasterAuthorities((prev) => [...prev, res.data!]);
      setIsCreateMasterOpen(false);
      resetCreateMaster();
      router.refresh();
    });
  };

  const onOpenEditMaster = (auth: MasterAuthorityWithStats) => {
    setEditingMaster(auth);
    resetEditMaster({
      name: auth.name,
      jurisdiction: auth.jurisdiction || '',
    });
    setIsEditMasterOpen(true);
  };

  const onEditMaster = (values: MasterAuthorityFormValues) => {
    if (!editingMaster) return;

    const trimmedName = values.name.trim();
    const trimmedJurisdiction = values.jurisdiction.trim() || null;

    startTransition(async () => {
      const res = await updateMasterAuthorityAction({
        id: editingMaster.id,
        name: trimmedName,
        jurisdiction: trimmedJurisdiction,
      });

      if (!res.ok) {
        toast.error(res.error || 'Failed to update master authority.');
        return;
      }

      toast.success(`Updated master authority "${trimmedName}".`);
      setMasterAuthorities((prev) =>
        prev.map((a) =>
          a.id === editingMaster.id
            ? { ...a, name: trimmedName, jurisdiction: trimmedJurisdiction }
            : a,
        ),
      );
      setIsEditMasterOpen(false);
      setEditingMaster(null);
      router.refresh();
    });
  };

  const onOpenDeleteMaster = (auth: MasterAuthorityWithStats) => {
    setDeletingMaster(auth);
    setIsDeleteMasterOpen(true);
  };

  const onDeleteMaster = () => {
    if (!deletingMaster) return;

    startTransition(async () => {
      const res = await deleteMasterAuthorityAction(deletingMaster.id);
      if (!res.ok) {
        toast.error(res.error || 'Failed to delete master authority.');
        return;
      }

      toast.success(`Deleted master authority "${deletingMaster.name}".`);
      setMasterAuthorities((prev) =>
        prev.filter((a) => a.id !== deletingMaster.id),
      );
      setIsDeleteMasterOpen(false);
      setDeletingMaster(null);
      router.refresh();
    });
  };

  // Reviewing Handlers
  const onCreateReviewing = (values: ReviewingAuthorityFormValues) => {
    startTransition(async () => {
      const res = await createReviewingAuthorityAction({
        name: values.name.trim(),
      });

      if (!res.ok || !res.data) {
        toast.error(res.error || 'Failed to register reviewing authority.');
        return;
      }

      toast.success(
        `Registered reviewing authority "${res.data.name}" successfully.`,
      );
      setReviewingAuthorities((prev) => [...prev, res.data!]);
      setIsCreateReviewingOpen(false);
      resetCreateReviewing();
      router.refresh();
    });
  };

  const onOpenEditReviewing = (auth: ReviewingAuthorityWithStats) => {
    setEditingReviewing(auth);
    resetEditReviewing({
      name: auth.name,
    });
    setIsEditReviewingOpen(true);
  };

  const onEditReviewing = (values: ReviewingAuthorityFormValues) => {
    if (!editingReviewing) return;

    const trimmedName = values.name.trim();

    startTransition(async () => {
      const res = await updateReviewingAuthorityAction({
        id: editingReviewing.id,
        name: trimmedName,
      });

      if (!res.ok) {
        toast.error(res.error || 'Failed to update reviewing authority.');
        return;
      }

      toast.success(`Updated reviewing authority "${trimmedName}".`);
      setReviewingAuthorities((prev) =>
        prev.map((r) =>
          r.id === editingReviewing.id ? { ...r, name: trimmedName } : r,
        ),
      );
      setIsEditReviewingOpen(false);
      setEditingReviewing(null);
      router.refresh();
    });
  };

  const onOpenDeleteReviewing = (auth: ReviewingAuthorityWithStats) => {
    setDeletingReviewing(auth);
    setIsDeleteReviewingOpen(true);
  };

  const onDeleteReviewing = () => {
    if (!deletingReviewing) return;

    startTransition(async () => {
      const res = await deleteReviewingAuthorityAction(deletingReviewing.id);
      if (!res.ok) {
        toast.error(res.error || 'Failed to delete reviewing authority.');
        return;
      }

      toast.success(`Deleted reviewing authority "${deletingReviewing.name}".`);
      setReviewingAuthorities((prev) =>
        prev.filter((r) => r.id !== deletingReviewing.id),
      );
      setIsDeleteReviewingOpen(false);
      setDeletingReviewing(null);
      router.refresh();
    });
  };

  return (
    <section
      className="space-y-6"
      aria-label="Authorities Governance Management"
    >
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Authorities</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin oversight: Manage statutory master jurisdictions and reviewing
            authorities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'master' ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateMasterOpen(true)}
              className="h-8 gap-1.5 text-xs cursor-pointer font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Master Authority</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsCreateReviewingOpen(true)}
              className="h-8 gap-1.5 text-xs cursor-pointer font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Reviewing Authority</span>
            </Button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'master' | 'reviewing')}
        className="space-y-6"
      >
        <div className="border-b border-border pb-2">
          <TabsList variant="line" className="gap-4">
            <TabsTrigger
              value="master"
              className="gap-2 text-xs font-medium cursor-pointer pb-2"
            >
              <Building2 className="h-4 w-4" />
              <span>Master Authorities</span>
              <Badge
                variant="secondary"
                className="font-mono text-[10px] h-4 px-1.5 ml-0.5"
              >
                {masterAuthorities.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="reviewing"
              className="gap-2 text-xs font-medium cursor-pointer pb-2"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Reviewing Authorities</span>
              <Badge
                variant="secondary"
                className="font-mono text-[10px] h-4 px-1.5 ml-0.5"
              >
                {reviewingAuthorities.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Master Authorities Tab Content */}
        <TabsContent value="master" className="space-y-6 outline-none">
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
                {masterAuthorities.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Registered approving master authorities
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
                {totalMasterProjects}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Projects governed across master bodies
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">
                  NOC Matrix Templates
                </span>
                <Layers className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                {totalMasterMatrixItems}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Statutory template requirements mapped
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Search master authorities"
                  placeholder="Search by master authority or jurisdiction..."
                  value={searchMaster}
                  onChange={(e) => setSearchMaster(e.target.value)}
                  className="h-8 pl-8 text-xs shadow-none"
                />
              </div>

              <span className="text-xs text-muted-foreground font-mono">
                {filteredMaster.length} of {masterAuthorities.length} records
              </span>
            </div>

            {/* Master Authorities Table */}
            <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Master Authority</TableHead>
                    <TableHead>Governing Jurisdiction</TableHead>
                    <TableHead className="text-center">Projects</TableHead>
                    <TableHead className="text-center">Matrix Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaster.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-xs text-muted-foreground"
                      >
                        {masterAuthorities.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-4">
                            <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
                            <p className="font-semibold text-foreground">
                              No master authorities registered yet.
                            </p>
                          </div>
                        ) : (
                          <span>
                            No master authorities found matching &quot;
                            {searchMaster}&quot;.
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaster.map((auth) => (
                      <TableRow key={auth.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">
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
                              onClick={() => onOpenEditMaster(auth)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${auth.name}`}
                              onClick={() => onOpenDeleteMaster(auth)}
                              disabled={
                                auth.projectsCount > 0 ||
                                auth.matrixItemsCount > 0
                              }
                              title={
                                auth.projectsCount > 0 ||
                                auth.matrixItemsCount > 0
                                  ? 'Cannot delete authority while assigned to projects or matrix templates'
                                  : 'Delete master authority'
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
        </TabsContent>

        {/* Reviewing Authorities Tab Content */}
        <TabsContent value="reviewing" className="space-y-6 outline-none">
          {/* KPI Overview Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Reviewing Agencies
                </span>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                {reviewingAuthorities.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Statutory reviewing and inspecting bodies
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Matrix Template Items
                </span>
                <Layers className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                {totalRevMatrixItems}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                NOC blueprint items assigned to agencies
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Project NOC Records
                </span>
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                {totalRevProjectNocs}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Active project NOC submissions tracked
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Search reviewing authorities"
                  placeholder="Search reviewing agency name (e.g. DEWA, Civil Defence, RTA)..."
                  value={searchReviewing}
                  onChange={(e) => setSearchReviewing(e.target.value)}
                  className="h-8 pl-8 text-xs shadow-none"
                />
              </div>

              <span className="text-xs text-muted-foreground font-mono">
                {filteredReviewing.length} of {reviewingAuthorities.length}{' '}
                records
              </span>
            </div>

            {/* Reviewing Authorities Table */}
            <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Reviewing Authority</TableHead>
                    <TableHead className="text-center">
                      Matrix Templates
                    </TableHead>
                    <TableHead className="text-center">Project NOCs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviewing.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-xs text-muted-foreground"
                      >
                        {reviewingAuthorities.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-4">
                            <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
                            <p className="font-semibold text-foreground">
                              No reviewing authorities registered yet.
                            </p>
                          </div>
                        ) : (
                          <span>
                            No reviewing authorities found matching &quot;
                            {searchReviewing}&quot;.
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReviewing.map((auth) => (
                      <TableRow key={auth.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          #{auth.id}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{auth.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px] h-5 px-1.5"
                          >
                            {auth.matrixItemsCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px] h-5 px-1.5"
                          >
                            {auth.projectNocsCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit ${auth.name}`}
                              onClick={() => onOpenEditReviewing(auth)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${auth.name}`}
                              onClick={() => onOpenDeleteReviewing(auth)}
                              disabled={
                                auth.matrixItemsCount > 0 ||
                                auth.projectNocsCount > 0
                              }
                              title={
                                auth.matrixItemsCount > 0 ||
                                auth.projectNocsCount > 0
                                  ? 'Cannot delete reviewing authority while referenced in matrix templates or project NOCs'
                                  : 'Delete reviewing authority'
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
        </TabsContent>
      </Tabs>

      {/* Dialog: Create Master Authority */}
      <Dialog
        open={isCreateMasterOpen}
        onOpenChange={(open) => {
          setIsCreateMasterOpen(open);
          if (!open) resetCreateMaster();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={handleCreateMasterSubmit(onCreateMaster)}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Register Master Authority
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add a statutory regulatory body (e.g. Dubai Municipality,
                Nakheel, Trakhees).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="master-name" className="text-xs font-medium">
                  Authority Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="master-name"
                  placeholder="e.g. Dubai Municipality"
                  className="h-8 text-xs"
                  {...registerCreateMaster('name', {
                    required: 'Authority name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                />
                {createMasterErrors.name && (
                  <p className="text-[11px] text-destructive">
                    {createMasterErrors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="master-jurisdiction"
                  className="text-xs font-medium"
                >
                  Governing Jurisdiction (Optional)
                </Label>
                <Input
                  id="master-jurisdiction"
                  placeholder="e.g. Dubai Emirate / Offshore"
                  className="h-8 text-xs"
                  {...registerCreateMaster('jurisdiction')}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateMasterOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-8 text-xs cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Master Authority'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Master Authority */}
      <Dialog
        open={isEditMasterOpen}
        onOpenChange={(open) => {
          setIsEditMasterOpen(open);
          if (!open) {
            setEditingMaster(null);
            resetEditMaster();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={handleEditMasterSubmit(onEditMaster)}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Edit Master Authority
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update master authority name or jurisdiction details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label
                  htmlFor="edit-master-name"
                  className="text-xs font-medium"
                >
                  Authority Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-master-name"
                  className="h-8 text-xs"
                  {...registerEditMaster('name', {
                    required: 'Authority name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                />
                {editMasterErrors.name && (
                  <p className="text-[11px] text-destructive">
                    {editMasterErrors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="edit-master-jurisdiction"
                  className="text-xs font-medium"
                >
                  Governing Jurisdiction (Optional)
                </Label>
                <Input
                  id="edit-master-jurisdiction"
                  className="h-8 text-xs"
                  {...registerEditMaster('jurisdiction')}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditMasterOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-8 text-xs cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Master Authority */}
      <Dialog
        open={isDeleteMasterOpen}
        onOpenChange={(open) => {
          setIsDeleteMasterOpen(open);
          if (!open) setDeletingMaster(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Delete Master Authority</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete &quot;{deletingMaster?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteMasterOpen(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={onDeleteMaster}
              className="h-8 text-xs cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Confirm Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create Reviewing Authority */}
      <Dialog
        open={isCreateReviewingOpen}
        onOpenChange={(open) => {
          setIsCreateReviewingOpen(open);
          if (!open) resetCreateReviewing();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={handleCreateReviewingSubmit(onCreateReviewing)}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Register Reviewing Authority
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add a statutory reviewing agency (e.g. DEWA, Civil Defence, RTA,
                DM Drainage, Empower, Etisalat).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="reviewing-name" className="text-xs font-medium">
                  Reviewing Agency Name{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reviewing-name"
                  placeholder="e.g. DM Drainage & Irrigation"
                  className="h-8 text-xs"
                  {...registerCreateReviewing('name', {
                    required: 'Reviewing authority name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                />
                {createReviewingErrors.name && (
                  <p className="text-[11px] text-destructive">
                    {createReviewingErrors.name.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateReviewingOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-8 text-xs cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Reviewing Authority'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Reviewing Authority */}
      <Dialog
        open={isEditReviewingOpen}
        onOpenChange={(open) => {
          setIsEditReviewingOpen(open);
          if (!open) {
            setEditingReviewing(null);
            resetEditReviewing();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={handleEditReviewingSubmit(onEditReviewing)}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Edit Reviewing Authority
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update statutory reviewing agency name.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label
                  htmlFor="edit-reviewing-name"
                  className="text-xs font-medium"
                >
                  Reviewing Agency Name{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-reviewing-name"
                  className="h-8 text-xs"
                  {...registerEditReviewing('name', {
                    required: 'Reviewing authority name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                />
                {editReviewingErrors.name && (
                  <p className="text-[11px] text-destructive">
                    {editReviewingErrors.name.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditReviewingOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-8 text-xs cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Reviewing Authority */}
      <Dialog
        open={isDeleteReviewingOpen}
        onOpenChange={(open) => {
          setIsDeleteReviewingOpen(open);
          if (!open) setDeletingReviewing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Delete Reviewing Authority</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete &quot;{deletingReviewing?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteReviewingOpen(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={onDeleteReviewing}
              className="h-8 text-xs cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Confirm Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
