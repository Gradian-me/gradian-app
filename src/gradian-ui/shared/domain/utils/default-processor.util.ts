// Default Value Processor Utility
// Automatically applies default values from schema fields to entity data

/**
 * Get schema for a given schema ID
 */
async function getSchema(schemaId: string): Promise<any> {
  try {
    const { getSchemaById } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
    return await getSchemaById(schemaId);
  } catch (error) {
    console.warn(`[DEFAULTS] Could not load schema for ${schemaId}:`, error);
    return null;
  }
}

/**
 * Apply default values from schema fields to entity data
 * Only applies defaults if the field is not already present in the data
 * @param schemaId - The schema ID (e.g., "users")
 * @param data - The entity data to process
 * @returns Processed data with default values applied
 */
export async function applySchemaDefaults(
  schemaId: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  // Get the schema to find fields with default values
  const schema = await getSchema(schemaId);
  if (!schema || !schema.fields) {
    return data;
  }

  // Process data with defaults
  const processedData = { ...data };

  // Find fields with defaultValue defined
  schema.fields.forEach((field: any) => {
    const fieldName = field.name;
    const defaultValue = field.defaultValue;

    // Only apply default if:
    // 1. Field has a defaultValue defined
    // 2. Field is not already present in the data (or is undefined/null/empty string)
    if (
      defaultValue !== undefined &&
      defaultValue !== null &&
      (processedData[fieldName] === undefined ||
        processedData[fieldName] === null ||
        processedData[fieldName] === '')
    ) {
      processedData[fieldName] = defaultValue;
    }
  });

  return processedData;
}

