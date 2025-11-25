// Form Section Component

import React, { useMemo } from 'react';
import { FormSectionProps, FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { FormElementFactory } from '../form-elements';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { cn } from '../../shared/utils';
import { getFieldsForSection } from '../form-elements/utils/field-resolver';
import { useBusinessRuleEffects, getFieldEffects } from '@/domains/business-rule-engine';

export const FormSection: React.FC<FormSectionProps> = ({
  section,
  schema,
  values,
  errors,
  touched,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  repeatingItems,
  onAddRepeatingItem,
  onRemoveRepeatingItem,
  fieldTabIndexMap,
}) => {
  // Get fields for this section from the schema
  const fields = getFieldsForSection(schema, section.id);
  const { title, description, layout, styling, isRepeatingSection } = section;

  // Get all field IDs and section IDs for business rule effects
  const fieldIds = useMemo(() => schema.fields.map((f) => f.id), [schema.fields]);
  const sectionIds = useMemo(() => schema.sections.map((s) => s.id), [schema.sections]);

  // Evaluate business rule effects (push-based model)
  const ruleEffects = useBusinessRuleEffects(
    schema.businessRules,
    values,
    fieldIds,
    sectionIds
  );

  const sectionClasses = cn(
    'space-y-3',
    styling?.className
  );

  const gridClasses = cn(
    'grid gap-3',
    layout?.columns === 1 && 'grid-cols-1',
    layout?.columns === 2 && 'grid-cols-1 md:grid-cols-2',
    layout?.columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    layout?.columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    layout?.gap !== undefined && layout?.gap !== null && layout.gap !== 0 && `gap-${layout.gap}`,
    layout?.direction === 'column' && 'flex flex-col'
  );

  // Separate component for field item to allow hook usage
  interface FieldItemProps {
    field: FormField;
    itemIndex?: number;
  }

  const FieldItem: React.FC<FieldItemProps> = ({ field, itemIndex }) => {
    // Get business rule effects for this field (includes section-level effects)
    const fieldEffects = getFieldEffects(field.id, section.id, ruleEffects);

    // Skip hidden and inactive fields (including business rule visibility)
    if (field.hidden || (field as any).layout?.hidden || field.inactive || !fieldEffects.isVisible) {
      return null;
    }

    const fieldName = itemIndex !== undefined ? `${field.name}[${itemIndex}]` : field.name;
    let fieldValue = itemIndex !== undefined 
      ? values[field.name]?.[itemIndex] 
      : values[field.name];
    
    // Use defaultValue if value is undefined, null, or empty string
    if ((fieldValue === undefined || fieldValue === null || fieldValue === '') && field.defaultValue !== undefined) {
      fieldValue = field.defaultValue;
    }
    
    const fieldError = itemIndex !== undefined 
      ? errors[`${field.name}[${itemIndex}]`] || errors[field.name]?.[itemIndex]
      : errors[field.name];
    let fieldTouched: boolean;
    if (itemIndex !== undefined) {
      const touchedValue = touched[field.name];
      if (Array.isArray(touchedValue)) {
        fieldTouched = touchedValue[itemIndex] || false;
      } else {
        fieldTouched = Boolean(touched[`${field.name}[${itemIndex}]`]);
      }
    } else {
      const touchedValue = touched[field.name];
      fieldTouched = typeof touchedValue === 'boolean' ? touchedValue : false;
    }

    // Merge required state: business rule OR validation.required
    const isRequired = fieldEffects.isRequired || (field.validation?.required ?? false);
    // Merge disabled state: business rule OR existing disabled flags
    const isDisabled = fieldEffects.isDisabled || disabled || field.disabled;

    return (
      <div
        className={cn(
          'space-y-2',
          ((field as any).layout?.width === '50%') && 'md:col-span-1',
          ((field as any).layout?.width === '33.33%' || (field as any).layout?.width === '33.3%') && 'md:col-span-1',
          ((field as any).layout?.width === '100%') && 'col-span-full',
          (field.colSpan ?? (field as any).layout?.colSpan) && `col-span-${field.colSpan ?? (field as any).layout?.colSpan}`,
          (field as any).layout?.rowSpan && `row-span-${(field as any).layout.rowSpan}`
        )}
        style={{ order: field.order ?? (field as any).layout?.order }}
      >
        <FormElementFactory
          field={field}
          value={fieldValue}
          error={fieldError}
          touched={fieldTouched}
          onChange={(value) => onChange(fieldName, value)}
          onBlur={() => onBlur(fieldName)}
          onFocus={() => onFocus(fieldName)}
          disabled={isDisabled}
          required={isRequired}
          tabIndex={fieldTabIndexMap?.[field.name] !== undefined ? fieldTabIndexMap[field.name] : undefined}
        />
      </div>
    );
  };

  const renderFields = (fieldsToRender: typeof fields, itemIndex?: number) => {
    return fieldsToRender.map((field) => (
      <FieldItem key={field.id} field={field} itemIndex={itemIndex} />
    ));
  };

  if (isRepeatingSection && repeatingItems) {
    return (
      <div className={sectionClasses}>
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium text-gray-900">{title}</h3>
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                {repeatingItems.length}
              </span>
            </div>
            {description && (
              <p className="text-xs text-gray-600 mt-1">{description}</p>
            )}
          </div>

          {repeatingItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No items added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {repeatingItems.map((item, index) => (
                <Card key={item.id || `item-${index}`} className="border border-gray-200 rounded-lg">
                  <CardHeader className="pb-4 px-6 pt-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-900">
                        {section.repeatingConfig?.itemTitle 
                          ? section.repeatingConfig.itemTitle(index + 1)
                          : `${title} ${index + 1}`
                        }
                      </CardTitle>
                      {onRemoveRepeatingItem && (
                        <button
                          type="button"
                          onClick={() => onRemoveRepeatingItem(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-2 rounded-full hover:bg-red-50"
                          disabled={disabled}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className={gridClasses}>
                      {renderFields(fields, index)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {onAddRepeatingItem && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onAddRepeatingItem}
                disabled={disabled}
                className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-violet-400 hover:text-violet-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add {title}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      'border border-gray-200 rounded-lg',
      styling?.variant === 'minimal' && 'border-0 shadow-none',
      styling?.variant === 'card' && 'shadow-sm'
    )}>
      <CardHeader className="pb-4 px-6 pt-6">
        <CardTitle className="text-base font-medium text-gray-900">{title}</CardTitle>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className={sectionClasses}>
          <div className={gridClasses}>
            {renderFields(fields)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

FormSection.displayName = 'FormSection';
