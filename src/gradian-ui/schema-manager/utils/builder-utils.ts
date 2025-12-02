// Schema Builder Utilities
// Utility functions for schema builder operations

import { FormSchema, FormField, FormSection } from '../types/form-schema';

export const FIELD_TYPES: Array<{
  value: FormField['component'];
  label: string;
  icon?: string;
  description?: string;
}> = [
  { value: 'avatar', label: 'Avatar', description: 'Avatar/image display' },
  { value: 'badge', label: 'Badge', description: 'Badge display component' },
  { value: 'checkbox-list', label: 'Checkbox List', description: 'Multiple options checkbox list' },
  { value: 'code-viewer', label: 'Code Viewer', description: 'Code block viewer with syntax highlighting' },
  { value: 'color-picker', label: 'Color Picker', description: 'Color picker component' },
  { value: 'countdown', label: 'Countdown', description: 'Countdown timer display' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'datetime', label: 'Date Time', description: 'Date and time picker' },
  { value: 'datetime-local', label: 'Date Time Local', description: 'Date and time picker (local)' },
  { value: 'email', label: 'Email', description: 'Email address input' },
  { value: 'file', label: 'File', description: 'File upload' },
  { value: 'icon', label: 'Icon', description: 'Icon name input with preview' },
  { value: 'image-text', label: 'Image Text', description: 'Image with text display' },
  { value: 'list-input', label: 'List Input', description: 'Drag-and-drop list with inline editing' },
  { value: 'name', label: 'Name Input', description: 'Name input field' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'password', label: 'Password', description: 'Password input (masked)' },
  { value: 'picker', label: 'Picker', description: 'Popup picker to select from another schema' },
  { value: 'radio', label: 'Radio', description: 'Single option radio button' },
  { value: 'rating', label: 'Rating', description: 'Rating display/input' },
  { value: 'select', label: 'Select', description: 'Dropdown selection' },
  { value: 'tel', label: 'Phone', description: 'Telephone number input' },
  { value: 'text', label: 'Text', description: 'Single-line text input' },
  { value: 'textarea', label: 'Textarea', description: 'Multi-line text input' },
  { value: 'url', label: 'URL', description: 'URL input' },
  { value: 'tag-input', label: 'Tag Input', description: 'Tag input with badge display' },
];

export const ROLES: Array<{
  value: NonNullable<FormField['role']>;
  label: string;
  icon?: string;
  description?: string;
}> = [
  { value: 'title', label: 'Title', description: 'Primary heading' },
  { value: 'subtitle', label: 'Subtitle', description: 'Secondary heading' },
  { value: 'description', label: 'Description', description: 'Descriptive text' },
  { value: 'image', label: 'Image', description: 'Image display' },
  { value: 'avatar', label: 'Avatar', description: 'User avatar' },
  { value: 'icon', label: 'Icon', description: 'Icon display' },
  { value: 'rating', label: 'Rating', description: 'Rating display' },
  { value: 'badge', label: 'Badge', description: 'Badge/status display' },
  { value: 'status', label: 'Status', description: 'Status indicator' },
  { value: 'email', label: 'Email', description: 'Email link' },
  { value: 'location', label: 'Location', description: 'Location display' },
  { value: 'tel', label: 'Phone', description: 'Phone link' },
  { value: 'duedate', label: 'Due Date', description: 'Due date/countdown' },
  { value: 'code', label: 'Code', description: 'Code identifier (displayed as cyan badge)' },
  { value: 'color', label: 'Color', description: 'Tailwind color id used for visual styling (e.g., avatar, badges)' },
];

/**
 * Get fields for a specific section
 */
export function getFieldsForSection(schema: FormSchema, sectionId: string): FormField[] {
  return schema.fields
    .filter(f => f.sectionId === sectionId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Get the next order value for a section
 */
export function getNextFieldOrder(schema: FormSchema, sectionId: string): number {
  const sectionFields = schema.fields.filter(f => f.sectionId === sectionId);
  return sectionFields.length > 0 
    ? Math.max(...sectionFields.map(f => f.order || 0)) + 1
    : 1;
}

/**
 * Generate a unique field ID
 */
export function generateFieldId(): string {
  return `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique section ID
 */
export function generateSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate a schema
 */
export function validateSchema(schema: FormSchema): {
  valid: boolean;
  errors: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};
  
  // Validate schema required fields
  if (!schema.id) errors.schema = ['ID is required'];
  if (!schema.singular_name) errors.schema = [...(errors.schema || []), 'Singular name is required'];
  if (!schema.plural_name) errors.schema = [...(errors.schema || []), 'Plural name is required'];
  
  // Validate fields
  schema.fields.forEach((field, index) => {
    const fieldErrors: string[] = [];
    if (!field.id) fieldErrors.push('ID is required');
    if (!field.name) fieldErrors.push('Name is required');
    if (!field.label) fieldErrors.push('Label is required');
    if (!field.sectionId) fieldErrors.push('Section is required');
    
    // Check if sectionId exists
    const sectionExists = schema.sections.some(s => s.id === field.sectionId);
    if (!sectionExists) fieldErrors.push('Section does not exist');
    
    if (fieldErrors.length > 0) {
      errors[`field-${index}`] = fieldErrors;
    }
  });
  
  // Validate sections
  schema.sections.forEach((section, index) => {
    const sectionErrors: string[] = [];
    if (!section.id) sectionErrors.push('ID is required');
    if (!section.title) sectionErrors.push('Title is required');
    if (sectionErrors.length > 0) {
      errors[`section-${index}`] = sectionErrors;
    }
  });
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Create a new empty schema
 */
export function createEmptySchema(): FormSchema {
  const sectionId = generateSectionId();
  const fieldId = generateFieldId();
  
  return {
    id: '',
    description: '',
    singular_name: '',
    plural_name: '',
    fields: [
      {
        id: fieldId,
        name: 'example_field',
        label: 'Example Field',
        sectionId: sectionId,
        component: 'text',
        order: 1,
      },
    ],
    sections: [
      {
        id: sectionId,
        title: 'Example Section',
        columns: 2,
      },
    ],
  };
}

/**
 * Clone a schema
 */
export function cloneSchema(schema: FormSchema, newId: string, newSingularName: string, newPluralName: string): FormSchema {
  return {
    ...schema,
    id: newId,
    singular_name: newSingularName,
    plural_name: newPluralName,
    fields: schema.fields.map(f => ({
      ...f,
      id: generateFieldId(),
    })),
    sections: schema.sections.map(s => ({
      ...s,
      id: generateSectionId(),
    })),
  };
}

/**
 * Export schema to JSON
 */
export function exportSchemaToJson(schema: FormSchema, pretty: boolean = true): string {
  return JSON.stringify(schema, null, pretty ? 2 : undefined);
}

/**
 * Import schema from JSON
 */
export function importSchemaFromJson(json: string): FormSchema {
  const parsed = JSON.parse(json);
  
  // Validate the imported schema
  const validation = validateSchema(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid schema: ${JSON.stringify(validation.errors)}`);
  }
  
  return parsed;
}

/**
 * Clean a schema (remove unused fields, fix orders, etc.)
 */
export function cleanSchema(schema: FormSchema): FormSchema {
  // Remove orphaned fields
  const sectionIds = new Set(schema.sections.map(s => s.id));
  const validFields = schema.fields.filter(f => sectionIds.has(f.sectionId));
  
  // Fix field orders
  const fieldsBySection = validFields.reduce((acc, field) => {
    if (!acc[field.sectionId]) {
      acc[field.sectionId] = [];
    }
    acc[field.sectionId].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);
  
  const cleanedFields = Object.entries(fieldsBySection).flatMap(([sectionId, fields]) => {
    return fields
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((field, index) => ({
        ...field,
        order: index + 1,
      }));
  });
  
  return {
    ...schema,
    fields: cleanedFields,
  };
}

