'use client';

import { useState, useTransition } from 'react';
import {
  Layers,
  History,
  Plus,
  Lock,
  Unlock,
  ListChecks,
  Calendar,
  Coins,
  Pencil,
  Eye,
  AlertCircle,
  Building2,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getMatrixTemplates,
  getMatrixRevisions,
  createMasterAuthority,
} from '@/app/(app)/noc-matrix/actions';
import { MatrixItemEditorDrawer } from './matrix-item-editor-drawer';
import { MatrixRevisionDrawer } from './matrix-revision-drawer';
import type {
  MasterAuthorityRecord,
  NocMatrixItem,
  NocMatrixRevision,
  NocStage,
  ReviewingAuthorityRecord,
} from '@/types/noc';

export interface NocMatrixWorkspaceProps {
  initialAuthorityId: number;
  initialItems: NocMatrixItem[];
  initialRevisions: NocMatrixRevision[];
  currentUserRole: string;
  initialMasterAuthorities?: MasterAuthorityRecord[];
  initialReviewingAuthorities?: ReviewingAuthorityRecord[];
}

const MASTER_AUTHORITIES = [
  { id: 1, name: 'Nakheel & Trakhees', jurisdiction: 'JAFZA & Coastal Zones' },
  {
    id: 2,
    name: 'Dubai Municipality',
    jurisdiction: 'Mainland Dubai & Al Safat',
  },
  {
    id: 3,
    name: 'Dubai Development Authority',
    jurisdiction: 'TECOM & Free Zones',
  },
];

const STAGES: NocStage[] = [
  'Design NOC',
  'Construction NOC',
  'Information NOC',
  'Handover NOC',
];

const CAN_EDIT_ROLES = ['admin', 'authority_engineer', 'dc'];

function formatAed(amount: number): string {
  return `${amount.toLocaleString()} AED`;
}

function getAuthorityBadgeStyle(authority: string): string {
  switch (authority) {
    case 'Nakheel':
      return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    case 'Trakhees':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
    case 'DEWA':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    case 'RTA':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    case 'DCD':
      return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    case 'DM':
      return 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800';
    case 'DDA':
      return 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
}

function getSubmitterBadgeStyle(submitter: string): string {
  switch (submitter) {
    case 'Consultant':
      return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    case 'Client':
      return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    case 'Contractor':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    case 'Specialist':
    case 'Specialists':
      return 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
}

export function NocMatrixWorkspace({
  initialAuthorityId,
  initialItems,
  initialRevisions,
  currentUserRole,
  initialMasterAuthorities,
  initialReviewingAuthorities,
}: NocMatrixWorkspaceProps) {
  const [masterAuthorities, setMasterAuthorities] = useState<MasterAuthorityRecord[]>(
    initialMasterAuthorities && initialMasterAuthorities.length > 0
      ? initialMasterAuthorities
      : MASTER_AUTHORITIES,
  );
  const [reviewingAuthorities, setReviewingAuthorities] = useState<ReviewingAuthorityRecord[]>(
    initialReviewingAuthorities && initialReviewingAuthorities.length > 0
      ? initialReviewingAuthorities
      : [],
  );
  const [isAddMasterModalOpen, setIsAddMasterModalOpen] = useState(false);
  const [newMasterName, setNewMasterName] = useState('');
  const [newMasterJurisdiction, setNewMasterJurisdiction] = useState('');
  const [isCreatingMaster, setIsCreatingMaster] = useState(false);

  const [selectedAuthorityId, setSelectedAuthorityId] =
    useState<number>(initialAuthorityId);
  const [itemsCache, setItemsCache] = useState<Record<number, NocMatrixItem[]>>(
    {
      [initialAuthorityId]: initialItems,
    },
  );
  const [revisionsCache, setRevisionsCache] = useState<
    Record<number, NocMatrixRevision[]>
  >({
    [initialAuthorityId]: initialRevisions,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Trigger states for Task 5 drawer implementations.
  const [editingItem, setEditingItem] = useState<NocMatrixItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRevisionDrawerOpen, setIsRevisionDrawerOpen] = useState(false);

  const canEdit = CAN_EDIT_ROLES.includes(currentUserRole);

  const currentAuthority =
    masterAuthorities.find((a) => a.id === selectedAuthorityId) ||
    masterAuthorities[0];
  const currentItems = itemsCache[selectedAuthorityId] || [];
  const currentRevisions = revisionsCache[selectedAuthorityId] || [];

  const handleCreateMasterAuthority = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newMasterName.trim();
    if (!cleanName) return;

    setIsCreatingMaster(true);
    const res = await createMasterAuthority({
      name: cleanName,
      jurisdiction: newMasterJurisdiction.trim() || undefined,
    });
    setIsCreatingMaster(false);

    if (!res.ok || !res.data) {
      toast.error(res.error || 'Failed to register master authority');
      return;
    }

    const created = res.data;
    setMasterAuthorities((prev) => [...prev, created]);
    setSelectedAuthorityId(created.id);
    setItemsCache((prev) => ({ ...prev, [created.id]: [] }));
    setRevisionsCache((prev) => ({ ...prev, [created.id]: [] }));
    setIsAddMasterModalOpen(false);
    setNewMasterName('');
    setNewMasterJurisdiction('');
    toast.success(`Master Authority "${created.name}" registered successfully.`);
  };

  const handleSelectAuthority = (id: number) => {
    setSelectedAuthorityId(id);
    if (!itemsCache[id] || !revisionsCache[id]) {
      startTransition(async () => {
        const [itemsRes, revsRes] = await Promise.all([
          getMatrixTemplates(id),
          getMatrixRevisions(id),
        ]);
        if (itemsRes.ok && itemsRes.data) {
          setItemsCache((prev) => ({ ...prev, [id]: itemsRes.data }));
        }
        if (revsRes.ok && revsRes.data) {
          setRevisionsCache((prev) => ({ ...prev, [id]: revsRes.data }));
        }
      });
    }
  };

  const handleRefreshCurrentAuthority = async () => {
    startTransition(async () => {
      const [itemsRes, revsRes] = await Promise.all([
        getMatrixTemplates(selectedAuthorityId),
        getMatrixRevisions(selectedAuthorityId),
      ]);
      if (itemsRes.ok && itemsRes.data) {
        setItemsCache((prev) => ({
          ...prev,
          [selectedAuthorityId]: itemsRes.data,
        }));
      }
      if (revsRes.ok && revsRes.data) {
        setRevisionsCache((prev) => ({
          ...prev,
          [selectedAuthorityId]: revsRes.data,
        }));
      }
    });
  };

  const handleSaveSuccess = (
    savedItem: NocMatrixItem,
    projectsUpdated?: number,
    nocsUpdated?: number,
  ) => {
    // Optimistically update items cache.
    setItemsCache((prev) => {
      const existingList = prev[selectedAuthorityId] || [];
      const itemIndex = existingList.findIndex((i) => i.id === savedItem.id);
      let updatedList: NocMatrixItem[];
      if (itemIndex >= 0) {
        updatedList = existingList.map((i) =>
          i.id === savedItem.id ? savedItem : i,
        );
      } else {
        updatedList = [...existingList, savedItem];
      }
      return {
        ...prev,
        [selectedAuthorityId]: updatedList.sort(
          (a, b) => a.sequenceNo - b.sequenceNo,
        ),
      };
    });

    // Optimistically prepend revision to audit log cache.
    setRevisionsCache((prev) => {
      const existingRevs = prev[selectedAuthorityId] || [];
      const newRev: NocMatrixRevision = {
        id: `rev-optimistic-${Date.now()}`,
        masterAuthorityId: selectedAuthorityId,
        matrixItemId: savedItem.id,
        action: editingItem ? 'UPDATE' : 'CREATE',
        changedBy: 'current-user',
        changedByName: 'Authority Engineer',
        changedByRole: currentUserRole,
        changeSummary: editingItem
          ? `Blueprint #${savedItem.sequenceNo} (${savedItem.reviewingAuthority}) updated: ${savedItem.description}`
          : `New standard NOC #${savedItem.sequenceNo} (${savedItem.reviewingAuthority}) added: ${savedItem.description}`,
        propagatedProjectsCount: projectsUpdated ?? 0,
        propagatedNocsCount: nocsUpdated ?? 0,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [selectedAuthorityId]: [newRev, ...existingRevs],
      };
    });

    // Background synchronization with database.
    handleRefreshCurrentAuthority();
  };

  const filteredItems = currentItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.description.toLowerCase().includes(query) ||
      item.reviewingAuthority.toLowerCase().includes(query) ||
      item.submittedBy.toLowerCase().includes(query) ||
      item.stage.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--site-navy) text-(--site-cyan) dark:bg-[#070e1a]">
              <Layers className="h-4 w-4" />
            </span>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Authority NOC Matrix Blueprints
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Standard statutory approval frameworks, sequential prerequisites,
            and baseline fees across Dubai jurisdictions.
          </p>
        </div>

        {/* Global Matrix Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRevisionDrawerOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Revision History</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 font-mono text-[10px] font-bold"
            >
              {currentRevisions.length}
            </Badge>
          </Button>

          {canEdit && (
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setIsEditorOpen(true);
              }}
              className="h-8 gap-1.5 bg-(--site-cyan) text-white hover:bg-(--site-cyan-hover) text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Standard NOC</span>
            </Button>
          )}
        </div>
      </div>

      {/* Read-Only Banner for non-administrative engineering roles */}
      {!canEdit && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="font-medium">
            Read-Only View: Statutory blueprints are configured by Authority
            Engineers and Document Controllers.
          </p>
        </div>
      )}

      {/* Master Authority Tab Switcher */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
          <nav
            aria-label="Master Authority Blueprints"
            className="flex items-center space-x-2 overflow-x-auto pb-px"
          >
            {masterAuthorities.map((auth) => {
              const isActive = selectedAuthorityId === auth.id;
              return (
                <button
                  key={auth.id}
                  type="button"
                  onClick={() => handleSelectAuthority(auth.id)}
                  className={cn(
                    'group relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-xs font-semibold transition cursor-pointer',
                    isActive
                      ? 'text-(--site-cyan) border-b-2 border-(--site-cyan)'
                      : 'text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-border',
                  )}
                >
                  <Building2
                    className={cn(
                      'h-3.5 w-3.5',
                      isActive
                        ? 'text-(--site-cyan)'
                        : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                  <span>{auth.name}</span>
                  {auth.jurisdiction && (
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.2 font-mono text-[10px] border',
                        isActive
                          ? 'border-(--site-cyan)/40 bg-(--site-cyan)/10 text-(--site-cyan)'
                          : 'border-border bg-muted text-muted-foreground',
                      )}
                    >
                      {auth.jurisdiction}
                    </span>
                  )}
                </button>
              );
            })}

            {currentUserRole === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddMasterModalOpen(true)}
                className="h-7 my-auto gap-1 text-[11px] font-medium cursor-pointer shrink-0 ml-1 border-dashed"
              >
                <Plus className="h-3 w-3" />
                <span>New Authority</span>
              </Button>
            )}
          </nav>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64 pb-2 sm:pb-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NOCs in matrix..."
              className="h-8 pl-8 text-xs bg-card"
            />
          </div>
        </div>

        {/* Blueprint Items Grouped by Stage */}
        <div className="space-y-8 pt-2">
          {isPending ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading statutory template blueprints...
            </div>
          ) : (
            STAGES.map((stage) => {
              const stageItems = filteredItems.filter((i) => i.stage === stage);

              return (
                <section
                  key={stage}
                  aria-labelledby={`stage-heading-${stage.replace(/\s+/g, '-').toLowerCase()}`}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/80 pb-2">
                    <div className="flex items-center gap-2">
                      <h2
                        id={`stage-heading-${stage.replace(/\s+/g, '-').toLowerCase()}`}
                        className="font-heading text-sm font-bold tracking-tight text-foreground"
                      >
                        {stage}
                      </h2>
                      <Badge
                        variant="secondary"
                        className="h-4.5 px-1.5 font-mono text-[10px] font-semibold"
                      >
                        {stageItems.length}{' '}
                        {stageItems.length === 1 ? 'NOC' : 'NOCs'}
                      </Badge>
                    </div>
                  </div>

                  {stageItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No statutory NOCs configured for {stage}.
                    </div>
                  ) : (
                    <div className="grid gap-2.5">
                      {stageItems.map((item) => {
                        const prereqItem = item.blockingSequenceNo
                          ? currentItems.find(
                              (i) => i.sequenceNo === item.blockingSequenceNo,
                            )
                          : null;
                        const reqCount = item.requirements?.length || 0;

                        return (
                          <article
                            key={item.id}
                            className="group flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-lg border border-border bg-card p-3.5 shadow-xs transition hover:border-(--site-cyan)/50 hover:bg-muted/20"
                          >
                            {/* Sequence, Authority, Description & Checklist */}
                            <div className="flex items-start gap-3 min-w-0 md:flex-1">
                              <span
                                className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border shrink-0"
                                title={`Sequence #${item.sequenceNo}`}
                              >
                                #{item.sequenceNo}
                              </span>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      'inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-medium border font-mono',
                                      getAuthorityBadgeStyle(
                                        item.reviewingAuthority,
                                      ),
                                    )}
                                  >
                                    {item.reviewingAuthority}
                                  </span>

                                  <h3 className="font-medium text-xs text-foreground leading-snug">
                                    {item.description}
                                  </h3>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1 font-mono">
                                    <ListChecks className="h-3 w-3 text-muted-foreground" />
                                    <span>
                                      {reqCount} statutory{' '}
                                      {reqCount === 1
                                        ? 'requirement'
                                        : 'requirements'}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Metadata Deck: Submitter, Prerequisite, Validity, Fee */}
                            <div className="flex items-center gap-4 text-xs shrink-0 flex-wrap md:flex-nowrap">
                              {/* Submitter */}
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border font-mono',
                                  getSubmitterBadgeStyle(item.submittedBy),
                                )}
                              >
                                {item.submittedBy}
                              </span>

                              {/* Prerequisite Dependency */}
                              <div className="min-w-36">
                                {item.blockingSequenceNo ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium border bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                                    title={`Prerequisite required before submission`}
                                  >
                                    <Lock className="h-3 w-3 shrink-0" />
                                    <span>
                                      Requires #
                                      {prereqItem?.sequenceNo ??
                                        item.blockingSequenceNo}{' '}
                                      {prereqItem?.reviewingAuthority || ''}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-muted-foreground border border-border bg-muted/40">
                                    <Unlock className="h-3 w-3 text-muted-foreground" />
                                    <span>Prereq: None</span>
                                  </span>
                                )}
                              </div>

                              {/* Validity Days */}
                              <span
                                className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground"
                                title="Default Certificate Validity"
                              >
                                <Calendar className="h-3 w-3" />
                                <span>{item.validityDays}d</span>
                              </span>

                              {/* Default Fee */}
                              <span
                                className="flex items-center gap-1 text-[11px] font-mono font-medium text-foreground min-w-20"
                                title="Standard Authority Fee"
                              >
                                <Coins className="h-3 w-3 text-muted-foreground" />
                                <span>{formatAed(item.defaultFee)}</span>
                              </span>

                              {/* Trigger Action */}
                              <Button
                                variant={canEdit ? 'outline' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsEditorOpen(true);
                                }}
                                className="h-7 px-2.5 text-[11px] gap-1 cursor-pointer"
                              >
                                {canEdit ? (
                                  <>
                                    <Pencil className="h-3 w-3" />
                                    <span>Edit</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>View</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Drawer */}
      <MatrixItemEditorDrawer
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        allAuthorityItems={currentItems}
        masterAuthorityId={selectedAuthorityId}
        canEdit={canEdit}
        currentUserRole={currentUserRole}
        availableReviewingAuthorities={reviewingAuthorities}
        onReviewingAuthorityCreated={(created) =>
          setReviewingAuthorities((prev) =>
            prev.some((a) => a.id === created.id) ? prev : [...prev, created],
          )
        }
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Revision Drawer */}
      <MatrixRevisionDrawer
        isOpen={isRevisionDrawerOpen}
        onClose={() => setIsRevisionDrawerOpen(false)}
        masterAuthorityId={selectedAuthorityId}
        masterAuthorityName={currentAuthority?.name || 'Master Authority'}
        revisions={currentRevisions}
      />

      {/* Dialog: Add Master Authority */}
      <Dialog open={isAddMasterModalOpen} onOpenChange={setIsAddMasterModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Master Authority</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMasterAuthority} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-master-name" className="text-xs font-semibold">
                Authority Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-master-name"
                placeholder="e.g. Abu Dhabi Municipality, Meydan, Aldar"
                value={newMasterName}
                onChange={(e) => setNewMasterName(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-master-jurisdiction" className="text-xs font-semibold">
                Jurisdiction / Free Zone
              </Label>
              <Input
                id="new-master-jurisdiction"
                placeholder="e.g. Abu Dhabi Mainland & Coastal Zones"
                value={newMasterJurisdiction}
                onChange={(e) => setNewMasterJurisdiction(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddMasterModalOpen(false)}
                disabled={isCreatingMaster}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingMaster || !newMasterName.trim()}
                className="bg-(--site-cyan) text-white hover:bg-(--site-cyan-hover) text-xs h-8 cursor-pointer gap-1.5"
              >
                {isCreatingMaster ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register Jurisdiction</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
