'use client';

import { useState, useMemo, useEffect } from 'react';
import { Property } from '../types';
import { useSchemas, Schema } from '../hooks/useSchemas';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Database, FileText, X } from 'lucide-react';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';
import { NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
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
  const [isSchemaPickerOpen, setIsSchemaPickerOpen] = useState(false);
  const [isFieldPickerOpen, setIsFieldPickerOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(
    value?.schemaId ? schemas.find((s) => s.id === value.schemaId) || null : null
  );

  // Update selected schema when value changes externally
  useEffect(() => {
    if (value?.schemaId) {
      const schema = schemas.find((s) => s.id === value.schemaId);
      if (schema) {
        setSelectedSchema(schema);
      }
    }
  }, [value?.schemaId, schemas]);

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

  const handleSchemaSelect = async (selections: NormalizedOption[], rawItems: any[]) => {
    if (selections.length === 0) return;

    const selectedSchemaId = selections[0].id;
    const schema = schemas.find((s) => s.id === selectedSchemaId);
    
    if (schema) {
      setSelectedSchema(schema);
      onChange(null); // Clear field when schema changes
      setIsSchemaPickerOpen(false);
      
      // If schema has fields, open field picker
      if (schema.fields && schema.fields.length > 0) {
        setIsFieldPickerOpen(true);
      }
    }
  };

  const handleFieldSelect = async (selections: NormalizedOption[], rawItems: any[]) => {
    if (selections.length === 0 || !selectedSchema) return;

    const fieldName = selections[0].id;
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

      onChange(property);
      setIsFieldPickerOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setSelectedSchema(null);
  };

  const getDisplayValue = () => {
    if (!value) return '';
    return `${value.schemaName}.${value.name}`;
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

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Input
              type="text"
              value={getDisplayValue()}
              placeholder="Select property..."
              readOnly
              onClick={() => setIsSchemaPickerOpen(true)}
              className={cn(
                'text-xs h-8 cursor-pointer',
                error ? 'border-red-500' : ''
              )}
            />
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        {error && <div className="text-xs text-red-500">{error}</div>}
        
        {/* Schema Picker */}
        <PopupPicker
          isOpen={isSchemaPickerOpen}
          onClose={() => setIsSchemaPickerOpen(false)}
          staticItems={schemaStaticItems}
          onSelect={handleSchemaSelect}
          title="Select Schema"
          description="Choose a schema to select a field from"
          allowMultiselect={false}
        />

        {/* Field Picker */}
        {selectedSchema && (
          <PopupPicker
            isOpen={isFieldPickerOpen}
            onClose={() => setIsFieldPickerOpen(false)}
            staticItems={fieldStaticItems}
            onSelect={handleFieldSelect}
            title={`Select Field from ${selectedSchema.singular_name || selectedSchema.id}`}
            description={`Choose a field from ${selectedSchema.singular_name || selectedSchema.id}`}
            allowMultiselect={false}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Property {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={getDisplayValue()}
            placeholder="Click to select property..."
            readOnly
            onClick={() => setIsSchemaPickerOpen(true)}
            className={cn(
              'text-xs h-8 cursor-pointer',
              error ? 'border-red-500' : ''
            )}
          />
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {value && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Badge variant="outline" className="text-xs py-0">
            {getPropertyTypeDisplay(value.type)}
          </Badge>
          {value.description && <span className="truncate">{value.description}</span>}
        </div>
      )}
      {error && <div className="text-xs text-red-500">{error}</div>}

      {/* Schema Picker */}
      <PopupPicker
        isOpen={isSchemaPickerOpen}
        onClose={() => setIsSchemaPickerOpen(false)}
        staticItems={schemaStaticItems}
        onSelect={handleSchemaSelect}
        title="Select Schema"
        description="Choose a schema to select a field from"
        allowMultiselect={false}
      />

      {/* Field Picker */}
      {selectedSchema && (
        <PopupPicker
          isOpen={isFieldPickerOpen}
          onClose={() => setIsFieldPickerOpen(false)}
          staticItems={fieldStaticItems}
          onSelect={handleFieldSelect}
          title={`Select Field from ${selectedSchema.singular_name || selectedSchema.id}`}
          description={`Choose a field from ${selectedSchema.singular_name || selectedSchema.id}`}
          allowMultiselect={false}
        />
      )}
    </div>
  );
}
