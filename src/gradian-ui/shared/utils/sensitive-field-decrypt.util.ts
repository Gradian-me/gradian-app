// Sensitive Field Decryption Utility
// Frontend utility for decrypting sensitive field values

import { decryptPayload, EncryptedPayload } from '@/gradian-ui/indexdb-manager/utils/crypto';

/**
 * Decrypt a sensitive field value
 * @param encryptedJson - JSON stringified EncryptedPayload
 * @returns Decrypted plain text value or null if decryption fails
 */
export async function decryptSensitiveValue(encryptedJson: string): Promise<string | null> {
  try {
    if (!encryptedJson || typeof encryptedJson !== 'string') {
      return null;
    }

    const payload: EncryptedPayload = JSON.parse(encryptedJson);
    
    if (!payload.ciphertext || !payload.iv) {
      return null;
    }

    const decrypted = await decryptPayload<string>(payload);
    return decrypted;
  } catch (error) {
    console.error('[SENSITIVE_FIELD] Decryption error:', error);
    return null;
  }
}

/**
 * Check if a value is already encrypted (has the encrypted payload structure)
 */
export function isEncryptedValue(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  try {
    const parsed = JSON.parse(value);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.ciphertext === 'string' &&
      typeof parsed.iv === 'string'
    );
  } catch {
    return false;
  }
}

