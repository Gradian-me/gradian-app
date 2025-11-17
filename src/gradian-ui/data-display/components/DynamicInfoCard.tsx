// Dynamic Info Card Component
// Renders key-value information cards for detail pages

import { motion } from 'framer-motion';
import React from 'react';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { resolveFieldById } from '../../form-builder/form-elements/utils/field-resolver';
import { CardContent, CardHeader, CardTitle, CardWrapper } from '../card/components/CardWrapper';
import { DetailPageSection, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '../../shared/utils';
import { formatNumber, formatCurrency, formatDate } from '../../shared/utils';
import { isBadgeSection, getBadgeFields } from '../../schema-manager/utils/badge-utils';
import { BadgeViewer } from '../../form-builder/form-elements/utils/badge-viewer';
import { getDisplayStrings, getJoinedDisplayString, getPickerDisplayValue, renderRatingValue } from '../utils/value-display';
import { CopyContent } from '../../form-builder/form-elements/components/CopyContent';

export interface DynamicInfoCardProps {
  section: DetailPageSection;
  schema: FormSchema;
  data: any;
  index?: number;
  disableAnimation?: boolean;
  className?: string;
}

/**
 * Format field value based on field type and configuration
 */
const formatFieldValue = (
  field: any,
  value: any,
  data?: any,
  section?: DetailPageSection
): React.ReactNode => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">N/A</span>;
  }

  const optionLabels = getDisplayStrings(value);

  // Handle badge-like fields (select, popup picker, etc.)
  const candidateComponents = new Set([
    'select',
    'checkbox',
    'radio',
    'popup-picker',
    'popuppicker',
    'popup-picker-input',
    'picker',
    'pickerinput',
    'combo',
    'multiselect',
    'multi-select'
  ]);

  const componentKey = (field?.component || field?.type || '').toString().toLowerCase();
  const renderAsBadges =
    (field?.role === 'badge' || candidateComponents.has(componentKey)) &&
    (Array.isArray(value) || optionLabels.length > 0 || Array.isArray(field?.options));

  if (renderAsBadges) {
    const isPopupOrPicker =
      field?.role === 'badge' ||
      componentKey.includes('popup') ||
      componentKey === 'picker' ||
      field?.type === 'picker';
    const badgeVariant = isPopupOrPicker
      ? 'default'
      : section?.badgeVariant ?? 'outline';
    const enforceVariant = (
      isPopupOrPicker ||
      Boolean(section?.enforceBadgeVariant) ||
      Boolean(section?.badgeVariant)
    );
    const handleBadgeClick = (item: any) => {
      const candidateId = item.normalized?.id ?? item.id;
      if (!candidateId || !field?.targetSchema) return;
      const url = `/page/${field.targetSchema}/${encodeURIComponent(candidateId)}?showBack=true`;
      if (typeof window !== 'undefined') {
        window.open(url, '_self');
      }
    };

    return (
      <BadgeViewer
        field={field}
        value={value}
        badgeVariant={badgeVariant}
        enforceVariant={enforceVariant}
        animate={true}
        onBadgeClick={field?.targetSchema ? handleBadgeClick : undefined}
        isItemClickable={
          field?.targetSchema
            ? (item) => Boolean(item.normalized?.id ?? item.id)
            : () => Boolean(section?.badgeClickable)
        }
      />
    );
  }

  // Handle picker fields - check for object values or resolved data
  if (field?.type === 'picker' && field.targetSchema) {
    const pickerDisplay = getPickerDisplayValue(field, value, { data });
    if (pickerDisplay) {
      return <span>{pickerDisplay}</span>;
    }
    return <span className="text-gray-400">N/A</span>;
  }

  // Use field type
  const displayType = field?.type || 'text';

  if (field?.role === 'rating') {
    return (
      <div className="inline-flex items-center">
        {renderRatingValue(value, { size: 'sm', showValue: true })}
      </div>
    );
  }

  switch (displayType) {
    case 'currency':
      return <span>{formatCurrency(typeof value === 'number' ? value : parseFloat(value) || 0)}</span>;
    case 'percentage':
      const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
      return <span>{numValue.toFixed(2)}%</span>;
    case 'number':
      return <span>{formatNumber(typeof value === 'number' ? value : parseFloat(value) || 0)}</span>;
    case 'date':
    case 'datetime-local':
      try {
        const dateValue = typeof value === 'string' ? new Date(value) : value;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          return <span>{formatDate(dateValue, { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}</span>;
        }
        return <span>{String(value)}</span>;
      } catch {
        return <span>{String(value)}</span>;
      }
    case 'array':
    case 'checkbox':
      if (optionLabels.length > 0) {
        return <span>{optionLabels.join(', ')}</span>;
      }
      if (Array.isArray(value)) {
        return <span>{value.join(', ')}</span>;
      }
      return <span>{String(value)}</span>;
    default:
      // For URLs and long text, add word-break styling
      const joined = getJoinedDisplayString(value);
      if (joined) {
        return <span>{joined}</span>;
      }
      const stringValue = String(value);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      return (
        <span className={isUrl || stringValue.length > 50 ? "overflow-wrap-anywhere wrap-break-word" : "wrap-break-word"}>
          {stringValue}
        </span>
      );
  }
};

/**
 * Get field value from data, handling nested paths
 */
const getFieldValue = (field: any, data: any): any => {
  if (!field || !data) return null;

  // Handle source path if specified
  if (field.source) {
    const path = field.source.split('.');
    let value = data;
    for (const key of path) {
      value = value?.[key];
      if (value === undefined) return null;
    }
    return value;
  }

  // Handle compute function if specified
  if (field.compute && typeof field.compute === 'function') {
    return field.compute(data);
  }

  // Default: use field name
  return data[field.name];
};

export const DynamicInfoCard: React.FC<DynamicInfoCardProps> = ({
  section,
  schema,
  data,
  index = 0,
  disableAnimation = false,
  className
}) => {
  // Default grid columns and gap (removed from schema)
  const gridColumns = 2 as 1 | 2 | 3;
  const gap = 4 as 2 | 3 | 4 | 6;

  // Define cardClasses early so it can be used in early returns
  // Note: colSpan is now handled at the parent grid container level in DynamicDetailPageRenderer
  const cardClasses = cn(className);

  // Resolve fields by IDs
  const fields = (section.fieldIds || []).map(fieldId => {
    const field = resolveFieldById(schema, fieldId);
    if (!field) return null;
    
    const value = getFieldValue(field, data);
    return {
      ...field,
      value,
      label: field.label || field.name,
      icon: field.icon
    };
  }).filter(Boolean);

  // Handle badge sections using BadgeViewer for maintainability
  if (isBadgeSection(section, schema)) {
    // Collect badge fields and their values
    const badgeFieldData: Array<{ field: any; value: any }> = [];
    
    if (section.fieldIds && section.fieldIds.length > 0) {
      // Get fields from section fieldIds
      section.fieldIds.forEach(fieldId => {
        const field = resolveFieldById(schema, fieldId);
        if (field && field.role === 'badge') {
          const value = getFieldValue(field, data);
          if (value !== null && value !== undefined && value !== '' && 
              (Array.isArray(value) ? value.length > 0 : true)) {
            badgeFieldData.push({ field, value });
          }
        }
      });
    } else {
      // Get all badge fields from schema
      const allBadgeFields = getBadgeFields(schema);
      allBadgeFields.forEach(field => {
        const value = getFieldValue(field, data);
        if (value !== null && value !== undefined && value !== '' && 
            (Array.isArray(value) ? value.length > 0 : true)) {
          badgeFieldData.push({ field, value });
        }
      });
    }
    
    if (badgeFieldData.length > 0) {
      // Combine all badge values into a single array
      const allBadgeValues: any[] = [];
      const allOptions = new Map<string, any>(); // Track all options from all fields
      
      badgeFieldData.forEach(({ field, value }) => {
        const values = Array.isArray(value) ? value : [value];
        allBadgeValues.push(...values);
        
        // Collect options from all fields for label/icon/color resolution
        if (field.options && Array.isArray(field.options)) {
          field.options.forEach((opt: any) => {
            if (!allOptions.has(opt.value)) {
              allOptions.set(opt.value, opt);
            }
          });
        }
      });
      
      // Create a virtual combined field with all options
      const combinedField: any = {
        id: 'combined-badges',
        name: 'badges',
        role: 'badge',
        options: Array.from(allOptions.values()),
        type: 'checkbox'
      };
      
      return (
        <motion.div
          initial={disableAnimation ? false : { opacity: 0, y: 20 }}
          animate={disableAnimation ? false : { opacity: 1, y: 0 }}
          transition={disableAnimation ? {} : {
            duration: 0.3,
            delay: index * 0.1
          }}
          className={cardClasses}
        >
          <CardWrapper
            config={{
              id: section.id,
              name: section.title,
              styling: {
                variant: 'default',
                size: 'md'
              }
            }}
            className="h-auto bg-white dark:bg-gray-700  border border-gray-200 dark:border-gray-500 shadow-sm"
          >
            <CardHeader className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-500 rounded-t-xl">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-200">{section.title}</CardTitle>
              {section.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{section.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <BadgeViewer
                field={combinedField}
                value={allBadgeValues}
                maxBadges={0}
                badgeVariant={section.badgeVariant ?? 'outline'}
                enforceVariant={Boolean(section?.badgeVariant)}
                animate={!disableAnimation}
                isItemClickable={
                  section.badgeClickable
                    ? (item) => Boolean(item.normalized?.id ?? item.id)
                    : () => false
                }
              />
            </CardContent>
          </CardWrapper>
        </motion.div>
      );
    }
    return null;
  }

  if (fields.length === 0) {
    return null;
  }

  const gridClasses = cn(
    "grid gap-4",
    gridColumns === 1 && "grid-cols-1",
    gridColumns === 2 && "grid-cols-1 md:grid-cols-2",
    gridColumns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    gap === 2 && "gap-2",
    gap === 3 && "gap-3",
    gap === 4 && "gap-4",
    gap === 6 && "gap-6"
  );

  return (
    <motion.div
      initial={disableAnimation ? false : { opacity: 0, y: 20 }}
      animate={disableAnimation ? false : { opacity: 1, y: 0 }}
      transition={disableAnimation ? {} : {
        duration: 0.3,
        delay: index * 0.1
      }}
      className={cardClasses}
    >
      <CardWrapper
        config={{
          id: section.id,
          name: section.title,
          styling: {
            variant: 'default',
            size: 'md'
          }
        }}
        className="h-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-500 shadow-sm"
      >
        <CardHeader className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-500 rounded-t-xl">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-200">{section.title}</CardTitle>
          {section.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{section.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className={gridClasses}>
            {fields.map((field: any) => (
              <motion.div
                key={field.id}
                className="space-y-1"
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
              >
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  {field.icon && (
                    <IconRenderer iconName={field.icon} className="h-4 w-4" />
                  )}
                  {field.label}
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-900 dark:text-gray-200 overflow-wrap-anywhere wrap-break-word flex-1">
                    {formatFieldValue(field, field.value, data, section)}
                  </div>
                  {field.canCopy && field.value && field.value !== '' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <CopyContent content={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : JSON.stringify(field.value)} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </CardWrapper>
    </motion.div>
  );
};

DynamicInfoCard.displayName = 'DynamicInfoCard';

