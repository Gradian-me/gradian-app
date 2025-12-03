import { FormSchema as BuilderFormSchema, FormField as BuilderFormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { FormSchema, FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { extractLabels } from './option-normalizer';

/**
 * Apply default properties to a field if they are not specified
 */
export const applyFieldUIDefaults = (field: FormField): FormField => {
  const fieldCopy = { ...field };
  
  // Apply defaults for colSpan and order only if not already specified
  if (fieldCopy.colSpan == null) {
    fieldCopy.colSpan = 1;
  }
  // Preserve order of 0, but default undefined/null to 999
  if (fieldCopy.order == null) {
    fieldCopy.order = 999; // Default high order for unsorted fields
  }
  
  return fieldCopy;
};

/**
 * Get all fields for a specific section from the schema
 */
export const getFieldsForSection = (schema: FormSchema | BuilderFormSchema, sectionId: string): FormField[] => {
  if (!schema?.fields) {
    return [];
  }
  return schema.fields
    .filter(field => field.sectionId === sectionId)
    .map(field => applyFieldUIDefaults(field));
};

/**
 * Get all fields in render order (sections sorted by order, fields within sections sorted by order)
 * Returns a map of field names to tab indices (0-based, excluding hidden fields)
 */
export const getFieldTabIndexMap = (schema: FormSchema | BuilderFormSchema): Record<string, number> => {
  const tabIndexMap: Record<string, number> = {};
  let currentTabIndex = 0;

  if (!schema?.sections || !schema?.fields) {
    return tabIndexMap;
  }

  // Sort sections by order
  const sortedSections = [...schema.sections].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });

  // For each section, get and sort its fields
  sortedSections.forEach((section) => {
    const sectionFields = schema.fields
      .filter(field => field.sectionId === section.id)
      .map(field => applyFieldUIDefaults(field))
      .filter(field => !field.hidden && !(field as any).layout?.hidden && !field.inactive) // Exclude hidden and inactive fields
      .sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });

    // Assign tab indices to fields in this section
    sectionFields.forEach((field) => {
      tabIndexMap[field.name] = currentTabIndex++;
    });
  });

  return tabIndexMap;
};

/**
 * Get all fields from the schema that have a specific role
 */
export const getFieldsByRole = (schema: FormSchema, role: string): any[] => {
  const fields: any[] = [];
  if (schema?.fields) {
    schema.fields.forEach((field: any) => {
      if (field.role === role) {
        fields.push(field);
      }
    });
    // Sort by order to ensure consistent concatenation order
    fields.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      return orderA - orderB;
    });
  }
  return fields;
};

/**
 * Get concatenated values by role (multiple fields with same role joined with |)
 * For picker fields, attempts to resolve the ID to a label from the target schema
 */
export const getValueByRole = (schema: FormSchema, data: any, role: string): string => {
  const fields = getFieldsByRole(schema, role);
  if (fields.length === 0) return '';

  const joiner = role === 'title' ? ' ' : ' | ';

  const values = fields
    .map(field => {
      const rawValue = data[field.name];
      const valueArray = Array.isArray(rawValue)
        ? rawValue
        : rawValue !== undefined && rawValue !== null
          ? [rawValue]
          : [];

      if (field.component === 'picker' && field.targetSchema) {
        const pickerStrings = valueArray
          .map((entry) => resolvePickerEntry(field, entry, data))
          .filter(Boolean);
        return pickerStrings.join(joiner).trim();
      }

      // For select fields, resolve ID to label from options
      if (field.component === 'select' && field.options && field.options.length > 0) {
        const selectStrings = valueArray
          .map((entry) => {
            if (entry === null || entry === undefined) return '';
            // If entry is an object, try to extract label
            if (typeof entry === 'object') {
              const labels = extractLabels(entry);
              if (labels.length > 0) return labels[0];
              return '';
            }
            // If entry is a string/number ID, find matching option
            const entryId = String(entry);
            const option = field.options.find((opt: { id?: string; value?: string }) => 
              String(opt.id) === entryId || String(opt.value) === entryId
            );
            if (option) {
              return option.label || option.id || entryId;
            }
            return entryId;
          })
          .filter(Boolean);
        return selectStrings.join(joiner).trim();
      }

      const labels = extractLabels(valueArray);
      if (labels.length > 0) {
        return labels.join(joiner).trim();
      }

      const fallbackStrings = valueArray
        .map((entry) => (entry === null || entry === undefined ? '' : String(entry)))
        .filter(Boolean);

      return fallbackStrings.join(joiner).trim();
    })
    .filter(val => typeof val === 'string' && val.trim() !== '');

  return values.join(joiner).trim();
};

/**
 * Get single value by role (for backwards compatibility)
 * For picker fields, attempts to resolve the ID to a label from the target schema
 */
export const getSingleValueByRole = (schema: FormSchema, data: any, role: string, defaultValue: string = ''): string => {
  const fields = getFieldsByRole(schema, role);
  if (fields.length === 0) return defaultValue;
  
  const field = fields[0];
  const rawValue = data[field.name];
  
  if (rawValue === undefined || rawValue === null) {
    return defaultValue;
  }
  
  const valueArray = Array.isArray(rawValue)
    ? rawValue
    : [rawValue];
  
  if (field.component === 'picker' && field.targetSchema) {
    const pickerStrings = valueArray
      .map((entry) => resolvePickerEntry(field, entry, data))
      .filter(Boolean);

    if (pickerStrings.length > 0) {
      return pickerStrings[0];
    }

    return defaultValue;
  }

  // For select fields, resolve ID to label from options
  if (field.component === 'select' && field.options && field.options.length > 0) {
    const selectStrings = valueArray
      .map((entry) => {
        if (entry === null || entry === undefined) return '';
        // If entry is an object, try to extract label
        if (typeof entry === 'object') {
          const labels = extractLabels(entry);
          if (labels.length > 0) return labels[0];
          return '';
        }
        // If entry is a string/number ID, find matching option
        const entryId = String(entry);
        const option = field.options.find((opt: { id?: string; value?: string }) => 
          String(opt.id) === entryId || String(opt.value) === entryId
        );
        if (option) {
          return option.label || option.id || entryId;
        }
        return entryId;
      })
      .filter(Boolean);
    
    if (selectStrings.length > 0) {
      return selectStrings[0];
    }
    return defaultValue;
  }
  
  const labels = extractLabels(valueArray);
  if (labels.length > 0) {
    return labels[0];
  }
  
  const fallbackStrings = valueArray
    .map((entry) => (entry === null || entry === undefined ? '' : String(entry)))
    .filter(Boolean);
  
  return fallbackStrings.length > 0 ? fallbackStrings[0] : defaultValue;
};

/**
 * Resolve field by ID from form schema
 */
export const resolveFieldById = (schema: FormSchema, fieldId: string): any => {
  if (!schema?.fields) {
    return { id: fieldId, name: fieldId };
  }
  
  const field = schema.fields.find(f => f.id === fieldId);
  if (!field) {
    return { id: fieldId, name: fieldId };
  }
  return field;
};

/**
 * Get field value from data using dot notation
 */
export const getFieldValue = (fieldPath: string, data: any) => {
  return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
};

/**
 * Get array values by role - specifically for badge/category fields
 */
export const getArrayValuesByRole = (schema: FormSchema | null | undefined, data: any, role: string): any[] => {
  if (!schema || !Array.isArray(schema.fields) || data === null || data === undefined) {
    return [];
  }

  const fields = getFieldsByRole(schema, role);
  if (fields.length === 0) return [];
  
  // Get the first field with this role
  const fieldName = fields[0].name;
  const value = data[fieldName];
  
  // Return as array if it exists and is an array
  if (value !== undefined && value !== null && Array.isArray(value)) {
    return value;
  }
  
  return [];
};

/**
 * Get metrics by role - specifically for performance metrics fields
 */
export const getMetricsByRole = (schema: FormSchema, data: any, role: string): any => {
  const fields = getFieldsByRole(schema, role);
  if (fields.length === 0) return null;
  
  // Get the first field with this role
  const fieldName = fields[0].name;
  const value = data[fieldName];
  
  // Return the object if it exists and is not an array
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  
  return null;
};

const resolvePickerEntry = (field: any, entry: any, data: any): string => {
  if (entry === null || entry === undefined) {
    return '';
  }

  if (typeof entry === 'object') {
    const labels = extractLabels(entry);
    if (labels.length > 0) {
      return labels[0];
    }
    if (entry._resolvedLabel) return entry._resolvedLabel;
    if (entry.name) return entry.name;
    if (entry.title) return entry.title;
    if (entry.id) return String(entry.id);
    return JSON.stringify(entry);
  }

  if (typeof entry === 'string') {
    const resolvedKey = `_${field.name}_resolved`;
    const resolvedData = data[resolvedKey];
    if (Array.isArray(resolvedData)) {
      const matched = resolvedData.find((resolvedItem: any) => resolvedItem?.id === entry);
      if (matched) {
        const labels = extractLabels(matched);
        if (labels.length > 0) return labels[0];
        if (matched._resolvedLabel) return matched._resolvedLabel;
        if (matched.name) return matched.name;
        if (matched.title) return matched.title;
      }
    } else if (resolvedData && resolvedData.id === entry) {
      const labels = extractLabels(resolvedData);
      if (labels.length > 0) return labels[0];
      if (resolvedData._resolvedLabel) return resolvedData._resolvedLabel;
      if (resolvedData.name) return resolvedData.name;
      if (resolvedData.title) return resolvedData.title;
    }
    return entry;
  }

  return String(entry);
};

