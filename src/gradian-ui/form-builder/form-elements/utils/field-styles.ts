import { cn } from '../../../shared/utils';
import {
  FORM_INPUT_BASE_CLASSES,
  FORM_TEXTAREA_BASE_CLASSES,
  FORM_SELECT_TRIGGER_BASE_CLASSES,
  FORM_FIELD_DISABLED_CLASSES,
} from '@/gradian-ui/shared/configs/ui-config';

export interface LabelStyleOptions {
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Unified input styling (height, bg, border, disabled, focus) from ui-config. */
export const baseInputClasses = FORM_INPUT_BASE_CLASSES;

/** Unified textarea styling (same border/bg/disabled/focus as inputs). */
export const textareaBaseClasses = FORM_TEXTAREA_BASE_CLASSES;

/** Unified select/combobox trigger styling (same border/bg/disabled as inputs). */
export const selectTriggerBaseClasses = FORM_SELECT_TRIGGER_BASE_CLASSES;

/** Shared disabled state for form controls (Toggle, ToggleGroup). */
export const fieldDisabledClasses = FORM_FIELD_DISABLED_CLASSES;

export const getLabelClasses = ({
  error,
  required,
  disabled,
  className,
}: LabelStyleOptions = {}) =>
  cn(
    'block w-full text-xs font-medium mb-2 transition-colors direction-auto leading-relaxed',
    error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
    disabled && 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70',
    required && 'after:content-["*"] after:ms-1 after:text-red-500 dark:after:text-red-400',
    className,
  );

export const errorTextClasses = 'mt-1 text-sm text-red-600 dark:text-red-400';

