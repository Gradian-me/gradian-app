// Form System Section Component

import React, { useMemo } from 'react';
import { FormSchema, FormData, FormErrors, FormTouched } from '@/gradian-ui/schema-manager/types/form-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '../../shared/utils';
import { FormElementFactory } from '../form-elements/components/FormElementFactory';
import { getSystemSectionFields, type SystemSectionTranslator } from '../configs/system-section-fields';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { getSchemaTranslatedSingularName } from '@/gradian-ui/schema-manager/utils/schema-utils';

export interface FormSystemSectionProps {
  schema: FormSchema;
  values: FormData;
  errors?: FormErrors;
  touched?: FormTouched;
  onChange: (fieldName: string, value: any) => void;
  onBlur: (fieldName: string) => void;
  disabled?: boolean;
}

export const FormSystemSection: React.FC<FormSystemSectionProps> = ({
  schema,
  values,
  errors,
  touched,
  onChange,
  onBlur,
  disabled = false,
}) => {
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const t: SystemSectionTranslator = useMemo(() => {
    return (key, fallback, params) => {
      const s = getT(key, language ?? defaultLang, defaultLang) || fallback;
      if (params && s) {
        return Object.entries(params).reduce((acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), v), s);
      }
      return s;
    };
  }, [language, defaultLang]);

  // Get system section field configurations
  const systemFields = useMemo(() => {
    return getSystemSectionFields(schema, values, {
      t,
      getEntityDisplayName: (s: FormSchema) => getSchemaTranslatedSingularName(s, language ?? defaultLang, s.singular_name || 'item'),
    });
  }, [schema, values, t, language, defaultLang]);

  // Check if any system field has a validation error (must be before early return - hooks rule)
  const hasAnyError = useMemo(() => {
    return systemFields.some((f) => {
      const name = f.field.name || f.field.id || '';
      return Boolean(errors?.[name]);
    });
  }, [systemFields, errors]);

  // Hide system section if no fields are available
  if (systemFields.length === 0) {
    return null;
  }

  // Group fields by their group type
  const switchFields = systemFields.filter(f => f.group === 'switches');
  const mainFields = systemFields.filter(f => f.group === 'main');
  const hierarchicalFields = systemFields.filter(f => f.group === 'hierarchical');
  const multiSelectFields = systemFields.filter(f => f.group === 'multi-select');
  const otherFields = systemFields.filter(f => !f.group || !['switches', 'main', 'hierarchical', 'multi-select'].includes(f.group));

  const isParentLocked = values.__parentLocked === true;

  return (
    <Card className={cn(
      'border rounded-2xl bg-gray-50/50 dark:bg-gray-800/30',
      'overflow-visible',
      'md:col-span-2',
      hasAnyError ? 'border-red-500 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'
    )}>
      
      <CardContent className="p-6 overflow-visible">
        <div className="space-y-4">
          {/* Switch fields (Inactive, Force) */}
          {switchFields.length > 0 && (
            <div className="flex flex-row items-center gap-6">
              {switchFields.map((fieldConfig) => {
                const field = fieldConfig.getFieldConfig(schema, values);
                const fieldValue = fieldConfig.getValue ? fieldConfig.getValue(values) : values?.[field.name || ''];
                const fieldError = errors?.[field.name || ''];
                const fieldTouched = typeof touched?.[field.name || ''] === 'boolean' ? touched[field.name || ''] : undefined;

                return (
                  <div key={field.id}>
                    <FormElementFactory
                      field={field as any}
                      value={fieldValue}
                      checked={fieldValue}
                      error={fieldError}
                      touched={fieldTouched}
                      onChange={(value) => {
                        if (fieldConfig.onChange) {
                          fieldConfig.onChange(value, onChange);
                        } else {
                          onChange(field.name || '', value);
                        }
                      }}
                      onBlur={() => onBlur(field.name || '')}
                      disabled={disabled}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Force reason (conditional field) */}
          {otherFields.map((fieldConfig) => {
            const field = fieldConfig.getFieldConfig(schema, values);
            const fieldValue = fieldConfig.getValue ? fieldConfig.getValue(values) : values?.[field.name || ''];
            const fieldError = errors?.[field.name || ''];
            const fieldTouched = typeof touched?.[field.name || ''] === 'boolean' ? touched[field.name || ''] : undefined;

            return (
              <div key={field.id} className="space-y-2">
                <FormElementFactory
                  field={field as any}
                  value={fieldValue}
                  error={fieldError}
                  touched={fieldTouched}
                  onChange={(value) => {
                    if (fieldConfig.onChange) {
                      fieldConfig.onChange(value, onChange);
                    } else {
                      onChange(field.name || '', value);
                    }
                  }}
                  onBlur={() => onBlur(field.name || '')}
                  disabled={disabled}
                  className="w-full"
                  rows={field.name === 'forceReason' ? 3 : undefined}
                />
              </div>
            );
          })}

          {/* Main fields (Assigned To, Due Date, Status, Entity Type) */}
          {mainFields.length > 0 && (
            <div className="pt-2">
              <div
                className={cn(
                  // Always use a 2-column layout on md+ screens so fields wrap into two rows when there are 4 items
                  'grid grid-cols-1 md:grid-cols-2 gap-4'
                )}
              >
                {mainFields.map((fieldConfig) => {
                  const field = fieldConfig.getFieldConfig(schema, values);
                  const fieldValue = fieldConfig.getValue ? fieldConfig.getValue(values) : values?.[field.name || ''];
                  const fieldError = errors?.[field.name || ''];
                  const fieldTouched = typeof touched?.[field.name || ''] === 'boolean' ? touched[field.name || ''] : undefined;

                  // Generate stable key for status and entityType pickers
                  const stableKey = field.name === 'status' 
                    ? `status-picker-${Array.isArray(schema.statusGroup) && schema.statusGroup.length > 0 ? schema.statusGroup[0]?.id : 'dynamic'}`
                    : field.name === 'entityType'
                    ? `entity-type-picker-${Array.isArray(schema.entityTypeGroup) && schema.entityTypeGroup.length > 0 ? schema.entityTypeGroup[0]?.id : 'dynamic'}`
                    : field.id;

                  return (
                    <div
                      key={stableKey}
                      className={cn(
                        'space-y-2',
                        field.colSpan === 2 && 'md:col-span-2'
                      )}
                    >
                      <FormElementFactory
                        field={field as any}
                        value={fieldValue}
                        error={fieldError}
                        touched={fieldTouched}
                        onChange={(value) => {
                          if (fieldConfig.onChange) {
                            fieldConfig.onChange(value, onChange);
                          } else {
                            onChange(field.name || '', value);
                          }
                        }}
                        onBlur={() => onBlur(field.name || '')}
                        disabled={disabled}
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hierarchical fields (Parent) */}
          {hierarchicalFields.map((fieldConfig) => {
            const field = fieldConfig.getFieldConfig(schema, values);
            const fieldValue = fieldConfig.getValue ? fieldConfig.getValue(values) : values?.[field.name || ''];
            const fieldError = errors?.[field.name || ''];
            const fieldTouched = typeof touched?.[field.name || ''] === 'boolean' ? touched[field.name || ''] : undefined;

            return (
              <div key={field.id} className="space-y-2">
                <FormElementFactory
                  field={field as any}
                  value={fieldValue}
                  error={fieldError}
                  touched={fieldTouched}
                  onChange={(value) => {
                    if (fieldConfig.onChange) {
                      fieldConfig.onChange(value, onChange);
                    } else {
                      onChange(field.name || '', value);
                    }
                  }}
                  onBlur={() => onBlur(field.name || '')}
                  disabled={disabled || (field.name === 'parent' && isParentLocked)}
                  className="w-full"
                />
              </div>
            );
          })}

          {/* Multi-select fields (Related Companies, Related Tenants) */}
          {multiSelectFields.map((fieldConfig) => {
            const field = fieldConfig.getFieldConfig(schema, values);
            const fieldValue = fieldConfig.getValue ? fieldConfig.getValue(values) : values?.[field.name || ''];
            const fieldError = errors?.[field.name || ''];
            const fieldTouched = typeof touched?.[field.name || ''] === 'boolean' ? touched[field.name || ''] : undefined;

            return (
              <div key={field.id} className="space-y-2">
                <FormElementFactory
                  field={field as any}
                  value={fieldValue}
                  error={fieldError}
                  touched={fieldTouched}
                  onChange={(value) => {
                    if (fieldConfig.onChange) {
                      fieldConfig.onChange(value, onChange);
                    } else {
                      onChange(field.name || '', value);
                    }
                  }}
                  onBlur={() => onBlur(field.name || '')}
                  disabled={disabled}
                  className="w-full"
                />
              </div>
            );
          })}

        </div>
      </CardContent>
    </Card>
  );
};

FormSystemSection.displayName = 'FormSystemSection';

