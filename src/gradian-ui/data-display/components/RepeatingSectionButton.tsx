'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table2 } from 'lucide-react';

type RepeatingSectionButtonProps = {
  sectionId: string;
  sectionTitle?: string | null;
  entityId: string;
  entityData: any;
  itemCount: number | null;
  onOpen: (params: {
    sectionId: string;
    sectionTitle?: string | null;
    entityData: any;
    entityId: string;
  }) => void;
};

/**
 * Reusable launcher button for opening repeating section dialog / related tables.
 * Matches the table action button styling used by the row actions menu.
 */
export function RepeatingSectionButton({
  sectionId,
  sectionTitle,
  entityId,
  entityData,
  itemCount,
  onOpen,
}: RepeatingSectionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        onOpen({
          sectionId,
          sectionTitle: sectionTitle || sectionId,
          entityData,
          entityId,
        })
      }
      className="h-8 px-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all duration-200"
    >
      <Table2 className="h-4 w-4" />
      {itemCount !== null && (
        <span className="text-xs font-medium ms-1.5">{itemCount}</span>
      )}
    </Button>
  );
}


