import { FormSchema, FormField, DetailPageSection } from '../types/form-schema';
import { resolveFieldById } from '../../form-builder/form-elements/utils/field-resolver';

/**
 * Get field value from data, handling nested paths and compute functions
 */
const getFieldValue = (field: FormField, data: any): any => {
  if (!field || !data) return null;

  // Handle source path if specified
  if (field.source) {
    const path = field.source.split('.');
    let value = data;
    // SECURITY: Prevent prototype pollution by validating keys
    const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];
    
    for (const key of path) {
      // SECURITY: Skip prototype pollution keys
      if (PROTOTYPE_POLLUTION_KEYS.includes(key)) {
        return null;
      }
      // SECURITY: Use hasOwnProperty check for objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          return null;
        }
      }
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

/**
 * Check if schema has any fields with badge role
 */
export const hasBadgeFields = (schema: FormSchema): boolean => {
  return schema.fields?.some(field => field.role === 'badge') || false;
};

/**
 * Get all badge fields from schema
 */
export const getBadgeFields = (schema: FormSchema): FormField[] => {
  return schema.fields?.filter(field => field.role === 'badge') || [];
};

/**
 * Collect all badge values from schema and data
 * @param schema - The form schema
 * @param data - The data object
 * @param section - Optional section to get badge fields from specific fieldIds
 * @returns Array of unique badge values
 */
export const collectBadgeValues = (
  schema: FormSchema,
  data: any,
  section?: DetailPageSection
): string[] => {
  const allBadgeValues: any[] = [];

  // If section has specific fieldIds, only collect from those fields
  if (section?.fieldIds && section.fieldIds.length > 0) {
    section.fieldIds.forEach(fieldId => {
      const field = resolveFieldById(schema, fieldId);
      if (field && field.role === 'badge') {
        const value = getFieldValue(field, data);
        if (Array.isArray(value)) {
          allBadgeValues.push(...value);
        } else if (value !== null && value !== undefined && value !== '') {
          allBadgeValues.push(value);
        }
      }
    });
  } else {
    // Collect from all badge fields in schema
    const badgeFields = getBadgeFields(schema);
    badgeFields.forEach(field => {
      const value = getFieldValue(field, data);
      if (Array.isArray(value)) {
        allBadgeValues.push(...value);
      } else if (value !== null && value !== undefined && value !== '') {
        allBadgeValues.push(value);
      }
    });
  }

  // Remove duplicates and convert to strings
  return Array.from(new Set(allBadgeValues.map(v => String(v))));
};

/**
 * Check if a section is a badge section
 * @param section - The detail page section
 * @param schema - The form schema
 * @returns true if section is a badge section
 */
export const isBadgeSection = (
  section: DetailPageSection,
  schema: FormSchema
): boolean => {
  // Check if section id is 'badges'
  if (section.id === 'badges') {
    return true;
  }

  // Check if section has badge role fields in its fieldIds
  if (section.fieldIds && section.fieldIds.length > 0) {
    return section.fieldIds.some(fieldId => {
      const field = resolveFieldById(schema, fieldId);
      return field?.role === 'badge';
    });
  }

  return false;
};

/**
 * Get default sections for detail page rendering
 * Includes badges section if schema has badge fields
 * @param schema - The form schema
 * @returns Array of default sections
 */
export const getDefaultSections = (schema: FormSchema): DetailPageSection[] => {
  const defaultSections: DetailPageSection[] = [];

  // Add badges section if schema has badge fields
  if (hasBadgeFields(schema)) {
    defaultSections.push({
      id: 'badges',
      title: 'Tags',
      description: 'Associated tags',
      colSpan: 1,
      columnArea: 'sidebar',
      fieldIds: [],
      badgeVariant: 'default',
      enforceBadgeVariant: true,
      badgeClickable: false,
    });
  }

  return defaultSections;
};

