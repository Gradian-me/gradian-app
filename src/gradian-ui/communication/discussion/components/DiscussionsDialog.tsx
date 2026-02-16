'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCirclePlus, RefreshCw } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { useDiscussions } from '../hooks/useDiscussions';
import { DiscussionThread } from './DiscussionThread';
import { DiscussionInputDialog } from './DiscussionInputDialog';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import type { DiscussionConfig } from '../types';
import type { DiscussionMessage as DiscussionMessageType } from '../types';

export interface DiscussionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  config: DiscussionConfig;
  title?: string;
  userResolver?: (userId: string) => { name?: string; avatarUrl?: string };
  className?: string;
}

export const DiscussionsDialog: React.FC<DiscussionsDialogProps> = ({
  isOpen,
  onOpenChange,
  config,
  title,
  userResolver,
  className,
}) => {
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const t = (key: string) => getT(key, language, defaultLang);

  const [inputOpen, setInputOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<DiscussionMessageType | null>(null);

  const { discussions, isLoading, error, refetch } = useDiscussions({
    schemaId: config.schemaId,
    instanceId: config.instanceId,
    currentUserId: config.currentUserId,
    enabled: isOpen,
  });

  const handleSuccess = () => {
    refetch();
    setReplyTo(null);
  };

  const handleReply = (message: DiscussionMessageType) => {
    setReplyTo(message);
    setInputOpen(true);
  };

  const handleInputOpenChange = (open: boolean) => {
    if (!open) setReplyTo(null);
    setInputOpen(open);
  };

  const configForInput: DiscussionConfig = replyTo
    ? { ...config, referenceEngagementId: replyTo.id }
    : config;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn('max-w-5xl w-[95vw] max-h-[90vh] flex flex-col z-[100]', className)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DialogHeader
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 me-4">
              <DialogTitle>{title ?? t(TRANSLATION_KEYS.DISCUSSION_TITLE_DIALOG)}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    refetch();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={isLoading}
                  className="gap-2"
                  title={t(TRANSLATION_KEYS.BUTTON_REFRESH)}
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                  {t(TRANSLATION_KEYS.BUTTON_REFRESH)}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setReplyTo(null);
                    setInputOpen(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="gap-2"
                >
                  <MessageCirclePlus className="h-4 w-4" />
                  {t(TRANSLATION_KEYS.DISCUSSION_BUTTON_ADD)}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 py-2 -mx-1 px-1">
            {error ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : (
              <DiscussionThread
                messages={discussions}
                userResolver={userResolver}
                isLoading={isLoading}
                onStartDiscussion={() => {
                  setReplyTo(null);
                  setInputOpen(true);
                }}
                onReply={handleReply}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DiscussionInputDialog
        isOpen={inputOpen}
        onOpenChange={handleInputOpenChange}
        config={configForInput}
        onSuccess={handleSuccess}
      />
    </>
  );
};

DiscussionsDialog.displayName = 'DiscussionsDialog';
