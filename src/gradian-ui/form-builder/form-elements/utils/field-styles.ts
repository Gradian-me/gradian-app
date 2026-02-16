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

export const errorTextClasses = 'mt-1 text-xs text-red-600 dark:text-red-400';

/** Error border/ring for text-like inputs - use when error is present */
export const inputErrorBorderClasses =
  'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500';

/** Error border for select/picker trigger (uses focus: and data-[state=open]:) */
export const selectErrorBorderClasses =
  '!border-red-500 dark:!border-red-500 focus:!border-red-500 dark:focus:!border-red-500 focus:ring-red-300 dark:focus:ring-red-400 data-[state=open]:!border-red-500 dark:data-[state=open]:!border-red-500 data-[state=open]:ring-red-300 dark:data-[state=open]:ring-red-400';

