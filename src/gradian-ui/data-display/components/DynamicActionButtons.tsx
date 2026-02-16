// Dynamic Action Buttons Component
// A reusable component for rendering view, edit, delete action buttons

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/gradian-ui/form-builder/form-elements';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { DiscussionsDialog, type DiscussionConfig } from '@/gradian-ui/communication';
import { getDiscussionCount } from '@/gradian-ui/data-display/utils';

export type ActionType = 'view' | 'edit' | 'delete';

export interface ActionConfig {
  type: ActionType;
  onClick: () => void;
  disabled?: boolean;
  href?: string; // Optional href for view actions to enable new tab opening
  canOpenInNewTab?: boolean; // Enable Ctrl+click and middle-click to open in new tab (only for view actions with href)
}

export interface DynamicActionButtonsProps {
  /**
   * Array of actions to display
   */
  actions: ActionConfig[];
  
  /**
   * Variant style: 'minimal' shows icon-only buttons, 'expanded' shows buttons with labels
   * @default "minimal"
   */
  variant?: 'minimal' | 'expanded';
  
  /**
   * CSS class name for the container
   */
  className?: string;
  
  /**
   * Whether to stop event propagation on click
   * @default true
   */
  stopPropagation?: boolean;

  /**
   * When provided, shows a discussions button that opens the discussions dialog
   */
  discussionConfig?: DiscussionConfig;

  /**
   * Engagement counts from /api/data (e.g. [{ discussion: 1 }]); used to show discussion badge when present
   */
  engagementCounts?: unknown;
}

/**
 * DynamicActionButtons - A reusable component for rendering action buttons
 * Supports both minimal (icon-only) and expanded (with labels) variants
 */
export const DynamicActionButtons: React.FC<DynamicActionButtonsProps> = ({
  actions,
  variant = 'minimal',
  className,
  stopPropagation = true,
  discussionConfig,
  engagementCounts,
}) => {
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const labelView = getT(TRANSLATION_KEYS.BUTTON_VIEW, language, defaultLang);
  const labelEdit = getT(TRANSLATION_KEYS.BUTTON_EDIT, language, defaultLang);
  const labelDelete = getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang);

  const getActionConfig = (type: ActionType) => {
    const configs: Record<ActionType, { icon: string; label: string; hoverClass: string }> = {
      view: {
        icon: 'Eye',
        label: labelView,
        hoverClass: 'hover:bg-sky-50 hover:border-sky-300 hover:text-sky-400',
      },
      edit: {
        icon: 'Edit',
        label: labelEdit,
        hoverClass: 'hover:bg-violet-50 hover:border-violet-300 hover:text-violet-400',
      },
      delete: {
        icon: 'Trash2',
        label: labelDelete,
        hoverClass: 'hover:bg-red-50 hover:border-red-300 hover:text-red-400',
      },
    };
    return configs[type];
  };

  const handleClick = (action: ActionConfig) => (e: React.MouseEvent) => {
    // The Button component handles ctrl+click and middle-click for new tab opening
    // This handler only runs for normal clicks
    e.preventDefault();
    if (stopPropagation) {
      e.stopPropagation();
    }
    
    // If href is provided, use Next.js router for navigation
    if (action.href) {
      router.push(action.href);
    } else {
      // Otherwise call the onClick handler
      action.onClick();
    }
  };

  const containerProps = stopPropagation
    ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
        },
        onMouseDown: (e: React.MouseEvent) => {
          e.stopPropagation();
        },
      }
    : {};

  const discussionCount = getDiscussionCount(engagementCounts);
  const discussionButton = discussionConfig ? (
    <Button
      key="discussion"
      type="button"
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.preventDefault();
        if (stopPropagation) e.stopPropagation();
        setDiscussionOpen(true);
      }}
      className={cn(
        variant === 'minimal'
          ? 'h-8 w-8 p-0 relative'
          : 'flex-1',
        'transition-all duration-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
        'hover:bg-sky-50 hover:border-sky-300 hover:text-sky-400'
      )}
      data-action-button
    >
      <IconRenderer iconName="MessageCircle" className="h-4 w-4" />
      {variant === 'expanded' && (
        <span className="ms-2">Discussions</span>
      )}
      {discussionCount > 0 && (
        <span
          className={cn(
            'tabular-nums text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 rounded-full',
            variant === 'minimal'
              ? 'absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1.5 flex items-center justify-center'
              : 'ms-2 min-w-5 h-5 px-1.5 inline-flex items-center justify-center'
          )}
        >
          {discussionCount > 99 ? '99+' : discussionCount}
        </span>
      )}
    </Button>
  ) : null;

  const buttonsContent = variant === 'expanded' ? (
    <div
        {...containerProps}
        className={cn('flex gap-2 flex-row w-full flex-wrap', className)}
        data-action-button
      >
        {discussionButton}
        {actions.map((action, index) => {
          const config = getActionConfig(action.type);
          return (
            <Button
              key={`${action.type}-${index}`}
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClick(action)}
              disabled={action.disabled}
              href={action.href}
              canOpenInNewTab={action.canOpenInNewTab}
              className={cn(
                'flex-1 transition-all duration-200 text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
                config.hoverClass
              )}
              data-action-button
            >
              <IconRenderer iconName={config.icon} className="h-4 w-4 me-2" />
              {config.label}
            </Button>
          );
        })}
      </div>
  ) : (
    <div
      {...containerProps}
      className={cn('flex items-center justify-center gap-1', className)}
      data-action-button
    >
      {discussionButton}
      {actions.map((action, index) => {
        const config = getActionConfig(action.type);
        return (
          <Button
            key={`${action.type}-${index}`}
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClick(action)}
            disabled={action.disabled}
            href={action.href}
            canOpenInNewTab={action.canOpenInNewTab}
            className={cn(
              'h-8 w-8 p-0 transition-all duration-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
              config.hoverClass
            )}
            data-action-button
          >
            <IconRenderer iconName={config.icon} className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );

  return (
    <>
      {buttonsContent}
      {discussionConfig && (
        <DiscussionsDialog
          isOpen={discussionOpen}
          onOpenChange={setDiscussionOpen}
          config={discussionConfig}
        />
      )}
    </>
  );
};

DynamicActionButtons.displayName = 'DynamicActionButtons';

