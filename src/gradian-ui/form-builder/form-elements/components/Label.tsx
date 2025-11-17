// Label Component

import React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { LabelProps } from '../types';
import { cn } from '../../../shared/utils';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({
  htmlFor,
  required = false,
  error = false,
  disabled = false,
  className,
  children,
  ...props
}, ref) => {
  const labelClasses = cn(
    'text-xs font-medium leading-none transition-colors',
    'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    error ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300',
    disabled && 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70',
    required && 'after:content-["*"] after:ml-1 after:text-red-500 dark:after:text-red-400',
    className
  );

  return (
    <LabelPrimitive.Root
      ref={ref}
      htmlFor={htmlFor}
      className={labelClasses}
      {...props}
    >
      {children}
    </LabelPrimitive.Root>
  );
});

Label.displayName = 'Label';

export { Label };
