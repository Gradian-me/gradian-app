'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { useDialogBackHandler } from '@/gradian-ui/shared/contexts/DialogContext';

interface SchemaDeleteConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  schemaName: string;
  onConfirm: (hardDelete: boolean) => void;
}

export const SchemaDeleteConfirmDialog: React.FC<SchemaDeleteConfirmDialogProps> = ({
  isOpen,
  onOpenChange,
  schemaName,
  onConfirm,
}) => {
  const [hardDelete, setHardDelete] = useState(false);
  
  const handleClose = React.useCallback(() => {
    onOpenChange(false);
    // Reset checkbox when dialog closes
    setHardDelete(false);
  }, [onOpenChange]);
  
  useDialogBackHandler(isOpen, handleClose, 'dialog', 'schema-delete-confirm');

  const handleConfirm = () => {
    onConfirm(hardDelete);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-red-200">
        <DialogHeader>
          <DialogTitle>Set Schema Inactive</DialogTitle>
          <DialogDescription>
            Are you sure you want to set "{schemaName}" as inactive?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-700">
            It will be hidden from the schema list but can be reactivated later.
          </p>
          
          <div className="flex items-start space-x-3 p-4 border border-amber-200 bg-amber-50 rounded-lg dark:border-amber-800 dark:bg-amber-950/20">
            <Checkbox
              id="hard-delete"
              checked={hardDelete}
              onCheckedChange={(checked) => setHardDelete(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="hard-delete"
                className="text-sm font-medium text-amber-900 dark:text-amber-100 cursor-pointer"
              >
                Hard Delete (Permanent)
              </Label>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                If checked, this will permanently delete the schema, all its data, and all related data relations. 
                <strong className="block mt-1">This action cannot be undone.</strong>
              </p>
            </div>
          </div>
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
            <IconRenderer iconName="Trash2" className="h-4 w-4 me-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

SchemaDeleteConfirmDialog.displayName = 'SchemaDeleteConfirmDialog';

