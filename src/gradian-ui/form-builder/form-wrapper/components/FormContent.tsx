// Form Content Component

import React from 'react';
import { FormContentProps } from '../types';
import { FormElementFactory } from '../../form-elements';
import { cn } from '../../../shared/utils';
import { useFieldRules } from '@/domains/business-rule-engine';
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
  fieldTabIndexMap?: Record<string, number>;
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
  fieldTabIndexMap,
}) => {
  // Evaluate business rules for this field
  const fieldRules = useFieldRules(field, values);

  // Skip hidden and inactive fields (including business rule visibility)
  if ((field as any).hidden || (field as any).inactive || !fieldRules.isVisible) {
    return null;
  }

  // Use defaultValue if value is undefined, null, or empty string
  let fieldValue = values[field.name];
  if ((fieldValue === undefined || fieldValue === null || fieldValue === '') && (field as any).defaultValue !== undefined) {
    fieldValue = (field as any).defaultValue;
  }

    // Merge required state: business rule OR validation.required
    const isRequired = fieldRules.isRequired || (field.validation?.required ?? false);
  // Merge disabled state: business rule OR existing disabled flags
  const isDisabled = fieldRules.isDisabled || disabled || (field as any).disabled;

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
        tabIndex={fieldTabIndexMap?.[field.name] !== undefined ? fieldTabIndexMap[field.name] : undefined}
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
          fieldTabIndexMap={fieldTabIndexMap}
        />
      ))}
    </div>
  );
};

FormContent.displayName = 'FormContent';
