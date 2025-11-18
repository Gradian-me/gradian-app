// Schema Validator
// Validates data against schema definitions

import { FormSchema, FormField } from '../types/form-schema';
import { ValidationError as DomainValidationError } from '@/gradian-ui/shared/domain/errors/domain.errors';
import { ValidationErrorDetail } from '@/gradian-ui/shared/domain/types/base.types';

/**
 * Validate data against a schema
 */
export function validateAgainstSchema(
  data: Record<string, any>,
  schema: FormSchema
): { isValid: boolean; errors: ValidationErrorDetail[] } {
  const errors: ValidationErrorDetail[] = [];

  // Get all fields from schema (fields are at schema level)
  const allFields: FormField[] = schema.fields || [];

  // Validate each field
  allFields.forEach(field => {
    const value = data[field.name];
    const fieldErrors = validateField(field, value);
    errors.push(...fieldErrors);
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single field
 */
export function validateField(
  field: FormField,
  value: any
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = [];

  // Required validation - prioritize field.required over field.validation?.required
  const isRequired = field.required ?? field.validation?.required ?? false;
  if (isRequired) {
    if (value === undefined || value === null || value === '') {
      errors.push({
        field: field.name,
        message: `${field.label} is required`,
        code: 'REQUIRED',
      });
      return errors; // Don't continue validation if required field is empty
    }
  }

  // Skip further validation if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return errors;
  }

  // Type-specific validation
  switch (field.component) {
    case 'email':
      if (!isValidEmail(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} must be a valid email address`,
          code: 'INVALID_EMAIL',
        });
      }
      break;

    case 'url':
      if (!isValidUrl(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} must be a valid URL`,
          code: 'INVALID_URL',
        });
      }
      break;

    case 'tel':
      if (!isValidPhone(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} must be a valid phone number`,
          code: 'INVALID_PHONE',
        });
      }
      break;

    case 'number':
      if (typeof value !== 'number' && isNaN(Number(value))) {
        errors.push({
          field: field.name,
          message: `${field.label} must be a valid number`,
          code: 'INVALID_NUMBER',
        });
      }
      break;
  }

  // Custom validation rules
  if (field.validation) {
    // Min length
    if (field.validation.minLength && value.length < field.validation.minLength) {
      errors.push({
        field: field.name,
        message: `${field.label} must be at least ${field.validation.minLength} characters`,
        code: 'MIN_LENGTH',
      });
    }

    // Max length
    if (field.validation.maxLength && value.length > field.validation.maxLength) {
      errors.push({
        field: field.name,
        message: `${field.label} must be at most ${field.validation.maxLength} characters`,
        code: 'MAX_LENGTH',
      });
    }

    // Min value (for numbers)
    if (field.validation.min !== undefined && Number(value) < field.validation.min) {
      errors.push({
        field: field.name,
        message: `${field.label} must be at least ${field.validation.min}`,
        code: 'MIN_VALUE',
      });
    }

    // Max value (for numbers)
    if (field.validation.max !== undefined && Number(value) > field.validation.max) {
      errors.push({
        field: field.name,
        message: `${field.label} must be at most ${field.validation.max}`,
        code: 'MAX_VALUE',
      });
    }

    // Pattern (RegExp stored as string)
    if (field.validation.pattern) {
      const pattern = toRegExp(field.validation.pattern);
      
      if (pattern && typeof pattern.test === 'function' && !pattern.test(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} format is invalid`,
          code: 'INVALID_FORMAT',
        });
      }
    }
  }

  return errors;
}

/**
 * Helper validation functions
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidPhone(phone: string): boolean {
  // Basic phone validation - can be enhanced
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function toRegExp(pattern: unknown): RegExp | null {
  if (!pattern) {
    return null;
  }

  if (pattern instanceof RegExp) {
    return pattern;
  }

  if (typeof pattern === 'string') {
    try {
      return new RegExp(pattern);
    } catch {
      return null;
    }
  }

  if (typeof pattern === 'object') {
    const maybePattern = pattern as Record<string, unknown>;
    const source =
      typeof maybePattern.source === 'string'
        ? maybePattern.source
        : typeof maybePattern.pattern === 'string'
          ? maybePattern.pattern
          : typeof maybePattern.value === 'string'
            ? maybePattern.value
            : undefined;
    if (!source) {
      return null;
    }
    const flags = typeof maybePattern.flags === 'string' ? maybePattern.flags : undefined;
    try {
      return new RegExp(source, flags);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Throw validation error if validation fails
 */
export function validateOrThrow(data: Record<string, any>, schema: FormSchema): void {
  const result = validateAgainstSchema(data, schema);
  
  if (!result.isValid) {
    throw new DomainValidationError(
      'Validation failed',
      result.errors.map(e => ({ field: e.field, message: e.message }))
    );
  }
}

