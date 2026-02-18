// Dynamic Card Dialog Component

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { DynamicCardRenderer } from './DynamicCardRenderer';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '../../shared/utils';
import { useDialogBackHandler } from '@/gradian-ui/shared/contexts/DialogContext';
import { CopyContent } from '../../form-builder/form-elements/components/CopyContent';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export interface DynamicCardDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback to close the dialog
   */
  onClose: () => void;
  
  /**
   * Schema for the card
   */
  schema: FormSchema;
  
  /**
   * Data for the card
   */
  data: any;
  
  /**
   * Title for the dialog (when not provided, uses translated "Details")
   */
  title?: string;
  
  /**
   * CSS class name for the dialog content
   */
  className?: string;
  
  /**
   * Callback when view button is clicked (navigates to detail page)
   */
  onView?: (data: any) => void;
  
  /**
   * Callback when view detail button is clicked (navigates to detail page)
   */
  onViewDetail?: (data: any) => void;
  
  /**
   * Callback when edit button is clicked
   */
  onEdit?: (data: any) => void;
  
  /**
   * Callback when delete button is clicked
   */
  onDelete?: (data: any) => void;

  /**
   * Callback when discussions is opened from the actions menu
   */
  onDiscussions?: (data: any) => void;
}

/**
 * DynamicCardDialog - A dialog that shows a card with all badges and metrics
 */
export const DynamicCardDialog: React.FC<DynamicCardDialogProps> = ({
  isOpen,
  onClose,
  schema,
  data,
  title,
  className,
  onView,
  onViewDetail,
  onEdit,
  onDelete,
  onDiscussions,
}) => {
  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();
  const labelDetails = getT(TRANSLATION_KEYS.LABEL_DETAILS, language, defaultLang);
  const displayTitle = title ?? labelDetails;

  // Register dialog for back button handling on mobile
  useDialogBackHandler(isOpen, onClose, 'dialog', 'dynamic-card-dialog');

  if (!isOpen || !data) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} data-test-id="dynamic-card-dialog">
      <DialogContent 
        className={cn(
          // Width: 90vw on sm, 40vw on lg
          "w-[90vw] lg:w-[40vw] max-w-full",
          // Height: use most of viewport so card fits without scroll when possible
          "max-h-[96vh]",
          // Make mobile dialog feel like a full‑screen sheet
          "rounded-none sm:rounded-2xl",
          // Flex column so header stays fixed and card area scrolls
          "flex flex-col overflow-hidden",
          // Responsive padding so content fits on small heights
          "p-2 sm:p-4 md:p-6",
          className
        )} 
        data-test-id="dynamic-card-dialog-content"
      >
        <DialogHeader className="px-0 sm:px-1 shrink-0">
          <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 flex-wrap">
            <span className="truncate" dir="auto">{displayTitle}</span>
            {data?.id && (
              <>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-normal font-mono truncate">
                  ({data.id})
                </span>
                <CopyContent content={String(data.id)} />
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-2 sm:mt-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-0 min-w-0 w-full max-w-full"
          >
            <DynamicCardRenderer
              schema={schema}
              data={data}
              index={0}
              viewMode="grid"
              maxBadges={0} // Show all badges
              maxMetrics={0} // Show all metrics
              onView={onView}
              onViewDetail={onViewDetail}
              onEdit={onEdit}
              onDelete={onDelete}
              onDiscussions={onDiscussions}
              className="shadow-none border-none"
              disableAnimation={true} // Disable card animation in dialog
              isInDialog={true}
              showUserDetails={true}
            />
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

DynamicCardDialog.displayName = 'DynamicCardDialog';
