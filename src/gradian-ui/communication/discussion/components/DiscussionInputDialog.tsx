'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/gradian-ui/form-builder/form-elements/components/Textarea';
import { Button } from '@/components/ui/button';
import { MessageCirclePlus } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { createDiscussion } from '../utils/discussion-api';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import type { EngagementPriority } from '../types';
import type { DiscussionConfig } from '../types';

const PRIORITY_KEYS: Record<EngagementPriority, keyof typeof TRANSLATION_KEYS> = {
  low: TRANSLATION_KEYS.DISCUSSION_PRIORITY_LOW,
  medium: TRANSLATION_KEYS.DISCUSSION_PRIORITY_MEDIUM,
  high: TRANSLATION_KEYS.DISCUSSION_PRIORITY_HIGH,
  urgent: TRANSLATION_KEYS.DISCUSSION_PRIORITY_URGENT,
};

export interface DiscussionInputDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  config: DiscussionConfig;
  onSuccess?: () => void;
  className?: string;
}

export const DiscussionInputDialog: React.FC<DiscussionInputDialogProps> = ({
  isOpen,
  onOpenChange,
  config,
  onSuccess,
  className,
}) => {
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const t = (key: string) => getT(key, language, defaultLang);

  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<EngagementPriority | ''>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReply = Boolean(config.referenceEngagementId);

  useEffect(() => {
    if (!isOpen) {
      setMessage('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createDiscussion({
        schemaId: config.schemaId,
        instanceId: config.instanceId,
        message: trimmed,
        priority: priority || 'medium',
        createdBy: config.currentUserId,
        referenceEngagementId: config.referenceEngagementId,
      });
      setMessage('');
      setPriority('medium');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setIsSubmitting(false);
    }
  }, [message, priority, config, onSuccess, onOpenChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isSubmitting) {
        setMessage('');
        setError(null);
      }
      onOpenChange(open);
    },
    [isSubmitting, onOpenChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn('max-w-4xl w-[95vw] z-[110]', className)}
        overlayClassName="z-[105] bg-black/70 dark:bg-black/80 backdrop-blur-sm"
        hideCloseButton={isSubmitting}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {isReply ? t(TRANSLATION_KEYS.DISCUSSION_TITLE_REPLY) : t(TRANSLATION_KEYS.DISCUSSION_TITLE_NEW)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide block mb-2">
              {t(TRANSLATION_KEYS.DISCUSSION_LABEL_MESSAGE)}
            </label>
            <Textarea
              config={{
                name: 'discussion-message',
                placeholder: t(TRANSLATION_KEYS.DISCUSSION_PLACEHOLDER_MESSAGE),
              }}
              value={message}
              onChange={(v) => setMessage(typeof v === 'string' ? v : '')}
              onKeyDown={handleKeyDown}
              rows={5}
              disabled={isSubmitting}
              resize="vertical"
              aiAgentId="professional-writing"
              enableVoiceInput
              className={cn(
                'min-h-[120px] md:min-h-[140px] px-4 md:px-5 py-3 md:py-4 rounded-xl border',
                'bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm',
                'border-violet-200/50 dark:border-violet-700/50',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:border-violet-400',
                'dark:focus-visible:ring-violet-500/50 dark:focus-visible:border-violet-500 dark:ring-offset-gray-900',
                'shadow-sm transition-all duration-200 direction-auto leading-relaxed text-sm',
                'disabled:dark:bg-gray-800/50 disabled:dark:text-gray-400'
              )}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t(TRANSLATION_KEYS.DISCUSSION_LABEL_PRIORITY)}
            </label>
            <ToggleGroup
              type="single"
              value={priority || undefined}
              onValueChange={(v) => {
                setPriority((prev) => {
                  if (v === '' || v === undefined) return '';
                  if (v === prev) return '';
                  return v as EngagementPriority;
                });
              }}
              className="flex flex-wrap gap-2"
            >
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <ToggleGroupItem
                  key={p}
                  value={p}
                  aria-label={`Priority: ${t(PRIORITY_KEYS[p])}`}
                  className={cn(
                    'rounded-xl px-4 py-2 data-[state=on]:border-2',
                    p === 'urgent' &&
                      'data-[state=on]:bg-rose-100 data-[state=on]:border-rose-300 data-[state=on]:text-rose-800 dark:data-[state=on]:bg-rose-900/30 dark:data-[state=on]:border-rose-700 dark:data-[state=on]:text-rose-200',
                    p === 'high' &&
                      'data-[state=on]:bg-amber-100 data-[state=on]:border-amber-300 data-[state=on]:text-amber-800 dark:data-[state=on]:bg-amber-900/30 dark:data-[state=on]:border-amber-700 dark:data-[state=on]:text-amber-200',
                    p === 'medium' &&
                      'data-[state=on]:bg-sky-100 data-[state=on]:border-sky-300 data-[state=on]:text-sky-800 dark:data-[state=on]:bg-sky-900/30 dark:data-[state=on]:border-sky-700 dark:data-[state=on]:text-sky-200',
                    p === 'low' &&
                      'data-[state=on]:bg-slate-100 data-[state=on]:border-slate-300 data-[state=on]:text-slate-700 dark:data-[state=on]:bg-slate-800/50 dark:data-[state=on]:border-slate-600 dark:data-[state=on]:text-slate-300'
                  )}
                >
                  {t(TRANSLATION_KEYS[PRIORITY_KEYS[p]])}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t(TRANSLATION_KEYS.BUTTON_CANCEL)}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              t('DISCUSSION_ADDING')
            ) : (
              <>
                <MessageCirclePlus className="h-4 w-4" />
                {t(TRANSLATION_KEYS.DISCUSSION_BUTTON_ADD)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

DiscussionInputDialog.displayName = 'DiscussionInputDialog';
