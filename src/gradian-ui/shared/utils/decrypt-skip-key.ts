/**
 * Decrypt Skip Key Utility
 * Edge-compatible utility to decrypt skip_key query parameter
 */

import type { EncryptedPayload } from '@/gradian-ui/indexdb-manager/utils/crypto';

const AES_ALGO = 'AES-GCM';
const IV_LENGTH = 12;

/**
 * Edge-compatible: Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // In Edge runtime, atob is available globally (not on window)
  const atobFunc = typeof atob !== 'undefined' ? atob : 
                   (typeof globalThis !== 'undefined' && (globalThis as any).atob) ?
                   (globalThis as any).atob : null;
  
  if (!atobFunc) {
    throw new Error('atob is not available');
  }
  
  const binary = atobFunc(base64);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes.buffer;
}

/**
 * Edge-compatible: Check if crypto is available
 */
function hasCrypto(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

/**
 * Edge-compatible: Get raw key material from environment
 */
function getRawKeyMaterial(): ArrayBuffer {
  const keySource = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';
  
  if (!keySource) {
    throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY is not defined');
  }
  
  const sanitized = keySource.trim();
  const isHexString = /^[0-9a-fA-F]+$/.test(sanitized) && sanitized.length % 2 === 0;
  
  if (isHexString) {
    const bytes = new Uint8Array(sanitized.length / 2);
    for (let i = 0; i < sanitized.length; i += 2) {
      bytes[i / 2] = parseInt(sanitized.slice(i, i + 2), 16);
    }
    return bytes.buffer;
  }
  
  const encoder = new TextEncoder();
  return encoder.encode(sanitized).buffer;
}

/**
 * Edge-compatible: Get crypto key for decryption
 */
async function getCryptoKey(): Promise<CryptoKey | null> {
  if (!hasCrypto()) {
    return null;
  }
  
  try {
    const rawMaterial = getRawKeyMaterial();
    const hashedMaterial = await crypto.subtle.digest('SHA-256', rawMaterial);
    return crypto.subtle.importKey('raw', hashedMaterial, AES_ALGO, false, ['decrypt']);
  } catch (error) {
    console.warn('[decrypt-skip-key] Failed to import crypto key:', error);
    return null;
  }
}

/**
 * Decrypt an encrypted skip key
 * Used in middleware to decrypt skip_key before it reaches the route handler
 * Edge-compatible version
 * Handles both URL-encoded strings (from query params) and raw JSON strings (from request body)
 */
export async function decryptSkipKey(encryptedSkipKey: string): Promise<string | null> {
  if (!hasCrypto()) {
    console.error('[decrypt-skip-key] Crypto API not available');
    return null;
  }
  
  try {
    // Try to decode URI component first (for query params)
    // If it fails or if it's already a raw JSON string, use it as-is
    let decoded: string;
    try {
      decoded = decodeURIComponent(encryptedSkipKey);
    } catch {
      // Not URL-encoded, use as-is (from request body)
      decoded = encryptedSkipKey;
    }
    
    // Parse the encrypted payload
    const encrypted: EncryptedPayload = JSON.parse(decoded);
    
    // Get crypto key
    const key = await getCryptoKey();
    if (!key) {
      return null;
    }
    
    // Decode IV and ciphertext from base64
    const ivBuffer = base64ToArrayBuffer(encrypted.iv);
    const cipherBuffer = base64ToArrayBuffer(encrypted.ciphertext);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: AES_ALGO,
        iv: new Uint8Array(ivBuffer),
      },
      key,
      cipherBuffer
    );
    
    // Convert decrypted ArrayBuffer to string
    const decoder = new TextDecoder();
    let decryptedString = decoder.decode(decrypted);
    
    // Remove surrounding quotes if present (JSON string encoding artifact)
    // Check if the string starts and ends with quotes
    if (decryptedString.length >= 2 && decryptedString[0] === '"' && decryptedString[decryptedString.length - 1] === '"') {
      try {
        // Try to parse as JSON string to remove quotes
        decryptedString = JSON.parse(decryptedString);
      } catch {
        // If parsing fails, just remove the quotes manually
        decryptedString = decryptedString.slice(1, -1);
      }
    }
    
    return decryptedString;
  } catch (error) {
    console.error('[decrypt-skip-key] Failed to decrypt skip key:', error);
    if (error instanceof Error) {
      console.error('[decrypt-skip-key] Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    return null;
  }
}

