// Property Utilities

import { Property } from '../types';

/**
 * Format property path for display
 */
export function formatPropertyPath(property: Property | null): string {
  if (!property) return '';
  return property.path || `${property.schemaName}.${property.name}`;
}

/**
 * Get property type display name
 */
export function getPropertyTypeDisplay(type: string): string {
  const typeMap: Record<string, string> = {
    string: 'Text',
    number: 'Number',
    boolean: 'Boolean',
    array: 'Array',
    date: 'Date',
    object: 'Object',
  };
  return typeMap[type] || type;
}

/**
 * Check if two properties are compatible for comparison
 */
export function arePropertiesCompatible(prop1: Property, prop2: Property): boolean {
  // Same type is always compatible
  if (prop1.type === prop2.type) return true;

  // Number and string can sometimes be compared (depending on operator)
  if (
    (prop1.type === 'number' && prop2.type === 'string') ||
    (prop1.type === 'string' && prop2.type === 'number')
  ) {
    return true; // Allow with warning
  }

  return false;
}

/**
 * Filter properties by search term
 */
export function filterProperties(properties: Property[], searchTerm: string): Property[] {
  if (!searchTerm.trim()) return properties;

  const term = searchTerm.toLowerCase();
  return properties.filter(
    (prop) =>
      prop.name.toLowerCase().includes(term) ||
      prop.schemaName.toLowerCase().includes(term) ||
      prop.path.toLowerCase().includes(term) ||
      (prop.description && prop.description.toLowerCase().includes(term))
  );
}

/**
 * Group properties by schema
 */
export function groupPropertiesBySchema(properties: Property[]): Record<string, Property[]> {
  return properties.reduce((acc, prop) => {
    if (!acc[prop.schemaName]) {
      acc[prop.schemaName] = [];
    }
    acc[prop.schemaName].push(prop);
    return acc;
  }, {} as Record<string, Property[]>);
}

