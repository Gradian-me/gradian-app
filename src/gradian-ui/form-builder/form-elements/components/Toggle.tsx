'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { ToggleProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { Toggle as UIToggle } from '@/components/ui/toggle';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

export const Toggle = forwardRef<FormElementRef, ToggleProps>(
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
      pressed,
      onLabel,
      offLabel,
      className,
      ...props
    },
    ref
  ) => {
    const toggleRef = useRef<React.ElementRef<typeof UIToggle>>(null);
    const currentValue = pressed ?? value ?? false;

    const trueLabel = onLabel ?? config?.onLabel ?? 'On';
    const falseLabel = offLabel ?? config?.offLabel ?? 'Off';
    const trueIcon = config?.onIcon;
    const falseIcon = config?.offIcon;

    useImperativeHandle(ref, () => ({
      focus: () => toggleRef.current?.focus(),
      blur: () => {
        toggleRef.current?.blur();
        onBlur?.();
      },
      validate: () => {
        if (!config?.validation) return true;
        const result = validateField(currentValue, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.(false),
      getValue: () => currentValue,
      setValue: (newValue) => onChange?.(Boolean(newValue)),
    }));

    const handlePressedChange = (nextPressed: boolean) => {
      if (disabled) return;
      onChange?.(nextPressed);
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const handleFocus = () => {
      onFocus?.();
    };

    return (
      <div className="w-full space-y-2">
        {config?.label && (
          <div
            className={cn(
              'flex items-center justify-between gap-2 text-xs font-medium',
              error ? 'text-red-700' : 'text-gray-700',
              required && 'after:content-["*"] after:ml-1 after:text-red-500',
              disabled && 'opacity-60 cursor-not-allowed'
            )}
          >
            <span>{config.label}</span>
            {typeof config.helper === 'string' && (
              <span className="text-xs font-normal text-gray-500">{config.helper}</span>
            )}
          </div>
        )}
        <UIToggle
          ref={toggleRef}
          id={config?.name}
          aria-pressed={currentValue}
          pressed={currentValue}
          onPressedChange={handlePressedChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          data-required={required ?? config?.required ?? config?.validation?.required ?? false}
          className={cn(
            'min-w-[4.5rem] gap-2',
            error && 'border-red-500 focus-visible:ring-red-500 data-[state=on]:border-red-500',
            disabled && 'pointer-events-none opacity-60 cursor-not-allowed',
            className
          )}
          {...props}
        >
          {currentValue ? (
            <>
              {trueIcon && <IconRenderer iconName={trueIcon} className="h-4 w-4" />}
              <span>{trueLabel}</span>
            </>
          ) : (
            <>
              {falseIcon && <IconRenderer iconName={falseIcon} className="h-4 w-4" />}
              <span>{falseLabel}</span>
            </>
          )}
        </UIToggle>
        {config?.description && (
          <p className="text-xs text-gray-500">{config.description}</p>
        )}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';


