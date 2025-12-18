// Password Processor Utility
// Automatically detects and hashes password fields based on component="password" or role="password"

import { hashPassword, HashType } from '@/domains/auth/utils/password.util';

/**
 * Get schema for a given schema ID
 */
async function getSchema(schemaId: string): Promise<any> {
  try {
    const { getSchemaById } = await import('@/gradian-ui/schema-manager/utils/schema-registry.server');
    return await getSchemaById(schemaId);
  } catch (error) {
    console.warn(`[PASSWORD] Could not load schema for ${schemaId}:`, error);
    return null;
  }
}

/**
 * Process entity data to hash password fields
 * Detects fields with component="password" or role="password" in the schema and hashes them
 * @param schemaId - The schema ID (e.g., "users", "databases")
 * @param data - The entity data to process
 * @param hashType - The hash type to use ("none" for clear text, "argon2" for hashing)
 * @returns Processed data with hashed passwords
 */
export async function processPasswordFields(
  schemaId: string,
  data: Record<string, any>,
  hashType: HashType = "argon2"
): Promise<Record<string, any>> {
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

  // Process each password field
  const processedData = { ...data };

  for (const field of passwordFields) {
    const fieldName = field.name;
    const passwordValue = processedData[fieldName];

    // Only hash if password is provided and not already hashed
    if (passwordValue && typeof passwordValue === 'string' && passwordValue.trim() !== '') {
      // Check if already hashed (starts with $argon2, $argon2i, or $argon2d)
      const isAlreadyHashed = 
        passwordValue.startsWith('$argon2id$') ||
        passwordValue.startsWith('$argon2i$') ||
        passwordValue.startsWith('$argon2d$');
      
      if (!isAlreadyHashed && hashType !== 'none') {
        try {
          // Hash the password
          const hashedPassword = await hashPassword(passwordValue, hashType);
          processedData[fieldName] = hashedPassword;
          
          // Set hashType on the entity if not already set
          if (!processedData.hashType) {
            processedData.hashType = hashType;
          }
          
          // Mark that password was successfully hashed
          processedData._passwordHashed = true;
        } catch (error) {
          console.error(`[PASSWORD] Error hashing password for field ${fieldName}:`, error);
          // If hashing fails (e.g., PEPPER missing), don't update the password
          // Remove the password from processed data so it's not updated
          delete processedData[fieldName];
          processedData._passwordHashFailed = true;
          processedData._passwordHashError = error instanceof Error ? error.message : String(error);
        }
      } else if (hashType === 'none') {
        // Keep as clear text if hashType is "none"
        processedData.hashType = 'none';
        processedData._passwordHashed = true; // Mark as processed
      } else if (isAlreadyHashed) {
        // Password is already hashed, keep it as is
        processedData._passwordHashed = true; // Mark as processed (no change needed)
      }
    }
  }

  return processedData;
}

