'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/gradian-ui/data-display/components/Modal';
import { DetailPageMetadataTab } from './DetailPageMetadataTab';
import { FormSchema, DetailPageMetadata } from '../types/form-schema';
import { Button } from '@/components/ui/button';

interface DetailPageMetadataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: DetailPageMetadata | null | undefined;
  onUpdate: (metadata: DetailPageMetadata) => void;
  schema: FormSchema; // Schema for field references (can be minimal schema for pages)
  title?: string;
}

export function DetailPageMetadataDialog({
  isOpen,
  onClose,
  metadata,
  onUpdate,
  schema,
  title = 'Configure Page Layout',
}: DetailPageMetadataDialogProps) {
  // Create a wrapper schema with the metadata for DetailPageMetadataTab
  const schemaWithMetadata = useMemo<FormSchema>(() => {
    return {
      ...schema,
      detailPageMetadata: metadata || {},
    };
  }, [schema, metadata]);

  const handleUpdate = (updates: Partial<FormSchema>) => {
    if (updates.detailPageMetadata) {
      onUpdate(updates.detailPageMetadata);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Configure sections, quick actions, table renderers, and component renderers for this page"
      size="xl"
      showCloseButton={true}
      closeOnOutsideClick={false}
    >
      <div className="max-h-[80vh] overflow-y-auto">
        <DetailPageMetadataTab
          schema={schemaWithMetadata}
          onUpdate={handleUpdate}
        />
      </div>
    </Modal>
  );
}

