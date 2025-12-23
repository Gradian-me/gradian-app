// Dynamic Info Card Component
// Renders key-value information cards for detail pages

import { motion } from 'framer-motion';
import React from 'react';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { resolveFieldById } from '../../form-builder/form-elements/utils/field-resolver';
import { CardContent, CardHeader, CardTitle, CardWrapper } from '../card/components/CardWrapper';
import { DetailPageSection, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '../../shared/utils';
import { isBadgeSection, getBadgeFields } from '../../schema-manager/utils/badge-utils';
import { BadgeViewer } from '../../form-builder/form-elements/utils/badge-viewer';
import { CopyContent } from '../../form-builder/form-elements/components/CopyContent';
import { ForceIcon } from '../../form-builder/form-elements/components/ForceIcon';
import { formatFieldValue } from '../table/utils/field-formatters';
import { FormulaDisplay } from '@/gradian-ui/form-builder/form-elements/components/FormulaDisplay';

export interface DynamicInfoCardProps {
  section: DetailPageSection;
  schema: FormSchema;
  data: any;
  index?: number;
  disableAnimation?: boolean;
  className?: string;
}


/**
 * Get field value from data, handling nested paths
 */
const getFieldValue = (field: any, data: any): any => {
  if (!field || !data) return null;

  // Handle source path if specified
  if (field.source) {
    // SECURITY: Use safe path access from security utility to prevent prototype pollution
    const { safeGetByPath } = require('@/gradian-ui/shared/utils/security-utils');
    const value = safeGetByPath(data, field.source);
    return value ?? null;
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
            className="h-auto bg-white dark:bg-gray-700  border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <CardHeader className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-200">{section.title}</CardTitle>
                <ForceIcon isForce={data?.isForce === true} size="sm" />
              </div>
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
        className="h-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm"
      >
        <CardHeader className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-200">{section.title}</CardTitle>
            <ForceIcon isForce={data?.isForce === true} size="sm" />
          </div>
          {section.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{section.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className={gridClasses}>
            {fields.map((field: any) => {
              const isTextarea = field.component === 'textarea';
              const fieldClasses = cn(
                "space-y-1",
                isTextarea && gridColumns === 1 && "col-span-1",
                isTextarea && gridColumns === 2 && "col-span-1 md:col-span-2",
                isTextarea && gridColumns === 3 && "col-span-1 md:col-span-2 lg:col-span-3"
              );
              
              return (
                <motion.div
                  key={field.id}
                  className={fieldClasses}
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
                      {field.component === 'formula' && field.formula ? (
                        <FormulaDisplay field={field} data={data} schema={schema} />
                      ) : (
                        formatFieldValue(field, field.value, data, false)
                      )}
                    </div>
                    {field.canCopy && field.value && field.value !== '' && field.component !== 'formula' && (
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
              );
            })}
          </div>
        </CardContent>
      </CardWrapper>
    </motion.div>
  );
};

DynamicInfoCard.displayName = 'DynamicInfoCard';

