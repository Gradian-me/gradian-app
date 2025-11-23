// Schema to Zod Converter
// Generates Zod validation schemas from FormSchema definitions

import { z } from 'zod';
import { FormSchema, FormField } from '../types/form-schema';

// Define ValidationRule type based on FormField validation property
type ValidationRule = NonNullable<FormField['validation']>;

/**
 * Converts a validation rule from form schema to Zod schema
 */
const convertValidationToZod = (field: FormField): any => {
  const { validation, component } = field;
  
  // Start with base type
  let zodType: z.ZodTypeAny;
  
  // Determine base type from field component
  switch (component) {
    case 'number':
      zodType = z.number();
      break;
    case 'email':
      zodType = z.string().email('Invalid email address');
      break;
    case 'url':
      zodType = z.string().url('Invalid URL');
      break;
    case 'checkbox':
      // For checkbox arrays (categories, etc.)
      if (field.options) {
        zodType = z.array(z.string());
      } else {
        zodType = z.boolean();
      }
      break;
    case 'date':
    case 'datetime-local':
      zodType = z.string(); // Store as ISO string
      break;
    case 'textarea':
    case 'text':
    case 'tel':
    case 'password':
      zodType = z.string();
      break;
    case 'select':
      zodType = z.string();
      break;
    default:
      zodType = z.string();
  }
  
  // Apply validation rules
  if (validation) {
    // Required validation
    const isRequired = validation.required ?? false;
    const errorMessage = validation.custom ? undefined : getErrorMessage(field, validation);
    
    if (isRequired) {
      if (component === 'text' || component === 'textarea' || component === 'email' || component === 'url' || component === 'tel' || component === 'password') {
        zodType = (zodType as z.ZodString).min(1, errorMessage || `${field.label} is required`);
      } else if (component === 'number') {
        // For number fields, we use refine instead of min for required validation
        zodType = (zodType as z.ZodNumber).refine(val => val !== undefined && val !== null, {
          message: errorMessage || `${field.label} is required`
        });
      }
    }
    
    // Min length for strings
    if (validation.minLength && (component === 'text' || component === 'textarea' || component === 'email' || component === 'url')) {
      zodType = (zodType as z.ZodString).min(
        validation.minLength, 
        errorMessage || `Minimum length is ${validation.minLength}`
      );
    }
    
    // Max length for strings
    if (validation.maxLength && (component === 'text' || component === 'textarea' || component === 'email' || component === 'url')) {
      zodType = (zodType as z.ZodString).max(
        validation.maxLength,
        errorMessage || `Maximum length is ${validation.maxLength}`
      );
    }
    
    // Min value for numbers
    if (validation.min !== undefined && component === 'number') {
      zodType = (zodType as z.ZodNumber).min(
        validation.min,
        errorMessage || `Minimum value is ${validation.min}`
      );
    }
    
    // Max value for numbers
    if (validation.max !== undefined && component === 'number') {
      zodType = (zodType as z.ZodNumber).max(
        validation.max,
        errorMessage || `Maximum value is ${validation.max}`
      );
    }
    
    // Pattern validation
    if (validation.pattern) {
      const errorMsg = errorMessage || 'Invalid format';
      // Convert string to RegExp if needed
      const pattern = typeof validation.pattern === 'string' 
        ? new RegExp(validation.pattern) 
        : validation.pattern;
      zodType = (zodType as z.ZodString).regex(pattern, errorMsg);
    }
  }
  
  // Checkbox with options (multi-select)
  if (component === 'checkbox' && field.options && validation?.required) {
    zodType = (zodType as z.ZodArray<z.ZodString>).min(1, `At least one ${field.label} is required`);
  }
  
  // For non-required fields, make it optional
  if (!validation?.required) {
    zodType = zodType.optional();
  }
  
  return zodType;
};

/**
 * Generates a Zod schema from a FormSchema
 */
export const generateZodSchemaFromForm = <T extends FormSchema>(
  schema: T,
  mode: 'create' | 'update' = 'create'
): z.ZodSchema<any> => {
  const shape: Record<string, any> = {};
  
  schema.sections.forEach(section => {
    // Get fields for this section
    const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
    
    // Handle repeating sections (like contacts)
    if (section.isRepeatingSection) {
      const nestedShape: Record<string, any> = {};
      
      sectionFields.forEach(field => {
        const zodType = convertValidationToZod(field);
        nestedShape[field.name] = zodType;
      });
      
      // Create array schema with min/max constraints
      const itemSchema = z.object(nestedShape);
      let arraySchema = z.array(itemSchema);
      
      // Check if this is a relation-based repeating section
      const isRelationBased = section.repeatingConfig?.targetSchema && section.repeatingConfig?.relationTypeId;
      
      if (section.repeatingConfig) {
        const { minItems, maxItems } = section.repeatingConfig;
        
        // For relation-based sections in create mode, skip minItems constraint
        // This allows saving the form first, then adding related items
        // In update mode, enforce minItems to ensure data integrity after initial save
        if (minItems !== undefined && !(isRelationBased && mode === 'create')) {
          arraySchema = arraySchema.min(
            minItems,
            `At least ${minItems} ${minItems === 1 ? 'item is' : 'items are'} required`
          );
        }
        
        if (maxItems !== undefined) {
          arraySchema = arraySchema.max(
            maxItems,
            `Maximum ${maxItems} ${maxItems === 1 ? 'item is' : 'items are'} allowed`
          );
        }
      }
      
      // Use section id as the key (e.g., 'contacts')
      // For relation-based sections in create mode, make it optional to allow saving without items initially
      // In update mode, keep it optional to allow partial updates, but minItems will be enforced if provided
      if (mode === 'update') {
        shape[section.id] = arraySchema.optional();
      } else if (isRelationBased && mode === 'create') {
        // Relation-based sections in create mode: optional to allow saving first
        shape[section.id] = arraySchema.optional();
      } else {
        shape[section.id] = arraySchema;
      }
    } else {
      // Handle regular fields
      sectionFields.forEach(field => {
        const zodType = convertValidationToZod(field);
        
        if (mode === 'update') {
          // For update schemas, all fields are optional
          shape[field.name] = zodType.optional();
        } else {
          shape[field.name] = zodType;
        }
      });
    }
  });
  
  return z.object(shape);
};

/**
 * Generates validation rules for useFormState from FormSchema
 */
export const generateValidationRulesFromForm = <T extends FormSchema>(
  schema: T
): Record<string, any> => {
  const rules: Record<string, any> = {};
  
  schema.sections.forEach(section => {
    // Get fields for this section
    const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
    
    // Handle repeating sections
    if (section.isRepeatingSection) {
      // For repeating sections, we create nested rules
      // The key is the section id, and values are the array items
      sectionFields.forEach(field => {
        const fieldRules: ValidationRule = {};
        
        if (field.validation) {
          Object.assign(fieldRules, field.validation);
        }
        
        if (Object.keys(fieldRules).length > 0) {
          // For repeating sections, store rules at the field level
          // These will be applied to each item in the array
          const fieldPath = `${section.id}.${field.name}`;
          rules[fieldPath] = fieldRules;
        }
      });
    } else {
      // Handle regular fields
      sectionFields.forEach(field => {
        const fieldRules: ValidationRule = {};
        
        if (field.validation) {
          Object.assign(fieldRules, field.validation);
        }
        
        if (Object.keys(fieldRules).length > 0) {
          rules[field.name] = fieldRules;
        }
      });
    }
  });
  
  return rules;
};

/**
 * Extracts initial values from FormSchema
 */
export const extractInitialValuesFromForm = <T extends FormSchema>(
  schema: T
): Record<string, any> => {
  const initialValues: Record<string, any> = {};
  
  schema.sections.forEach(section => {
    // Get fields for this section
    const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
    
    // Handle repeating sections
    if (section.isRepeatingSection) {
      // For repeating sections, initialize as empty array
      initialValues[section.id] = [];
    } else {
      // Handle regular fields
      sectionFields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialValues[field.name] = field.defaultValue;
        } else {
          // Set appropriate defaults based on component
          switch (field.component) {
            case 'checkbox':
              if (field.options) {
                initialValues[field.name] = [];
              } else {
                initialValues[field.name] = false;
              }
              break;
            case 'number':
              initialValues[field.name] = 0;
              break;
            case 'date':
            case 'datetime-local':
              initialValues[field.name] = '';
              break;
            case 'select':
              // Check if it's the status field
              if (field.name === 'status' && field.options) {
                initialValues[field.name] = field.options[0]?.value || '';
              } else {
                initialValues[field.name] = '';
              }
              break;
            default:
              initialValues[field.name] = '';
          }
        }
      });
    }
  });
  
  return initialValues;
};

/**
 * Gets error message from validation rules
 */
const getErrorMessage = (field: FormField, validation: ValidationRule): string | undefined => {
  if (validation.custom) {
    return undefined; // Let custom handle it
  }
  
  if (validation.required) {
    return `${field.label} is required`;
  }
  
  return field.label ? `Invalid ${field.label.toLowerCase()}` : 'Invalid value';
};

/**
 * Generates both create and update schemas
 */
export const generateSchemasFromForm = <T extends FormSchema>(schema: T) => {
  const createSchema = generateZodSchemaFromForm(schema, 'create');
  const updateSchema = generateZodSchemaFromForm(schema, 'update');
  
  return {
    createSchema,
    updateSchema,
    validationRules: generateValidationRulesFromForm(schema),
    initialValues: extractInitialValuesFromForm(schema),
  };
};

/**
 * Helper to create nested array schemas (for repeating sections like contacts)
 */
export const createArrayFieldZodSchema = (
  fieldSchema: FormSchema,
  minItems?: number,
  maxItems?: number
) => {
  const itemSchema = generateZodSchemaFromForm(fieldSchema, 'create');
  
  let arraySchema = z.array(itemSchema);
  
  if (minItems !== undefined) {
    arraySchema = arraySchema.min(
      minItems,
      `At least ${minItems} ${minItems === 1 ? 'item is' : 'items are'} required`
    );
  }
  
  if (maxItems !== undefined) {
    arraySchema = arraySchema.max(
      maxItems,
      `Maximum ${maxItems} ${maxItems === 1 ? 'item is' : 'items are'} allowed`
    );
  }
  
  return arraySchema;
};

