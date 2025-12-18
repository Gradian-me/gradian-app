/**
 * Route Handler Skip Key Decryption Utility
 * Decrypts skip_key from body or query parameter in route handlers if it's encrypted
 * This serves as a fallback if middleware doesn't handle it
 */

import { NextRequest } from 'next/server';
import { decryptSkipKey } from './decrypt-skip-key';

/**
 * Decrypt skip_key value if it appears to be encrypted
 * Returns the decrypted value if successful, or the original value if not encrypted
 * Handles both objects (from request body) and strings (from query params)
 */
export async function decryptSkipKeyValue(skipKeyValue: string | Record<string, string>): Promise<string | null> {
  if (!skipKeyValue) {
    return null;
  }
  
  // If it's already an object (from request body), use it directly
  if (typeof skipKeyValue === 'object' && skipKeyValue !== null) {
    if (skipKeyValue.ciphertext && skipKeyValue.iv) {
      // It's an encrypted payload object, convert to JSON string and decrypt
      const jsonString = JSON.stringify(skipKeyValue);
      const decrypted = await decryptSkipKey(jsonString);
      return decrypted;
    }
    // Not an encrypted payload object
    console.warn('[decryptSkipKeyValue] Object provided but missing ciphertext or iv');
    return null;
  }
  
  // If it's a string, try to parse it (could be JSON string or URL-encoded)
  if (typeof skipKeyValue !== 'string') {
    return null;
  }
  
  // Check if it looks like an encrypted payload (JSON object string)
  let parsed: any = null;
  
  try {
    // First try parsing directly (for raw JSON strings from request body)
    parsed = JSON.parse(skipKeyValue);
  } catch {
    try {
      // If that fails, try decoding URI component first (for URL-encoded from query params)
      const decoded = decodeURIComponent(skipKeyValue);
      parsed = JSON.parse(decoded);
    } catch {
      // Not JSON, probably plain text (already decrypted or not encrypted)
      return skipKeyValue;
    }
  }
  
  // If we successfully parsed it and it has the encrypted payload structure, decrypt it
  if (parsed && typeof parsed === 'object' && parsed.ciphertext && parsed.iv) {
    // It's encrypted, decrypt it
    // decryptSkipKey handles both URL-encoded and raw strings
    return await decryptSkipKey(skipKeyValue);
  }
  
  // Return as-is if not encrypted
  return skipKeyValue;
}

/**
 * Decrypt skip_key from request (checks query params)
 * Returns the decrypted value if successful, or the original value if not encrypted
 * Handles both objects (from request body) and strings (from query params)
 */
export async function decryptSkipKeyFromRequest(
  request: NextRequest, 
  skipKeyValue?: string | Record<string, string>
): Promise<string | null> {
  // If skipKeyValue is provided (from body), use it
  if (skipKeyValue) {
    return await decryptSkipKeyValue(skipKeyValue);
  }
  
  // Otherwise, check query parameters
  const { searchParams } = new URL(request.url);
  const skipKey = searchParams.get('skip_key');
  
  if (!skipKey) {
    return null;
  }
  
  return await decryptSkipKeyValue(skipKey);
}

