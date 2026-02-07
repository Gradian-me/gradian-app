import { cn } from '../../../shared/utils';

export interface LabelStyleOptions {
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const baseInputClasses =
  'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300';

export const getLabelClasses = ({
  error,
  required,
  disabled,
  className,
}: LabelStyleOptions = {}) =>
  cn(
    'block w-full text-xs font-medium mb-2 transition-colors direction-auto',
    error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
    disabled && 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70',
    required && 'after:content-["*"] after:ms-1 after:text-red-500 dark:after:text-red-400',
    className,
  );

export const errorTextClasses = 'mt-1 text-sm text-red-600 dark:text-red-400';

