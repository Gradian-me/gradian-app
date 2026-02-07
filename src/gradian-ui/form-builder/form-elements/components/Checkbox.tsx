// Checkbox Component

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { CheckboxProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses } from '../utils/field-styles';
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

export const Checkbox = forwardRef<FormElementRef, CheckboxProps>(
  (
    {
      config,
      value = false,
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      required = false,
      checked,
      indeterminate = false,
      className,
      touched,
      ...props
    },
    ref
  ) => {
    const checkboxRef = useRef<React.ElementRef<typeof CheckboxPrimitive.Root>>(null);

    useImperativeHandle(ref, () => ({
      focus: () => checkboxRef.current?.focus(),
      blur: () => {
        checkboxRef.current?.blur();
        onBlur?.();
      },
      validate: () => {
        if (!config.validation) return true;
        const result = validateField(value, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.(false),
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleCheckedChange = (checked: boolean) => {
      onChange?.(checked);
    };

    const isChecked = checked !== undefined ? checked : value;

    const checkboxClasses = cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500 data-[state=checked]:text-white hover:border-violet-400 transition-colors",
      error && "border-red-500 focus-visible:ring-red-500",
      className
    );

    return (
      <div className="w-full">
        <div className="flex items-center">
          <CheckboxPrimitive.Root
            ref={checkboxRef}
            id={config.name}
            name={config.name}
            checked={isChecked}
            onCheckedChange={handleCheckedChange}
            onBlur={onBlur}
            onFocus={onFocus}
            disabled={disabled}
            required={required ?? config.required ?? config.validation?.required ?? false}
            className={checkboxClasses}
            {...props}
          >
            <CheckboxPrimitive.Indicator
              className={cn("flex items-center justify-center text-current")}
            >
              <Check className="h-4 w-4" />
            </CheckboxPrimitive.Indicator>
          </CheckboxPrimitive.Root>
          {config.label && (
            <label
              htmlFor={config.name}
              dir="auto"
              className={getLabelClasses({
                error: Boolean(error),
                required,
                disabled,
                className: 'ms-2 mb-0! leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              })}
            >
              {config.label}
            </label>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
