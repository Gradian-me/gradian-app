// Form Content Component

import React from 'react';
import { FormContentProps } from '../types';
import { FormElementFactory } from '../../form-elements';
import { cn } from '../../../shared/utils';

export const FormContent: React.FC<FormContentProps> = ({
  fields,
  values,
  errors,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  layout,
  className,
  children,
  fieldTabIndexMap,
  ...props
}) => {
  const contentClasses = cn(
    'space-y-6',
    layout?.columns && layout.columns > 1 ? 'grid gap-6' : '',
    layout?.columns === 2 ? 'grid-cols-1 md:grid-cols-2' : '',
    layout?.columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : '',
    layout?.columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : '',
    layout?.gap ? `gap-${layout.gap}` : '',
    layout?.direction === 'row' ? 'flex flex-wrap gap-6' : '',
    className
  );

  return (
    <div className={contentClasses} {...props}>
      {children || fields.map((field) => {
        // Skip hidden and inactive fields
        if ((field as any).hidden || field.layout?.hidden || (field as any).inactive) {
          return null;
        }

        // Use defaultValue if value is undefined, null, or empty string
        let fieldValue = values[field.name];
        if ((fieldValue === undefined || fieldValue === null || fieldValue === '') && (field as any).defaultValue !== undefined) {
          fieldValue = (field as any).defaultValue;
        }

        return (
          <div
            key={field.name}
            className={cn(
              layout?.columns && layout.columns > 1 ? 'space-y-3' : '',
              field.layout?.hidden ? 'hidden' : ''
            )}
            style={{
              order: (field as any).order ?? field.layout?.order,
              width: field.layout?.width,
            }}
          >
            <FormElementFactory
              config={field}
              value={fieldValue}
              onChange={(value) => onChange(field.name, value)}
              onBlur={() => onBlur(field.name)}
              onFocus={() => onFocus(field.name)}
              error={errors[field.name]}
              disabled={disabled || field.behavior?.disabled || (field as any).disabled}
              required={field.validation?.required ?? false}
              tabIndex={fieldTabIndexMap?.[field.name] !== undefined ? fieldTabIndexMap[field.name] : undefined}
            />
          </div>
        );
      })}
    </div>
  );
};

FormContent.displayName = 'FormContent';
