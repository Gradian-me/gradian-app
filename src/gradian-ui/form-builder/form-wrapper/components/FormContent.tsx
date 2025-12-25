// Form Content Component

import React from 'react';
import { FormContentProps } from '../types';
import { FormElementFactory } from '../../form-elements';
import { cn } from '../../../shared/utils';
import type { FormElementConfig } from '../../form-elements/types';

// Separate component for field item to allow hook usage
interface FieldItemProps {
  field: FormElementConfig;
  values: Record<string, any>;
  errors: Record<string, string>;
  onChange: (fieldName: string, value: any) => void;
  onBlur: (fieldName: string) => void;
  onFocus: (fieldName: string) => void;
  disabled: boolean;
  layout?: FormContentProps['layout'];
}

const FieldItem: React.FC<FieldItemProps> = ({
  field,
  values,
  errors,
  onChange,
  onBlur,
  onFocus,
  disabled,
  layout,
}) => {
  // Skip hidden and inactive fields
  if ((field as any).hidden || (field as any).inactive) {
    return null;
  }

  // Use defaultValue if value is undefined, null, or empty string
  let fieldValue = values[field.name];
  if ((fieldValue === undefined || fieldValue === null || fieldValue === '') && (field as any).defaultValue !== undefined) {
    fieldValue = (field as any).defaultValue;
  }

  // Use validation.required for required state
  const isRequired = field.validation?.required ?? false;
  // Use existing disabled flags
  const isDisabled = disabled || (field as any).disabled;

  return (
    <div
      className={cn(
        layout?.columns && layout.columns > 1 ? 'space-y-3' : ''
      )}
      style={{
        order: (field as any).order,
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
        disabled={isDisabled}
        required={isRequired}
      />
    </div>
  );
};

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
      {children || fields.map((field) => (
        <FieldItem
          key={field.name}
          field={field}
          values={values}
          errors={errors}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          layout={layout}
        />
      ))}
    </div>
  );
};

FormContent.displayName = 'FormContent';
