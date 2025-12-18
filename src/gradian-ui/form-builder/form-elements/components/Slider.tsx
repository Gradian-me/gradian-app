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

    if (!config) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'Slider: config is required');
      return null;
    }

    return (
      <div className="w-full">
        {fieldLabel && (
          <div className="flex items-center justify-between mb-3">
            <label
              htmlFor={fieldName}
              className={getLabelClasses({ error: Boolean(error) })}
            >
              {fieldLabel}
            </label>
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-200 bg-violet-50 dark:bg-violet-500/20 px-2.5 py-1 rounded-md min-w-[2.5rem] text-center">
              {clampedValue}
            </span>
          </div>
        )}
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

