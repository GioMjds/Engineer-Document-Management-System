'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ProjectModalContextType {
  setIsDirty: (dirty: boolean) => void;
  requestClose: () => void;
  closeModal: () => void;
}

export const ProjectModalContext = createContext<ProjectModalContextType | null>(null);

export function useProjectModal() {
  return useContext(ProjectModalContext);
}

export interface ProjectDialogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function ProjectDialogModal({
  open,
  onOpenChange,
  children,
}: ProjectDialogModalProps) {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleConfirmedClose = useCallback(() => {
    setShowExitConfirm(false);
    setIsDirty(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const closeModal = useCallback(() => {
    setIsDirty(false);
    setShowExitConfirm(false);
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, router]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      handleConfirmedClose();
    }
  }, [isDirty, handleConfirmedClose]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean, details?: { reason?: string; cancel?: () => void }) => {
      if (!nextOpen) {
        // Prevent close when clicking outside backdrop.
        if (details?.reason === 'outsidePress') {
          details.cancel?.();
          return;
        }

        // Intercept close button and escape key if unsaved changes exist.
        if (isDirty) {
          details?.cancel?.();
          setShowExitConfirm(true);
          return;
        }

        handleConfirmedClose();
      } else {
        onOpenChange(true);
      }
    },
    [isDirty, handleConfirmedClose, onOpenChange],
  );

  return (
    <ProjectModalContext.Provider value={{ setIsDirty, requestClose, closeModal }}>
      <Dialog
        open={open}
        disablePointerDismissal
        onOpenChange={handleOpenChange}
      >
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton={true}
        >
          <DialogHeader>
            <DialogTitle>Register New Project</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Admin exclusive: Initialize project scope, stakeholder contacts, and contract values.
            </DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showExitConfirm}
        disablePointerDismissal
        onOpenChange={(confirmOpen) => {
          if (!confirmOpen) setShowExitConfirm(false);
        }}
      >
        <DialogContent
          className="sm:max-w-md z-[60]"
          showCloseButton={false}
        >
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              <DialogTitle>Discard Unsaved Project?</DialogTitle>
            </div>
            <DialogDescription>
              You have unsaved changes in this project registration form. Exiting now will discard all entered details and team assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExitConfirm(false)}
            >
              Continue Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmedClose}
            >
              Discard and Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProjectModalContext.Provider>
  );
}
