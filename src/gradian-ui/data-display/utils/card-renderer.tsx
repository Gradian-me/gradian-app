import React from 'react';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { resolveFieldById, getFieldValue } from '../../form-builder/form-elements/utils/field-resolver';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { BadgeRenderer } from '../../form-builder/form-elements/utils/badge-viewer';

interface RenderFieldValueProps {
  field: any;
  value: any;
  data?: any;
}

interface RenderSectionProps {
  section: any;
  formSchema: FormSchema;
  data: any;
}

/**
 * Render field value based on type
 */
const renderValueByType = ({ field, value, data }: RenderFieldValueProps): React.ReactNode => {
  if (!value && value !== 0) return 'N/A';

  switch (field.component) {
    case 'text':
      return field.truncate ? (
        <span className="truncate">{value}</span>
      ) : (
        <span>{value}</span>
      );
    
    case 'number':
      return <span>{value.toLocaleString()}</span>;
    
    case 'currency':
      return <span>${value.toLocaleString()}</span>;
    
    case 'percentage':
      return <span>{value}%</span>;
    
    case 'array':
      if (field.displayType === 'badges') {
        const items = Array.isArray(value) ? value : [];
        const maxDisplay = field.maxDisplay || 3;
        
        return (
          <BadgeRenderer
            items={items}
            maxBadges={maxDisplay}
            badgeVariant="outline"
            animate={true}
          />
        );
      }
      return <span>{Array.isArray(value) ? value.join(', ') : value}</span>;
    
    case 'computed':
      return field.compute ? field.compute(data) : value;
    
    default:
      return <span>{value}</span>;
  }
};

/**
 * Render a card section with its fields
 */
export const renderCardSection = ({ section, formSchema, data }: RenderSectionProps): React.ReactNode | null => {
  const sectionWidth = section.width || '100%';
  
  // Resolve fieldIds to actual field data
  const resolveFieldByIdLocal = (fieldId: string, data: any): any => {
    if (!formSchema) {
      return { name: fieldId, value: data[fieldId], label: fieldId };
    }
    
    const field = resolveFieldById(formSchema, fieldId);
    return {
      ...field,
      value: data[field.name]
    };
  };

  const resolvedFields = (section.fieldIds || []).map((fieldId: string) => {
    const field = resolveFieldByIdLocal(fieldId, data);
    // Prefer ui properties, fallback to display for backward compatibility
    const displayOptions = field?.ui || field?.display || {};
    
    return {
      id: fieldId,
      name: field.name,
      label: field.label || field.name,
      value: field.value,
      type: displayOptions?.type || 'text',
      icon: displayOptions?.icon,
      source: displayOptions?.source,
      compute: displayOptions?.compute,
      displayType: displayOptions?.displayType,
      maxDisplay: displayOptions?.maxDisplay,
      showMore: displayOptions?.showMore,
      truncate: displayOptions?.truncate,
      format: displayOptions?.format
    };
  });
  
  const fields = resolvedFields.map((field: any) => {
    let value = field.value;
    
    if (field.source) {
      value = getFieldValue(field.source, data);
    } else if (field.compute) {
      value = field.compute(data);
    }

    return (
      <div key={field.id} className="flex items-center space-x-2 text-sm text-gray-600">
        {field.icon && <IconRenderer iconName={field.icon} className="h-4 w-4" />}
        <span className="truncate">{renderValueByType({ field, value, data })}</span>
      </div>
    );
  });

  if (section.layout === 'grid' && section.columns) {
    return (
      <div className="space-y-2 w-full">
        <p className="text-sm font-medium text-gray-700">{section.title}</p>
        <div className={`grid grid-cols-${section.columns} gap-2 text-xs`}>
          {resolvedFields.map((field: any) => {
            let value = field.value;
            
            if (field.source) {
              value = getFieldValue(field.source, data);
            } else if (field.compute) {
              value = field.compute(data);
            }

            return (
              <div key={field.id} className="flex items-center justify-between">
                <span className="text-gray-600">{field.label}</span>
                <span className="font-medium">
                  {renderValueByType({ field, value, data })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full max-w-full">
      <p className="text-sm font-medium text-gray-700">{section.title}</p>
      <div className="space-y-2 w-full">
        {fields}
      </div>
    </div>
  );
};

