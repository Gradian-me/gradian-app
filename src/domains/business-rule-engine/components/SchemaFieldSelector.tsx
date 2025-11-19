'use client';

import { useState, useMemo, useEffect } from 'react';
import { Property } from '../types';
import { useSchemas, Schema } from '../hooks/useSchemas';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPropertyTypeDisplay } from '../utils/property-utils';
import { cn } from '@/gradian-ui/shared/utils';

interface SchemaFieldSelectorProps {
  value: Property | null;
  onChange: (property: Property | null) => void;
  excludePropertyId?: string;
  error?: string;
  required?: boolean;
  compact?: boolean;
}

/**
 * Map schema field component/types to Property type
 */
function mapFieldTypeToPropertyType(
  component?: string,
  type?: string
): 'string' | 'number' | 'boolean' | 'array' | 'date' | 'object' {
  if (component) {
    switch (component) {
      case 'number':
        return 'number';
      case 'checkbox':
      case 'checkbox-list':
        return 'boolean';
      case 'date':
      case 'datetime':
      case 'datetime-local':
        return 'date';
      default:
        return 'string';
    }
  }
  if (type) {
    switch (type.toLowerCase()) {
      case 'number':
      case 'numeric':
        return 'number';
      case 'boolean':
      case 'bool':
        return 'boolean';
      case 'date':
      case 'datetime':
        return 'date';
      case 'array':
        return 'array';
      default:
        return 'string';
    }
  }
  return 'string';
}

export function SchemaFieldSelector({
  value,
  onChange,
  excludePropertyId,
  error,
  required = false,
  compact = false,
}: SchemaFieldSelectorProps) {
  const { schemas, isLoading } = useSchemas();
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(
    value?.schemaId ? schemas.find((s) => s.id === value.schemaId) || null : null
  );
  const [selectedFieldName, setSelectedFieldName] = useState<string | null>(
    value?.name || null
  );

  // Update selected schema and field when value changes externally
  useEffect(() => {
    if (value?.schemaId) {
      const schema = schemas.find((s) => s.id === value.schemaId);
      if (schema) {
        setSelectedSchema(schema);
        setSelectedFieldName(value.name || null);
      }
    } else {
      setSelectedSchema(null);
      setSelectedFieldName(null);
    }
  }, [value?.schemaId, value?.name, schemas]);

  // Convert schemas to static items for picker
  const schemaStaticItems = useMemo(() => {
    return schemas
      .filter((schema) => schema.fields && schema.fields.length > 0)
      .map((schema) => ({
        id: schema.id,
        name: schema.singular_name || schema.id,
        title: schema.singular_name || schema.id,
        description: schema.description,
        plural_name: schema.plural_name,
      }));
  }, [schemas]);

  // Convert fields to static items for picker
  const fieldStaticItems = useMemo(() => {
    if (!selectedSchema || !selectedSchema.fields) return [];

    return selectedSchema.fields
      .filter((field) => {
        const propertyId = `${selectedSchema.id}.${field.name}`;
        return !excludePropertyId || propertyId !== excludePropertyId;
      })
      .map((field) => {
        const propertyType = mapFieldTypeToPropertyType(field.component, field.type);
        return {
          id: field.name,
          name: field.label || field.name,
          title: field.label || field.name,
          description: field.description,
          fieldName: field.name,
          fieldId: field.id,
          component: field.component,
          type: propertyType,
        };
      });
  }, [selectedSchema, excludePropertyId]);

  const handleSchemaSelect = (schemaId: string) => {
    const schema = schemas.find((s) => s.id === schemaId);
    
    if (schema) {
      setSelectedSchema(schema);
      setSelectedFieldName(null); // Clear field when schema changes
      onChange(null); // Clear property when schema changes
    }
  };

  const handleFieldSelect = (fieldName: string) => {
    if (!selectedSchema) return;

    const field = selectedSchema.fields?.find((f) => f.name === fieldName);
    
    if (field) {
      const propertyType = mapFieldTypeToPropertyType(field.component, field.type);
      const property: Property = {
        id: `${selectedSchema.id}.${field.name}`,
        name: field.name,
        schemaName: selectedSchema.singular_name || selectedSchema.id,
        schemaId: selectedSchema.id,
        type: propertyType,
        path: `${selectedSchema.singular_name || selectedSchema.id}.${field.name}`,
        description: field.description || field.label,
        fieldId: field.id,
      };

      setSelectedFieldName(field.name);
      onChange(property);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {!compact && (
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Property {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="text-xs text-gray-500">Loading schemas...</div>
      </div>
    );
  }

  const schemaSelectValue = selectedSchema?.id || '';
  const fieldSelectValue = selectedFieldName || '';

  return (
    <div className="space-y-2">
      {!compact && (
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Property {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        {/* Schema Select */}
        <Select
          value={schemaSelectValue}
          onValueChange={handleSchemaSelect}
        >
          <SelectTrigger className={cn(
            compact ? 'h-8 text-xs' : 'h-10 text-sm',
            error ? 'border-red-500' : ''
          )}>
            <SelectValue placeholder="Select schema..." />
          </SelectTrigger>
          <SelectContent>
            {schemaStaticItems.map((schema) => (
              <SelectItem key={schema.id} value={schema.id}>
                {schema.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Field Select */}
        <Select
          value={fieldSelectValue}
          onValueChange={handleFieldSelect}
          disabled={!selectedSchema || !selectedSchema.fields || selectedSchema.fields.length === 0}
        >
          <SelectTrigger className={cn(
            compact ? 'h-8 text-xs' : 'h-10 text-sm',
            error ? 'border-red-500' : '',
            !selectedSchema ? 'opacity-50' : ''
          )}>
            <SelectValue placeholder={selectedSchema ? "Select field..." : "Select schema first"} />
          </SelectTrigger>
          <SelectContent>
            {fieldStaticItems.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {value && !compact && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Badge variant="outline" className="text-xs py-0">
            {getPropertyTypeDisplay(value.type)}
          </Badge>
          {value.description && <span className="truncate">{value.description}</span>}
        </div>
      )}
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}
