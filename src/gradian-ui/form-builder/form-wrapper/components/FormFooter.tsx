'use client';

// Form Footer Component

import React, { useState } from 'react';
import { X, RotateCcw, Save, MessageCircle } from 'lucide-react';
import { FormFooterProps } from '../types';
import { FormActions } from './FormActions';
import { cn } from '../../../shared/utils';
import { DiscussionsDialog } from '@/gradian-ui/communication';
import { getDiscussionCount } from '@/gradian-ui/data-display/utils';

export const FormFooter: React.FC<FormFooterProps> = ({
  actions,
  discussionConfig,
  engagementCounts,
  showReset = true,
  showCancel = false,
  onSubmit,
  onReset,
  onCancel,
  disabled = false,
  loading = false,
  className,
  children,
  ...props
}) => {
  const defaultActions: any[] = [];

  if (showCancel && onCancel) {
    defaultActions.push({
      type: 'cancel' as const,
      label: 'Cancel',
      variant: 'ghost' as const,
      icon: <X className="h-4 w-4" />,
      disabled: disabled || loading,
      onClick: onCancel,
    });
  }

  if (showReset && onReset) {
    defaultActions.push({
      type: 'reset' as const,
      label: 'Reset',
      variant: 'outline' as const,
      icon: <RotateCcw className="h-4 w-4" />,
      disabled: disabled || loading,
      onClick: onReset,
    });
  }

  if (onSubmit) {
    defaultActions.push({
      type: 'submit' as const,
      label: 'Submit',
      variant: 'default' as const,
      icon: <Save className="h-4 w-4" />,
      disabled: disabled || loading,
      loading,
      onClick: onSubmit,
    });
  }

  // Convert actions object to array format if it's an object
  const convertActionsToArray = (actionsConfig: any): any[] => {
    if (!actionsConfig) return defaultActions;
    
    // If it's already an array, return it
    if (Array.isArray(actionsConfig)) return actionsConfig;
    
    // If it's an object, convert it to array format
    const actionsArray: any[] = [];
    
    if (actionsConfig.cancel && showCancel) {
      actionsArray.push({
        type: 'cancel' as const,
        label: actionsConfig.cancel.label || 'Cancel',
        variant: actionsConfig.cancel.variant || 'ghost',
        icon: actionsConfig.cancel.icon || <X className="h-4 w-4" />,
        disabled: actionsConfig.cancel.disabled || disabled || loading,
        onClick: onCancel || actionsConfig.cancel.onClick,
      });
    }
    
    if (actionsConfig.reset && showReset) {
      actionsArray.push({
        type: 'reset' as const,
        label: actionsConfig.reset.label || 'Reset',
        variant: actionsConfig.reset.variant || 'outline',
        icon: actionsConfig.reset.icon || <RotateCcw className="h-4 w-4" />,
        disabled: actionsConfig.reset.disabled || disabled || loading,
        onClick: onReset,
      });
    }
    
    if (actionsConfig.submit) {
      actionsArray.push({
        type: 'submit' as const,
        label: actionsConfig.submit.label || 'Submit',
        variant: actionsConfig.submit.variant || 'default',
        icon: actionsConfig.submit.icon || <Save className="h-4 w-4" />,
        disabled: actionsConfig.submit.disabled || disabled || loading,
        loading,
        onClick: onSubmit,
      });
    }
    
    return actionsArray.length > 0 ? actionsArray : defaultActions;
  };

  const [discussionOpen, setDiscussionOpen] = useState(false);
  let finalActions = convertActionsToArray(actions);

  if (discussionConfig) {
    const discussionCount = getDiscussionCount(engagementCounts);
    finalActions = [
      {
        type: 'custom' as const,
        label: 'Discussions',
        variant: 'ghost' as const,
        icon: <MessageCircle className="h-4 w-4" />,
        disabled: disabled || loading,
        onClick: () => setDiscussionOpen(true),
        badge: discussionCount > 0 ? discussionCount : undefined,
      },
      ...finalActions,
    ];
  }

  const footerClasses = cn(
    'flex items-center justify-end space-x-4 pt-8 pb-4 border-t border-gray-200',
    className
  );

  return (
    <>
      <div className={footerClasses} {...props}>
        {children || <FormActions actions={finalActions} />}
      </div>
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

FormFooter.displayName = 'FormFooter';
