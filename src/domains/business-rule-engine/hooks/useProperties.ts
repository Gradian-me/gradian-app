// Hook to fetch and manage properties from schemas

import { useState, useEffect, useCallback } from 'react';
import { Property } from '../types';
import { useSchemas, Schema } from './useSchemas';

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
      case 'select':
      case 'radio':
        return 'string'; // Could be array if multi-select, but default to string
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

/**
 * Convert schema fields to properties
 */
function schemaToProperties(schemas: Schema[]): Property[] {
  const properties: Property[] = [];

  schemas.forEach((schema) => {
    if (!schema.fields || schema.fields.length === 0) {
      return;
    }

    schema.fields.forEach((field) => {
      const propertyType = mapFieldTypeToPropertyType(field.component, field.type);
      
      properties.push({
        id: `${schema.id}.${field.name}`,
        name: field.name,
        schemaName: schema.singular_name || schema.id,
        schemaId: schema.id,
        type: propertyType,
        path: `${schema.singular_name || schema.id}.${field.name}`,
        description: field.description || field.label,
        fieldId: field.id,
      });
    });
  });

  return properties;
}

export function useProperties() {
  const { schemas, isLoading: schemasLoading, error: schemasError } = useSchemas();
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    if (schemas.length > 0) {
      const props = schemaToProperties(schemas);
      setProperties(props);
    }
  }, [schemas]);

  return {
    properties,
    schemas,
    isLoading: schemasLoading,
    error: schemasError,
  };
}
