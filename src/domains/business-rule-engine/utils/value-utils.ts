// Value Input Utilities

import { Property, Condition } from '../types';

/**
 * Get default value for a property type
 */
export function getDefaultValueForType(propertyType: string): any {
  switch (propertyType) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'date':
      return new Date().toISOString().split('T')[0];
    default:
      return null;
  }
}

/**
 * Validate value for property type
 */
export function validateValueForType(value: any, propertyType: string): {
  valid: boolean;
  error?: string;
} {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'Value is required' };
  }

  switch (propertyType) {
    case 'number':
      if (isNaN(Number(value))) {
        return { valid: false, error: 'Value must be a number' };
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return { valid: false, error: 'Value must be a boolean' };
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        return { valid: false, error: 'Value must be an array' };
      }
      break;
    case 'date':
      if (isNaN(Date.parse(value))) {
        return { valid: false, error: 'Value must be a valid date' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Format value for display
 */
export function formatValueForDisplay(value: any, propertyType: string): string {
  if (value === null || value === undefined) return '';

  switch (propertyType) {
    case 'array':
      return Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      return new Date(value).toLocaleDateString();
    default:
      return String(value);
  }
}

/**
 * Parse value from input based on property type
 */
export function parseValueFromInput(value: string, propertyType: string): any {
  switch (propertyType) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'true' || value === 'yes' || value === '1';
    case 'array':
      // Try to parse as JSON array, otherwise split by comma
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((v) => v.trim()).filter(Boolean);
      }
    case 'date':
      return value;
    default:
      return value;
  }
}

/**
 * Get input type for property type
 */
export function getInputTypeForProperty(property: Property | null): string {
  if (!property) return 'text';

  switch (property.type) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'email':
      return 'email';
    default:
      return 'text';
  }
}

