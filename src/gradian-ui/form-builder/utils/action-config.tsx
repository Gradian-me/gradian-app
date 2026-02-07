/**
 * Utility functions for generating action configurations dynamically
 */

import React from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export interface ActionConfig {
  type: 'submit' | 'cancel' | 'reset';
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link' | 'gradient';
  loading?: string;
  icon?: React.ReactNode;
}

/** Optional translator: (key, fallback) => string */
export type ActionConfigTranslator = (key: string, fallback: string) => string;

/**
 * Get action configuration for a form action.
 * When t is provided, labels and loading text are translated.
 */
export const getActionConfig = (
  actionType: 'submit' | 'cancel' | 'reset',
  singularName: string,
  isEditMode: boolean = false,
  t?: ActionConfigTranslator
): ActionConfig => {
  const labelCreate = t ? t(TRANSLATION_KEYS.LABEL_CREATE, 'Create') : 'Create';
  const labelUpdate = t ? t(TRANSLATION_KEYS.LABEL_UPDATE, 'Update') : 'Update';
  const labelCancel = t ? t(TRANSLATION_KEYS.BUTTON_CANCEL, 'Cancel') : 'Cancel';
  const labelReset = t ? t(TRANSLATION_KEYS.BUTTON_RESET, 'Reset') : 'Reset';
  const msgCreating = t ? t(TRANSLATION_KEYS.MESSAGE_CREATING, 'Creating...') : 'Creating...';
  const msgUpdating = t ? t(TRANSLATION_KEYS.MESSAGE_UPDATING, 'Updating...') : 'Updating...';

  const configs: Record<string, ActionConfig> = {
    submit: {
      type: 'submit',
      label: isEditMode ? `${labelUpdate} ${singularName}` : `${labelCreate} ${singularName}`,
      variant: 'default',
      loading: isEditMode ? `${msgUpdating} ${singularName}...` : `${msgCreating} ${singularName}...`,
      icon: <Save className="h-4 w-4" />
    },
    cancel: {
      type: 'cancel',
      label: labelCancel,
      variant: 'ghost',
      loading: undefined,
      icon: <X className="h-4 w-4" />
    },
    reset: {
      type: 'reset',
      label: labelReset,
      variant: 'outline',
      loading: undefined,
      icon: <RotateCcw className="h-4 w-4" />
    }
  };

  return configs[actionType];
};

/**
 * Get singular name from schema
 */
export const getSingularName = (schema: { singular_name?: string; name?: string }): string => {
  return schema.singular_name || schema.name || 'Item';
};

/**
 * Check if form is in edit mode based on initial values
 */
export const isEditMode = (initialValues: any): boolean => {
  return !!(initialValues && (initialValues.id || initialValues._id || initialValues.Id));
};


