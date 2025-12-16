// Utility to filter form data before submission
// Removes temporary IDs, hidden fields, and other unwanted data

import { FormSchema, FormData } from '@/gradian-ui/schema-manager/types/form-schema';

/**
 * Filters form data before submission to remove:
 * - Temporary `id` fields from repeating section items (unless it's the main entity ID)
 * - Hidden/inactive fields
 * - Empty/undefined values (optional)
 * 
 * @param formData - The raw form data
 * @param schema - The form schema to determine which fields to keep
 * @param options - Filtering options
 * @returns Cleaned form data ready for API submission
 */
export function filterFormDataForSubmission(
  formData: FormData,
  schema: FormSchema,
  options: {
    removeEmptyValues?: boolean;
    keepEntityId?: boolean; // Keep the main entity ID (for edit mode)
    removeRepeatingItemIds?: boolean; // Remove IDs from repeating section items
  } = {}
): FormData {
  const {
    removeEmptyValues = false,
    keepEntityId = true,
    removeRepeatingItemIds = true,
  } = options;

  // Get list of field names from schema
  const schemaFieldNames = new Set(schema.fields.map(f => f.name));
  
  // Get list of hidden/inactive fields
  const hiddenFields = new Set(
    schema.fields
      .filter(f => f.hidden || f.inactive || (f as any).layout?.hidden)
      .map(f => f.name)
  );

  // Get repeating section IDs
  const repeatingSectionIds = new Set(
    schema.sections
      .filter(s => s.isRepeatingSection)
      .map(s => s.id)
  );

  // Helper to check if a value is "empty"
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  };

  // Helper to clean a single value
  const cleanValue = (value: any, fieldName: string): any => {
    // If it's a repeating section array
    if (repeatingSectionIds.has(fieldName) && Array.isArray(value)) {
      return value.map((item: any) => {
        if (typeof item !== 'object' || item === null) return item;
        
        const cleaned: any = {};
        Object.keys(item).forEach(key => {
          // Remove temporary ID from repeating items (unless it's a real entity ID)
          if (key === 'id' && removeRepeatingItemIds) {
            // Only keep ID if it looks like a real entity ID (not a ULID generated for form tracking)
            // Real entity IDs are typically shorter or have a specific format
            // For now, we'll remove all IDs from repeating items to be safe
            return;
          }
          
          // Only include fields that are in the schema
          const section = schema.sections.find(s => s.id === fieldName);
          if (section?.isRepeatingSection) {
            const sectionFields = schema.fields.filter(f => f.sectionId === fieldName);
            const fieldNames = new Set(sectionFields.map(f => f.name));
            
            if (fieldNames.has(key)) {
              const field = sectionFields.find(f => f.name === key);
              // Skip hidden/inactive fields
              if (field && !field.hidden && !field.inactive && !(field as any).layout?.hidden) {
                const fieldValue = item[key];
                if (!removeEmptyValues || !isEmpty(fieldValue)) {
                  cleaned[key] = fieldValue;
                }
              }
            }
          } else {
            cleaned[key] = item[key];
          }
        });
        return cleaned;
      }).filter((item: any) => {
        // Remove completely empty items from repeating sections
        return Object.keys(item).length > 0;
      });
    }
    
    return value;
  };

  // Build cleaned form data
  const cleaned: FormData = {};

  // Metadata fields that should always be preserved (not in schema but needed for backend)
  // System section fields: inactive, isForce, forceReason, parent (hierarchical), relatedCompanies (multi-company link), relatedTenants (multi-tenant link), status (status from status group), entityType (entity type from entity type group), assignedTo, dueDate
  const metadataFields = new Set(['incomplete', 'sections', 'inactive', 'isForce', 'forceReason', 'parent', 'relatedCompanies', 'relatedTenants', 'status', 'entityType', 'assignedTo', 'dueDate']);

  Object.keys(formData).forEach(key => {
    const value = formData[key];

    // Skip hidden/inactive fields
    if (hiddenFields.has(key)) {
      return;
    }

    // Keep entity ID if requested (for edit mode)
    if (key === 'id' && keepEntityId) {
      cleaned[key] = value;
      return;
    }

    // Preserve metadata fields (like incomplete flag), with special handling for parent, status, entityType, and assignedTo
    if (metadataFields.has(key)) {
      if (key === 'parent') {
        // Normalize parent to a single ID (not array of objects) so latest parent data is always resolved dynamically
        let parentId: any = value;
        if (Array.isArray(value) && value.length > 0) {
          const first = value[0];
          if (typeof first === 'string' || typeof first === 'number') {
            parentId = String(first);
          } else if (first && typeof first === 'object' && first.id) {
            parentId = String(first.id);
          }
        } else if (value && typeof value === 'object' && (value as any).id) {
          parentId = String((value as any).id);
        }
        cleaned[key] = parentId ?? null;
      } else if (key === 'status' || key === 'entityType') {
        // Normalize status/entityType - PickerInput returns array of NormalizedOption objects
        // Store as array of selection objects (preserve full normalized option for metadata)
        if (Array.isArray(value) && value.length > 0) {
          cleaned[key] = value; // Keep as array of normalized options
        } else if (value && typeof value === 'object' && (value as any).id) {
          // Single object, wrap in array
          cleaned[key] = [value];
        } else {
          cleaned[key] = null;
        }
      } else if (key === 'assignedTo') {
        // Normalize assignedTo - PickerInput returns array of NormalizedOption objects
        // Store as array of selection objects (preserve full normalized option for metadata)
        if (Array.isArray(value) && value.length > 0) {
          cleaned[key] = value; // Keep as array of normalized options
        } else if (value && typeof value === 'object' && (value as any).id) {
          // Single object, wrap in array
          cleaned[key] = [value];
        } else {
          cleaned[key] = null;
        }
      } else {
        cleaned[key] = value;
      }
      return;
    }

    // Only include fields that are in the schema (or repeating sections)
    if (schemaFieldNames.has(key) || repeatingSectionIds.has(key)) {
      const cleanedValue = cleanValue(value, key);
      
      // Apply empty value filtering if requested
      if (removeEmptyValues && isEmpty(cleanedValue)) {
        return;
      }
      
      cleaned[key] = cleanedValue;
    }
  });

  return cleaned;
}

