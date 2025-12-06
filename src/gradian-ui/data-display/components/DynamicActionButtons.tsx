// Dynamic Action Buttons Component
// A reusable component for rendering view, edit, delete action buttons

import React from 'react';
import { Button } from '@/gradian-ui/form-builder/form-elements';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/gradian-ui/shared/utils';

export type ActionType = 'view' | 'edit' | 'delete';

export interface ActionConfig {
  type: ActionType;
  onClick: () => void;
  disabled?: boolean;
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
}) => {
  const getActionConfig = (type: ActionType) => {
    const configs: Record<ActionType, { icon: string; label: string; hoverClass: string }> = {
      view: {
        icon: 'Eye',
        label: 'View',
        hoverClass: 'hover:bg-sky-50 hover:border-sky-300 hover:text-sky-400',
      },
      edit: {
        icon: 'Edit',
        label: 'Edit',
        hoverClass: 'hover:bg-violet-50 hover:border-violet-300 hover:text-violet-400',
      },
      delete: {
        icon: 'Trash2',
        label: 'Delete',
        hoverClass: 'hover:bg-red-50 hover:border-red-300 hover:text-red-400',
      },
    };
    return configs[type];
  };

  const handleClick = (action: ActionConfig) => (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    action.onClick();
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

  if (variant === 'expanded') {
    return (
      <div
        {...containerProps}
        className={cn('flex gap-2 flex-row w-full flex-wrap', className)}
        data-action-button
      >
        {actions.map((action, index) => {
          const config = getActionConfig(action.type);
          return (
            <Button
              key={`${action.type}-${index}`}
              variant="outline"
              size="sm"
              onClick={handleClick(action)}
              disabled={action.disabled}
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
    );
  }

  // Minimal variant (icon-only)
  return (
    <div
      {...containerProps}
      className={cn('flex items-center justify-center gap-1', className)}
      data-action-button
    >
      {actions.map((action, index) => {
        const config = getActionConfig(action.type);
        return (
          <Button
            key={`${action.type}-${index}`}
            variant="outline"
            size="sm"
            onClick={handleClick(action)}
            disabled={action.disabled}
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
};

DynamicActionButtons.displayName = 'DynamicActionButtons';

