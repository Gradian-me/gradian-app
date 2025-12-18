// Sensitive Field Processor Utility
// Automatically detects and encrypts sensitive fields based on schema isSensitive flag

import { encryptSensitiveValue, isEncryptedValue } from './sensitive-field-encryption.util';

/**
 * Get schema for a given schema ID
 */
async function getSchema(schemaId: string): Promise<any> {
  try {
    const { getSchemaById } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
    return await getSchemaById(schemaId);
  } catch (error) {
    console.warn(`[SENSITIVE_FIELD] Could not load schema for ${schemaId}:`, error);
    return null;
  }
}

/**
 * Process entity data to encrypt sensitive fields
 * Detects fields with isSensitive=true in the schema and encrypts them
 * @param schemaId - The schema ID (e.g., "users", "databases")
 * @param data - The entity data to process
 * @returns Processed data with encrypted sensitive fields
 */
export async function processSensitiveFields(
  schemaId: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  // Get the schema to find sensitive fields
  const schema = await getSchema(schemaId);
  if (!schema || !schema.fields) {
    return data;
  }

  // Find fields with isSensitive=true
  const sensitiveFields = schema.fields.filter(
    (field: any) => field.isSensitive === true
  );

  if (sensitiveFields.length === 0) {
    return data;
  }

  // Process each sensitive field
  const processedData = { ...data };

  for (const field of sensitiveFields) {
    const fieldName = field.name;
    const fieldValue = processedData[fieldName];

    // Only encrypt if field value is provided and is a string
    if (fieldValue && typeof fieldValue === 'string' && fieldValue.trim() !== '') {
      // Check if already encrypted
      if (isEncryptedValue(fieldValue)) {
        // Field is already encrypted, skip
        continue;
      }

      try {
        // Encrypt the value
        const encryptedValue = await encryptSensitiveValue(fieldValue);
        
        if (encryptedValue) {
          processedData[fieldName] = encryptedValue;
        } else {
          console.error(`[SENSITIVE_FIELD] Encryption returned null for field ${fieldName}`);
          // Don't update the field if encryption failed - keep original value
        }
      } catch (error) {
        console.error(`[SENSITIVE_FIELD] Error encrypting field ${fieldName}:`, error);
        // Don't update the field if encryption failed - keep original value
      }
    }
  }

  return processedData;
}

