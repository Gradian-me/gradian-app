'use client';

// Slider Component
// Modern minimal slider for numeric values

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { SliderProps, FormElementRef } from '../types';
import { cn } from '../../../shared/utils';
import { Slider as UISlider } from '@/components/ui/slider';
import { getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

export const Slider = forwardRef<FormElementRef, SliderProps>(
  (
    {
      config,
      value = 1,
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      min = 1,
      max = 4,
      step = 1,
      className,
      ...props
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({
      focus: () => {},
      blur: () => onBlur?.(),
      validate: () => true,
      reset: () => onChange?.(min),
      getValue: () => value,
      setValue: (newValue) => onChange?.(newValue),
    }));

    const handleValueChange = (newValue: number[]) => {
      onChange?.(newValue[0]);
    };

    const fieldName = config?.name || 'unknown';
    const fieldLabel = config?.label;

    const sliderValue = Array.isArray(value) ? value[0] : (typeof value === 'number' ? value : min);
    const clampedValue = Math.max(min, Math.min(max, sliderValue));
    const percent = max > min ? ((clampedValue - min) / (max - min)) * 100 : 0;

    if (!config) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'Slider: config is required');
      return null;
    }

    return (
      <div className="w-full">
        {fieldLabel && (
          <div className="mb-3">
            <label
              htmlFor={fieldName}
              dir="auto"
              className={getLabelClasses({ error: Boolean(error) })}
            >
              {fieldLabel}
            </label>
          </div>
        )}
        <div className="relative pt-8 pb-1">
          {/* Value pill above thumb */}
          <span
            className="absolute text-xs font-semibold text-violet-700 dark:text-violet-200 bg-violet-100 dark:bg-violet-500/30 border border-violet-200 dark:border-violet-500/50 px-2 py-0.5 rounded-md min-w-8 text-center shadow-sm pointer-events-none whitespace-nowrap -translate-x-1/2 transition-[left] duration-75"
            style={{ left: `${percent+1}%`, top: 0 }}
            aria-hidden
          >
            {clampedValue}
          </span>
          <UISlider
            id={fieldName}
            name={fieldName}
            value={[clampedValue]}
            onValueChange={handleValueChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              error && 'slider-error',
              className
            )}
            {...props}
          />
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

Slider.displayName = 'Slider';

