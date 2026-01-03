/**
 * Form Filler Populator
 * Populates form fields using setValue function
 */

import type { FormSchema, FormField } from '@/gradian-ui/schema-manager/types/form-schema';

/**
 * Populates form fields with validated data
 * @param data - Validated and transformed form data
 * @param schema - Form schema
 * @param setValue - Function to set field values (from form context)
 */
export function populateFormFields(
  data: Record<string, any>,
  schema: FormSchema,
  setValue: (fieldName: string, value: any) => void
): void {
  if (!schema || !schema.fields) {
    return;
  }

  // Populate regular fields
  schema.fields.forEach((field: FormField) => {
    const fieldName = field.name;
    const value = data[fieldName];

    // Skip if field is hidden
    if (field.hidden) {
      return;
    }

    // Only set value if it's defined (undefined means field should remain unchanged)
    if (value !== undefined) {
      setValue(fieldName, value);
    }
  });

  // Populate repeating sections
  if (schema.sections) {
    schema.sections.forEach((section) => {
      if (section.isRepeatingSection) {
        const sectionId = section.id;
        const sectionData = data[sectionId];

        if (Array.isArray(sectionData)) {
          // Set the entire repeating section array
          setValue(sectionId, sectionData);
        }
      }
    });
  }
}

