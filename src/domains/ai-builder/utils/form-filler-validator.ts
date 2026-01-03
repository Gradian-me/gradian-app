/**
 * Form Filler Validator and Transformer
 * Validates and transforms AI-generated form data against schema requirements
 */

import type { FormSchema, FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { validateField } from '@/gradian-ui/schema-manager/utils/schema-validator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  transformedData: Record<string, any>;
}

/**
 * Validates and transforms form data against schema
 * @param data - AI-generated form data
 * @param schema - Form schema to validate against
 * @returns Validation result with transformed data
 */
export function validateAndTransformFormData(
  data: any,
  schema: FormSchema
): ValidationResult {
  const errors: string[] = [];
  const transformedData: Record<string, any> = { ...data };

  if (!schema || !schema.fields) {
    return {
      isValid: false,
      errors: ['Schema is invalid or has no fields'],
      transformedData: {},
    };
  }

  // Process each field in the schema
  schema.fields.forEach((field: FormField) => {
    const fieldName = field.name;
    const value = transformedData[fieldName];

    // Skip if field is hidden or disabled (but still validate if value is provided)
    if (field.hidden) {
      // Remove hidden field values from transformed data
      delete transformedData[fieldName];
      return;
    }

    // Transform value based on field type
    try {
      const transformedValue = transformFieldValue(field, value, schema);
      if (transformedValue !== undefined) {
        transformedData[fieldName] = transformedValue;
        
        // Only validate if value was provided (don't require all required fields)
        const validationErrors = validateField(field, transformedValue);
        if (validationErrors.length > 0) {
          validationErrors.forEach((err) => {
            errors.push(`${field.label || fieldName}: ${err.message}`);
          });
        }
      }
      // Note: We don't error on missing required fields - user can complete them later
      // The submit button will validate all required fields when the form is submitted
    } catch (error) {
      errors.push(
        `${field.label || fieldName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  // Handle repeating sections
  if (schema.sections) {
    schema.sections.forEach((section) => {
      if (section.isRepeatingSection && section.repeatingConfig?.targetSchema) {
        const sectionId = section.id;
        const sectionData = transformedData[sectionId];

        if (Array.isArray(sectionData)) {
          // Validate each item in repeating section
          sectionData.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              // Ensure each item has an id
              if (!item.id) {
                // Generate a temporary ID if missing (will be replaced on save)
                item.id = `temp-${Date.now()}-${index}`;
              }
            }
          });
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    transformedData,
  };
}

/**
 * Transforms a field value based on field configuration
 */
function transformFieldValue(
  field: FormField,
  value: any,
  schema: FormSchema
): any {
  // Handle empty values
  if (value === undefined || value === null || value === '') {
    // Return default value if available, otherwise undefined
    return field.defaultValue !== undefined ? field.defaultValue : undefined;
  }

  // Handle options fields (select, checkbox-list, radio, toggle-group)
  if (field.options && Array.isArray(field.options) && field.options.length > 0) {
    return transformOptionsField(field, value);
  }

  // Handle picker/reference fields
  if (field.component === 'picker' || field.targetSchema || field.referenceSchema) {
    return transformPickerField(field, value);
  }

  // Handle number fields
  if (field.component === 'number') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      throw new Error('Invalid number value');
    }
    return numValue;
  }

  // Handle date fields
  if (field.component === 'date' || field.component === 'datetime' || field.component === 'datetime-local') {
    if (typeof value === 'string') {
      // Validate date format (basic check)
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      return value; // Return as string (ISO format expected)
    }
    return value;
  }

  // Handle array fields (list-input, tag-input, checkbox-list with multiselect)
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) {
        // Ensure object has required structure
        if (item.id !== undefined) {
          return item;
        }
        // If it's a string in an array, keep it as string
        return item;
      }
      return item;
    });
  }

  // Handle string fields - ensure it's a string
  if (typeof value === 'string') {
    return value.trim();
  }

  // Return value as-is for other types
  return value;
}

/**
 * Transforms options field value (select, checkbox-list, radio, toggle-group)
 */
function transformOptionsField(field: FormField, value: any): any {
  if (!field.options || !Array.isArray(field.options)) {
    return value;
  }

  // Handle array values (multiselect, checkbox-list)
  if (Array.isArray(value)) {
    return value.map((item) => {
      return matchOption(field, item);
    });
  }

  // Handle single value
  if (typeof value === 'object' && value !== null) {
    // If already in {id, label, icon, color} format, validate it exists
    if (value.id !== undefined) {
      const option = field.options.find(
        (opt: any) => String(opt.id) === String(value.id) || String(opt.value) === String(value.id)
      );
      if (option) {
        return {
          id: option.id,
          label: option.label,
          icon: option.icon,
          color: option.color,
        };
      }
    }
    // If has label, try to match by label
    if (value.label) {
      return matchOptionByLabel(field, value.label);
    }
  }

  // Handle string/number value
  if (typeof value === 'string' || typeof value === 'number') {
    return matchOption(field, value);
  }

  return value;
}

/**
 * Matches a value to an option by ID or label
 */
function matchOption(field: FormField, value: any): any {
  if (!field.options || !Array.isArray(field.options)) {
    return value;
  }

  const valueStr = String(value).toLowerCase().trim();

  // First try exact ID match
  const optionById = field.options.find(
    (opt: any) => String(opt.id || opt.value).toLowerCase() === valueStr
  );
  if (optionById) {
    return {
      id: optionById.id || optionById.value,
      label: optionById.label,
      icon: optionById.icon,
      color: optionById.color,
    };
  }

  // Try label match (case-insensitive, partial match)
  return matchOptionByLabel(field, valueStr);
}

/**
 * Matches a value to an option by label
 */
function matchOptionByLabel(field: FormField, label: string): any {
  if (!field.options || !Array.isArray(field.options)) {
    return label;
  }

  const labelLower = label.toLowerCase().trim();

  // Exact match
  const exactMatch = field.options.find(
    (opt: any) => opt.label?.toLowerCase().trim() === labelLower
  );
  if (exactMatch) {
    return {
      id: exactMatch.id || exactMatch.value,
      label: exactMatch.label,
      icon: exactMatch.icon,
      color: exactMatch.color,
    };
  }

  // Partial match (contains)
  const partialMatch = field.options.find(
    (opt: any) => opt.label?.toLowerCase().includes(labelLower) || labelLower.includes(opt.label?.toLowerCase() || '')
  );
  if (partialMatch) {
    return {
      id: partialMatch.id || partialMatch.value,
      label: partialMatch.label,
      icon: partialMatch.icon,
      color: partialMatch.color,
    };
  }

  // No match found - return the original value (will be validated)
  return label;
}

/**
 * Transforms picker/reference field value
 */
function transformPickerField(field: FormField, value: any): any {
  // Handle array (multiselect picker)
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'object' && item !== null) {
        // Ensure {id, label} structure
        if (item.id && item.label) {
          return { id: item.id, label: item.label };
        }
        // If only id provided, use id as label
        if (item.id) {
          return { id: item.id, label: item.id };
        }
      }
      // If string/number, treat as ID
      if (typeof item === 'string' || typeof item === 'number') {
        return { id: String(item), label: String(item) };
      }
      return item;
    });
  }

  // Handle single object
  if (typeof value === 'object' && value !== null) {
    // Ensure {id, label} structure
    if (value.id && value.label) {
      return { id: value.id, label: value.label };
    }
    // If only id provided, use id as label
    if (value.id) {
      return { id: value.id, label: value.id };
    }
    // If only label provided, try to extract ID from label or use label as ID
    if (value.label) {
      return { id: value.label, label: value.label };
    }
  }

  // Handle string/number (treat as ID)
  if (typeof value === 'string' || typeof value === 'number') {
    return { id: String(value), label: String(value) };
  }

  return value;
}

