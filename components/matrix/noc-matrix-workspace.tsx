'use client';

import {
  createMasterAuthority,
  getMatrixRevisions,
  getMatrixTemplates,
} from '@/app/(app)/noc-matrix/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { canEditMatrix } from '@/lib/noc-constants';
import type {
  MasterAuthorityRecord,
  NocMatrixItem,
  NocMatrixRevision,
  ReviewingAuthorityRecord,
} from '@/types/noc';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { MasterAuthorityPickerModal } from './master-authority-picker-modal';
import { MatrixItemEditorDrawer } from './matrix-item-editor-drawer';
import { MatrixRevisionDrawer } from './matrix-revision-drawer';
import { NocMatrixHeader } from './noc-matrix-header';
import { NocMatrixInspector } from './noc-matrix-inspector';
import { NocMatrixSidebar } from './noc-matrix-sidebar';

export interface NocMatrixWorkspaceProps {
  initialAuthorityId: number;
  initialItems: NocMatrixItem[];
  initialRevisions: NocMatrixRevision[];
  currentUserRole: string;
  canEdit?: boolean;
  initialMasterAuthorities?: MasterAuthorityRecord[];
  initialReviewingAuthorities?: ReviewingAuthorityRecord[];
}

// Dual-pane Engineering Command Deck assembling navigation rail and blueprint inspector.
export function NocMatrixWorkspace({
  initialAuthorityId,
  initialItems,
  initialRevisions,
  currentUserRole,
  canEdit: propCanEdit,
  initialMasterAuthorities,
  initialReviewingAuthorities,
}: NocMatrixWorkspaceProps) {
  const canEdit =
    propCanEdit !== undefined ? propCanEdit : canEditMatrix(currentUserRole);

  const [masterAuthorities, setMasterAuthorities] = useState<
    MasterAuthorityRecord[]
  >(initialMasterAuthorities || []);
  const [reviewingAuthorities, setReviewingAuthorities] = useState<
    ReviewingAuthorityRecord[]
  >(initialReviewingAuthorities || []);
  const [isAddMasterModalOpen, setIsAddMasterModalOpen] = useState(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
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

  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => {
    return initialItems[0]?.id || null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthorityFilter, setSelectedAuthorityFilter] = useState<
    string | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const [editingItem, setEditingItem] = useState<NocMatrixItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRevisionDrawerOpen, setIsRevisionDrawerOpen] = useState(false);

  const currentAuthority =
    masterAuthorities.find((a) => a.id === selectedAuthorityId) ||
    masterAuthorities[0];
  const currentItems = useMemo(
    () => itemsCache[selectedAuthorityId] || [],
    [itemsCache, selectedAuthorityId],
  );
  const currentRevisions = revisionsCache[selectedAuthorityId] || [];

  const itemsCountByAuthority = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const [idStr, list] of Object.entries(itemsCache)) {
      counts[Number(idStr)] = list.length;
    }
    return counts;
  }, [itemsCache]);

  // Active blueprint resolved from current authority items.
  const selectedItem = useMemo(() => {
    if (!currentItems || currentItems.length === 0) return null;
    if (selectedItemId) {
      const found = currentItems.find((i) => i.id === selectedItemId);
      if (found) return found;
    }
    return currentItems[0] || null;
  }, [currentItems, selectedItemId]);

  // Registers a new master authority jurisdiction and selects it.
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
    setSelectedItemId(null);
    setSelectedAuthorityFilter(null);
    setSearchQuery('');
    setItemsCache((prev) => ({ ...prev, [created.id]: [] }));
    setRevisionsCache((prev) => ({ ...prev, [created.id]: [] }));
    setIsAddMasterModalOpen(false);
    setNewMasterName('');
    setNewMasterJurisdiction('');
    toast.success(
      `Master Authority "${created.name}" registered successfully.`,
    );
  };

  // Switches the active master authority and auto-selects its first blueprint.
  const handleSelectAuthority = (id: number) => {
    setSelectedAuthorityId(id);
    setSelectedAuthorityFilter(null);
    setSearchQuery('');

    const cachedItems = itemsCache[id];
    if (cachedItems) {
      setSelectedItemId(cachedItems[0]?.id || null);
    } else {
      setSelectedItemId(null);
    }

    if (!itemsCache[id] || !revisionsCache[id]) {
      startTransition(async () => {
        try {
          const [itemsRes, revsRes] = await Promise.all([
            getMatrixTemplates(id),
            getMatrixRevisions(id),
          ]);
          if (itemsRes.ok && itemsRes.data) {
            setItemsCache((prev) => ({ ...prev, [id]: itemsRes.data }));
            setSelectedItemId(itemsRes.data[0]?.id || null);
          } else if (!itemsRes.ok) {
            toast.error(itemsRes.error || 'Failed to load statutory blueprints');
          }
          if (revsRes.ok && revsRes.data) {
            setRevisionsCache((prev) => ({ ...prev, [id]: revsRes.data }));
          } else if (!revsRes.ok) {
            toast.error(revsRes.error || 'Failed to load revision audit log');
          }
        } catch {
          toast.error('An unexpected error occurred while loading jurisdiction data');
        }
      });
    }
  };

  // Refetches items and revisions for current authority from server.
  const handleRefreshCurrentAuthority = async () => {
    startTransition(async () => {
      try {
        const [itemsRes, revsRes] = await Promise.all([
          getMatrixTemplates(selectedAuthorityId),
          getMatrixRevisions(selectedAuthorityId),
        ]);
        if (itemsRes.ok && itemsRes.data) {
          setItemsCache((prev) => ({
            ...prev,
            [selectedAuthorityId]: itemsRes.data,
          }));
          setSelectedItemId((prevId) => {
            if (prevId && itemsRes.data.some((i) => i.id === prevId)) {
              return prevId;
            }
            return itemsRes.data[0]?.id || null;
          });
        } else if (!itemsRes.ok) {
          toast.error(itemsRes.error || 'Failed to refresh statutory blueprints');
        }
        if (revsRes.ok && revsRes.data) {
          setRevisionsCache((prev) => ({
            ...prev,
            [selectedAuthorityId]: revsRes.data,
          }));
        } else if (!revsRes.ok) {
          toast.error(revsRes.error || 'Failed to refresh revision audit log');
        }
      } catch {
        toast.error('An unexpected error occurred while refreshing blueprint data');
      }
    });
  };

  // Optimistically updates the items cache and auto-selects the saved blueprint.
  const handleSaveSuccess = (savedItem: NocMatrixItem) => {
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

    setSelectedItemId(savedItem.id);
    handleRefreshCurrentAuthority();
  };

  return (
    <div className="space-y-4">
      {/* Command Deck Header */}
      <NocMatrixHeader
        masterAuthorities={masterAuthorities}
        selectedAuthorityId={selectedAuthorityId}
        onOpenSelectAuthorityModal={() => setIsPickerModalOpen(true)}
        onOpenAddMasterModal={() => setIsAddMasterModalOpen(true)}
        onOpenRevisionDrawer={() => setIsRevisionDrawerOpen(true)}
        onOpenAddNocModal={() => {
          setEditingItem(null);
          setIsEditorOpen(true);
        }}
        revisionsCount={currentRevisions.length}
        canEdit={canEdit}
        currentUserRole={currentUserRole}
      />

      {/* Read-Only Warning Banner */}
      {!canEdit && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 shadow-none"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="font-medium">
            Read-Only View: Statutory blueprints are configured by Authority
            Engineers and Document Controllers.
          </p>
        </div>
      )}

      {/* Dual-Pane Engineering Workbench */}
      <section
        aria-label="Statutory Blueprint Workbench"
        aria-busy={isPending}
        className={cn(
          'grid grid-cols-1 lg:grid-cols-12 gap-0 border border-border rounded-lg overflow-hidden h-auto lg:h-[calc(100vh-11rem)] lg:min-h-140 shadow-none bg-card transition-opacity duration-150',
          isPending && 'opacity-60 pointer-events-none',
        )}
      >
        {/* Left Sidebar Pane: Authority & Stage Navigation Rail */}
        <div className="lg:col-span-5 xl:col-span-4 h-105 sm:h-115 lg:h-full overflow-hidden border-b lg:border-b-0">
          <NocMatrixSidebar
            items={currentItems}
            selectedItemId={selectedItem?.id || null}
            onSelectItem={(id) => setSelectedItemId(id)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedAuthorityFilter={selectedAuthorityFilter}
            onSelectAuthorityFilter={setSelectedAuthorityFilter}
          />
        </div>

        {/* Right Inspector Pane: Milestone Detail & Connectors */}
        <div className="lg:col-span-7 xl:col-span-8 min-h-125 lg:min-h-0 lg:h-full overflow-hidden bg-card">
          <NocMatrixInspector
            item={selectedItem}
            allItems={currentItems}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsEditorOpen(true);
            }}
            onSelectItem={(id) => {
              setSelectedItemId(id);
              setSelectedAuthorityFilter(null);
              setSearchQuery('');
            }}
            canEdit={canEdit}
            revisions={currentRevisions}
            className="border-0 rounded-none h-full overflow-y-auto"
          />
        </div>
      </section>

      {/* Item Editor Drawer */}
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

      {/* Revision Audit Drawer */}
      <MatrixRevisionDrawer
        isOpen={isRevisionDrawerOpen}
        onClose={() => setIsRevisionDrawerOpen(false)}
        masterAuthorityId={selectedAuthorityId}
        masterAuthorityName={currentAuthority?.name || 'Master Authority'}
        revisions={currentRevisions}
      />

      {/* Master Authority Picker Modal */}
      <MasterAuthorityPickerModal
        isOpen={isPickerModalOpen}
        onClose={() => setIsPickerModalOpen(false)}
        masterAuthorities={masterAuthorities}
        selectedAuthorityId={selectedAuthorityId}
        onSelectAuthority={handleSelectAuthority}
        onOpenAddMasterModal={() => setIsAddMasterModalOpen(true)}
        currentUserRole={currentUserRole}
        itemsCountByAuthority={itemsCountByAuthority}
      />

      {/* Register Master Authority Dialog */}
      <Dialog
        open={isAddMasterModalOpen}
        onOpenChange={setIsAddMasterModalOpen}
      >
        <DialogContent className="sm:max-w-md shadow-none">
          <DialogHeader>
            <DialogTitle>Register Master Authority</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMasterAuthority} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="new-master-name"
                className="text-xs font-semibold"
              >
                Authority Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-master-name"
                placeholder="e.g. Abu Dhabi Municipality, Meydan, Aldar"
                value={newMasterName}
                onChange={(e) => setNewMasterName(e.target.value)}
                required
                className="h-8 text-xs shadow-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="new-master-jurisdiction"
                className="text-xs font-semibold"
              >
                Jurisdiction / Free Zone
              </Label>
              <Input
                id="new-master-jurisdiction"
                placeholder="e.g. Abu Dhabi Mainland & Coastal Zones"
                value={newMasterJurisdiction}
                onChange={(e) => setNewMasterJurisdiction(e.target.value)}
                className="h-8 text-xs shadow-none"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddMasterModalOpen(false)}
                disabled={isCreatingMaster}
                className="text-xs h-8 cursor-pointer shadow-none"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingMaster || !newMasterName.trim()}
                className="bg-(--site-cyan) text-white hover:bg-(--site-cyan-hover) text-xs h-8 cursor-pointer gap-1.5 shadow-none"
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
