// Response Filter Utility
// Filters sensitive fields (like passwords) from API responses and decrypts sensitive fields

import { decryptSensitiveValue, isEncryptedValue } from '../utils/sensitive-field-encryption.util';

/**
 * Get schema for a given schema ID
 */
async function getSchema(schemaId: string): Promise<any> {
  try {
    const { getSchemaById } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
    return await getSchemaById(schemaId);
  } catch (error) {
    console.warn(`[RESPONSE_FILTER] Could not load schema for ${schemaId}:`, error);
    return null;
  }
}

/**
 * Filter out password fields from entity data
 * Removes fields with component="password" or role="password" from the schema
 * @param schemaId - The schema ID (e.g., "users", "databases")
 * @param data - The entity data to filter
 * @returns Filtered data without password fields
 */
export async function filterPasswordFields<T>(
  schemaId: string,
  data: T
): Promise<T> {
  // Get the schema to find password fields
  const schema = await getSchema(schemaId);
  if (!schema || !schema.fields) {
    return data;
  }

  // Find fields with component="password" or role="password" (more secure: check component first)
  const passwordFields = schema.fields.filter(
    (field: any) => field.component === 'password' || field.role === 'password'
  );

  if (passwordFields.length === 0) {
    return data;
  }

  // Get field names to exclude
  const passwordFieldNames: string[] = passwordFields.map(
    (field: { name: string }) => field.name as string
  );

  // Filter out password fields from data
  if (Array.isArray(data)) {
    return data.map((item) => {
      const filtered = { ...item };
      passwordFieldNames.forEach((fieldName: string) => {
        delete filtered[fieldName as keyof typeof filtered];
      });
      return filtered;
    }) as T;
  } else if (data && typeof data === 'object') {
    const filtered = { ...data };
    passwordFieldNames.forEach((fieldName: string) => {
      delete filtered[fieldName as keyof typeof filtered];
    });
    return filtered as T;
  }

  return data;
}

/**
 * Decrypt sensitive fields in entity data
 * Decrypts fields with isSensitive=true from the schema
 * @param schemaId - The schema ID (e.g., "users", "databases")
 * @param data - The entity data to process
 * @returns Data with decrypted sensitive fields
 */
export async function decryptSensitiveFields<T>(
  schemaId: string,
  data: T
): Promise<T> {
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

  // Get field names to decrypt
  const sensitiveFieldNames: string[] = sensitiveFields.map(
    (field: { name: string }) => field.name as string
  );

  // Decrypt sensitive fields in data
  if (Array.isArray(data)) {
    const decryptedItems = await Promise.all(
      data.map(async (item) => {
        const decrypted = { ...item };
        for (const fieldName of sensitiveFieldNames) {
          const fieldValue = decrypted[fieldName as keyof typeof decrypted];
          if (fieldValue && typeof fieldValue === 'string' && isEncryptedValue(fieldValue)) {
            try {
              const decryptedValue = await decryptSensitiveValue(fieldValue);
              if (decryptedValue !== null) {
                decrypted[fieldName as keyof typeof decrypted] = decryptedValue as any;
              }
            } catch (error) {
              console.error(`[RESPONSE_FILTER] Error decrypting field ${fieldName}:`, error);
              // Keep encrypted value if decryption fails
            }
          }
        }
        return decrypted;
      })
    );
    return decryptedItems as T;
  } else if (data && typeof data === 'object') {
    const decrypted = { ...data };
    for (const fieldName of sensitiveFieldNames) {
      const fieldValue = decrypted[fieldName as keyof typeof decrypted];
      if (fieldValue && typeof fieldValue === 'string' && isEncryptedValue(fieldValue)) {
        try {
          const decryptedValue = await decryptSensitiveValue(fieldValue);
          if (decryptedValue !== null) {
            decrypted[fieldName as keyof typeof decrypted] = decryptedValue as any;
          }
        } catch (error) {
          console.error(`[RESPONSE_FILTER] Error decrypting field ${fieldName}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }
    return decrypted as T;
  }

  return data;
}

