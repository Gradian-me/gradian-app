// Form System Section Component

import React, { useMemo } from 'react';
import { FormSchema, FormData, FormErrors, FormTouched } from '@/gradian-ui/schema-manager/types/form-schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '../form-elements/components/Switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '../form-elements/components/Textarea';
import { cn } from '../../shared/utils';
import { PickerInput } from '../form-elements/components/PickerInput';
import { DateInput } from '../form-elements/components/DateInput';
import { extractFromDynamicContext } from '../utils/dynamic-context-extractor';

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
  // Check if System Section should be shown
  const hasStatusGroup = Array.isArray(schema.statusGroup) && schema.statusGroup.length > 0;
  const hasEntityTypeGroup = Array.isArray(schema.entityTypeGroup) && schema.entityTypeGroup.length > 0;

  const inactiveValue = values.inactive === true;
  const forceValue = values.isForce === true;
  const forceReasonValue = values.forceReason || '';

  const isParentLocked = values.__parentLocked === true;

  // Check if there are any fields available in the system section
  const hasInactiveField = schema.allowDataInactive === true;
  const hasForceField = schema.allowDataForce === true;
  const hasForceReasonField = schema.allowDataForce === true && forceValue === true;
  const hasAssignedToField = schema.allowDataAssignedTo === true;
  const hasDueDateField = schema.allowDataDueDate === true;
  const hasStatusField = hasStatusGroup === true;
  const hasEntityTypeField = hasEntityTypeGroup === true;
  const hasParentField = schema.allowHierarchicalParent === true;
  const hasMultiCompaniesField = schema.canSelectMultiCompanies === true;
  const hasMultiTenantsField = schema.allowDataRelatedTenants === true;

  // Memoize the status sourceUrl to prevent it from changing on every render
  // This ensures PickerInput doesn't reset when form values change
  // Get statusGroup ID directly from schema prop (more stable than dynamic context)
  // NOTE: Must be called before any early returns to comply with Rules of Hooks
  const statusSourceUrl = useMemo(() => {
    if (!hasStatusGroup || !schema.statusGroup || !Array.isArray(schema.statusGroup) || schema.statusGroup.length === 0) {
      return '';
    }
    const statusGroupId = schema.statusGroup[0]?.id;
    if (!statusGroupId) {
      // Fallback to dynamic context if schema doesn't have the ID
      const contextId = extractFromDynamicContext('formSchema', 'statusGroup.[0].id');
      if (!contextId) return '';
      return `/api/data/all-relations?schema=status-groups&direction=both&otherSchema=status-items&relationTypeId=HAS_STATUS_ITEM&id=${contextId}`;
    }
    return `/api/data/all-relations?schema=status-groups&direction=both&otherSchema=status-items&relationTypeId=HAS_STATUS_ITEM&id=${encodeURIComponent(String(statusGroupId))}`;
  }, [hasStatusGroup, schema.statusGroup]);

  // Memoize the entity type sourceUrl to prevent it from changing on every render
  // This ensures PickerInput doesn't reset when form values change
  // Get entityTypeGroup ID directly from schema prop (more stable than dynamic context)
  // NOTE: Must be called before any early returns to comply with Rules of Hooks
  const entityTypeSourceUrl = useMemo(() => {
    if (!hasEntityTypeGroup || !schema.entityTypeGroup || !Array.isArray(schema.entityTypeGroup) || schema.entityTypeGroup.length === 0) {
      return '';
    }
    const entityTypeGroupId = schema.entityTypeGroup[0]?.id;
    if (!entityTypeGroupId) {
      // Fallback to dynamic context if schema doesn't have the ID
      const contextId = extractFromDynamicContext('formSchema', 'entityTypeGroup.[0].id');
      if (!contextId) return '';
      return `/api/data/all-relations?schema=entity-type-groups&direction=both&otherSchema=entity-type-items&relationTypeId=HAS_ENTITY_TYPE_ITEM&id=${contextId}`;
    }
    return `/api/data/all-relations?schema=entity-type-groups&direction=both&otherSchema=entity-type-items&relationTypeId=HAS_ENTITY_TYPE_ITEM&id=${encodeURIComponent(String(entityTypeGroupId))}`;
  }, [hasEntityTypeGroup, schema.entityTypeGroup]);

  // Memoize the status picker config to prevent PickerInput from resetting when config object reference changes
  // NOTE: Must be called before any early returns to comply with Rules of Hooks
  const statusPickerConfig = useMemo(() => ({
    name: 'status',
    label: "Status",
    placeholder: 'Select status',
    description: 'Status for this record from the configured status group.',
    sourceUrl: statusSourceUrl,
    columnMap: {
      response: { data: 'data.0.data' }, // Extract items from data[0].data array
      item: {
        id: 'id',
        label: 'label',
        icon: 'icon',
        color: 'color',
      },
    },
    metadata: {
      allowMultiselect: false, // Status is always single-select
    },
  }), [statusSourceUrl]);

  // Memoize the entity type picker config to prevent PickerInput from resetting when config object reference changes
  // NOTE: Must be called before any early returns to comply with Rules of Hooks
  const entityTypePickerConfig = useMemo(() => ({
    name: 'entityType',
    label: "Entity Type",
    placeholder: 'Select entity type',
    description: 'Entity type for this record from the configured entity type group.',
    sourceUrl: entityTypeSourceUrl,
    columnMap: {
      response: { data: 'data.0.data' }, // Extract items from data[0].data array
      item: {
        id: 'id',
        label: 'label',
        icon: 'icon',
        color: 'color',
      },
    },
    metadata: {
      allowMultiselect: false, // Entity type is always single-select
    },
  }), [entityTypeSourceUrl]);

  // Count available fields
  const availableFieldsCount = [
    hasInactiveField,
    hasForceField,
    hasForceReasonField,
    hasAssignedToField,
    hasDueDateField,
    hasStatusField,
    hasEntityTypeField,
    hasParentField,
    hasMultiCompaniesField,
    hasMultiTenantsField,
  ].filter(Boolean).length;

  // Hide system section if no fields are available
  if (availableFieldsCount === 0) {
    return null;
  }

  return (
    <Card className={cn(
      'border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30',
      'overflow-visible',
      // When placed inside a grid layout (e.g. 2-column forms), make the system section span 2 columns
      'md:col-span-2'
    )}>
      <CardHeader className="pb-4 px-6 pt-4">
        <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
          System Section
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-6 pb-6 overflow-visible">
        <div className="space-y-4">
          {(hasInactiveField || hasForceField) && (
            <div className="flex flex-row items-center gap-6">
              {hasInactiveField && (
                <Switch
                  config={{
                    name: 'system-inactive',
                    label: 'Inactive',
                  }}
                  checked={inactiveValue}
                  onChange={(checked) => onChange('inactive', checked)}
                  onBlur={() => onBlur('inactive')}
                  disabled={disabled}
                />
              )}

              {hasForceField && (
                <Switch
                  config={{
                    name: 'system-force',
                    label: 'Force',
                  }}
                  checked={forceValue}
                  onChange={(checked) => onChange('isForce', checked)}
                  onBlur={() => onBlur('isForce')}
                  disabled={disabled}
                />
              )}
            </div>
          )}

          {schema.allowDataForce && forceValue && (
            <div className="space-y-2">
              <Textarea
                config={{
                  name: 'forceReason',
                  label: 'Force Reason',
                  placeholder: 'Enter the reason for forcing this record...',
                }}
                value={forceReasonValue}
                onChange={(value) => onChange('forceReason', value)}
                onBlur={() => onBlur('forceReason')}
                error={errors?.forceReason}
                touched={typeof touched?.forceReason === 'boolean' ? touched.forceReason : undefined}
                disabled={disabled}
                rows={3}
                className="w-full"
              />
            </div>
          )}

          {(hasAssignedToField || hasDueDateField || hasStatusField || hasEntityTypeField) && (
            <div className="pt-2">
              <div
                className={cn(
                  // Always use a 2-column layout on md+ screens so fields wrap into two rows when there are 4 items
                  'grid grid-cols-1 md:grid-cols-2 gap-4'
                )}
              >
                {hasAssignedToField && (
                  <div className="space-y-2">
                    <PickerInput
                      config={{
                        name: 'assignedTo',
                        label: 'Assigned To',
                        placeholder: 'Select user',
                        targetSchema: 'users',
                        metadata: {
                          allowMultiselect: false,
                        },
                      }}
                      value={Array.isArray(values.assignedTo) ? values.assignedTo : values.assignedTo ? [values.assignedTo] : []}
                      error={errors?.assignedTo}
                      touched={typeof touched?.assignedTo === 'boolean' ? touched.assignedTo : undefined}
                      required={false}
                      onChange={(selections) => {
                        onChange('assignedTo', selections);
                      }}
                      onBlur={() => onBlur('assignedTo')}
                      disabled={disabled}
                      className="w-full"
                    />
                  </div>
                )}

                {hasDueDateField && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="system-due-date"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Due Date
                    </Label>
                    <DateInput
                      config={{
                        name: 'dueDate',
                        label: undefined,
                        placeholder: 'Select due date',
                      }}
                      value={values.dueDate || ''}
                      onChange={(newValue) => onChange('dueDate', newValue)}
                      onBlur={() => onBlur('dueDate')}
                      disabled={disabled}
                      className="w-full"
                    />
                  </div>
                )}

                {hasStatusField && (
                  <div className="space-y-2">
                    <PickerInput
                      key={`status-picker-${statusSourceUrl}`} // Stable key based on sourceUrl to prevent remounting
                      config={statusPickerConfig}
                      value={Array.isArray(values.status) ? values.status : (values.status ? [values.status] : [])}
                      error={errors?.status}
                      touched={typeof touched?.status === 'boolean' ? touched.status : undefined}
                      required={true}
                      onChange={(selections) => {
                        // Store full normalized selections so we keep label/icon metadata in data
                        // For single select (status), prevent clearing only if it's required
                        // For multi-select, allow clearing but ensure we can still select after clearing
                        if (Array.isArray(selections)) {
                          // Always allow the change - don't block clearing
                          // The validation will handle required field checking
                          onChange('status', selections);
                        } else {
                          // Handle non-array values (shouldn't happen, but be safe)
                          onChange('status', selections);
                        }
                      }}
                      onBlur={() => onBlur('status')}
                      disabled={disabled}
                      className="w-full"
                    />
                  </div>
                )}

                {hasEntityTypeField && (
                  <div className="space-y-2">
                    <PickerInput
                      key={`entity-type-picker-${entityTypeSourceUrl}`} // Stable key based on sourceUrl to prevent remounting
                      config={entityTypePickerConfig}
                      value={Array.isArray(values.entityType) ? values.entityType : (values.entityType ? [values.entityType] : [])}
                      error={errors?.entityType}
                      touched={typeof touched?.entityType === 'boolean' ? touched.entityType : undefined}
                      required={true}
                      onChange={(selections) => {
                        // Store full normalized selections so we keep label/icon metadata in data
                        // For single select (entityType), prevent clearing only if it's required
                        // For multi-select, allow clearing but ensure we can still select after clearing
                        if (Array.isArray(selections)) {
                          // Always allow the change - don't block clearing
                          // The validation will handle required field checking
                          onChange('entityType', selections);
                        } else {
                          // Handle non-array values (shouldn't happen, but be safe)
                          onChange('entityType', selections);
                        }
                      }}
                      onBlur={() => onBlur('entityType')}
                      disabled={disabled}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {schema.allowHierarchicalParent && (
            <div className="space-y-2">
              <PickerInput
                config={{
                  name: 'parent',
                  label: (
                    <span className="flex items-center gap-2">
                      Parent
                      <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                        (hierarchical)
                      </span>
                    </span>
                  ),
                  placeholder: 'Select parent (optional)',
                  targetSchema: schema.id,
                  description: `Choose a parent ${schema.singular_name || 'item'} for hierarchical view`,
                }}
                value={values.parent === undefined ? null : values.parent}
                onChange={(selections) => {
                  let nextValue: any = null;
                  if (selections && Array.isArray(selections) && selections.length > 0) {
                    const first = selections[0];
                    nextValue = first?.id ? String(first.id) : null;
                  }
                  onChange('parent', nextValue);
                }}
                onBlur={() => onBlur('parent')}
                disabled={disabled || isParentLocked}
                className="w-full"
              />
            </div>
          )}

          {schema.canSelectMultiCompanies && (
            <div className="space-y-2">
              <PickerInput
                config={{
                  name: 'relatedCompanies',
                  label: "Related Companies",
                  placeholder: 'Select related companies (optional)',
                  targetSchema: 'companies',
                  description:
                    schema.isNotCompanyBased === true
                      ? 'Choose one or more companies related to this record (optional).'
                      : 'Choose one or more companies related to this record. Required for company-based schemas.',
                  allowMultiselect: true,
                }}
                value={values['relatedCompanies']}
                error={errors?.['relatedCompanies']}
                touched={typeof touched?.['relatedCompanies'] === 'boolean' ? touched['relatedCompanies'] : undefined}
                required={true}
                onChange={(selections) => {
                  // Store full normalized selections so we keep label/icon metadata in data
                  onChange('relatedCompanies', selections);
                }}
                onBlur={() => onBlur('relatedCompanies')}
                disabled={disabled}
                className="w-full"
              />
            </div>
          )}

          {schema.allowDataRelatedTenants && (
            <div className="space-y-2">
              <PickerInput
                config={{
                  name: 'relatedTenants',
                  label: "Related Tenants",
                  placeholder: 'Select related tenants (optional)',
                  targetSchema: 'tenants',
                  description: 'Choose one or more tenants related to this record (optional).',
                  metadata: {
                    allowMultiselect: true,
                  },
                }}
                value={values['relatedTenants']}
                error={errors?.['relatedTenants']}
                touched={typeof touched?.['relatedTenants'] === 'boolean' ? touched['relatedTenants'] : undefined}
                required={false}
                onChange={(selections) => {
                  // Store full normalized selections so we keep label/icon metadata in data
                  onChange('relatedTenants', selections);
                }}
                onBlur={() => onBlur('relatedTenants')}
                disabled={disabled}
                className="w-full"
              />
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
};

FormSystemSection.displayName = 'FormSystemSection';

