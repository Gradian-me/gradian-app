// Label Component
// Uses getLabelClasses for unified styling with other form field labels

import React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { LabelProps } from '../types';
import { cn } from '../../../shared/utils';
import { getLabelClasses } from '../utils/field-styles';

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
  const labelClasses = getLabelClasses({
    error,
    required,
    disabled,
    className: cn('leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className),
  });

  return (
    <LabelPrimitive.Root
      ref={ref}
      htmlFor={htmlFor}
      dir="auto"
      className={labelClasses}
      {...props}
    >
      {children}
    </LabelPrimitive.Root>
  );
});

Label.displayName = 'Label';

export { Label };
