// Switch Component

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { SwitchProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { Switch as RadixSwitch } from '../../../../components/ui/switch';
import { Label } from '../../../../components/ui/label';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';

export const Switch = forwardRef<FormElementRef, SwitchProps>(
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
      className,
      ...props
    },
    ref
  ) => {
    const switchRef = useRef<React.ElementRef<typeof RadixSwitch>>(null);

    useImperativeHandle(ref, () => ({
      focus: () => switchRef.current?.focus(),
      blur: () => switchRef.current?.blur(),
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

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = () => {
      onFocus?.();
    };

    const isChecked = checked !== undefined ? checked : value;

    // Filter out non-DOM props that shouldn't be passed to RadixSwitch
    const { touched, ...radixProps } = props;

    return (
      <div className="w-full">
        <div className="flex items-center gap-2">
          <RadixSwitch
            ref={switchRef}
            id={config.name}
            name={config.name}
            checked={isChecked}
            onCheckedChange={handleCheckedChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            required={required ?? config.validation?.required ?? false}
            disabled={disabled}
            className={cn(
              error && 'border-red-500 dark:border-red-600 focus-visible:ring-red-500 dark:focus-visible:ring-red-600',
              className
            )}
            {...radixProps}
          />
          {config.label && (
            <Label
              htmlFor={config.name}
              className={getLabelClasses({
                error: Boolean(error),
                required,
                disabled,
                className: 'text-xs cursor-pointer mb-0',
              })}
            >
              {config.label}
            </Label>
          )}
        </div>
        {error && (
          <p className={errorTextClasses} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

