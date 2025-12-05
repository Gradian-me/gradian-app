'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { useDialogBackHandler } from '@/gradian-ui/shared/contexts/DialogContext';

interface AiAgentDeleteConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  onConfirm: () => void;
}

export const AiAgentDeleteConfirmDialog: React.FC<AiAgentDeleteConfirmDialogProps> = ({
  isOpen,
  onOpenChange,
  agentName,
  onConfirm,
}) => {
  const handleClose = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);
  
  useDialogBackHandler(isOpen, handleClose, 'dialog', 'ai-agent-delete-confirm');

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-red-200">
        <DialogHeader>
          <DialogTitle>Delete AI Agent</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{agentName}"?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This action cannot be undone. The AI agent will be permanently deleted.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            type="button"
          >
            <IconRenderer iconName="Trash2" className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

AiAgentDeleteConfirmDialog.displayName = 'AiAgentDeleteConfirmDialog';

