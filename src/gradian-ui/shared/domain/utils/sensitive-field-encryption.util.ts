// Sensitive Field Encryption Utility
// Server-only utility for encrypting/decrypting sensitive field values using AES-GCM
// SERVER-ONLY: Uses Node.js crypto module

import "server-only";
import crypto from 'crypto';

const AES_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

/**
 * Get raw key material from environment variable
 */
function getRawKeyMaterial(): Buffer {
  const keySource = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

  if (!keySource) {
    throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY is not defined');
  }

  const sanitized = keySource.trim();
  const isHexString = /^[0-9a-fA-F]+$/.test(sanitized) && sanitized.length % 2 === 0;

  if (isHexString) {
    return Buffer.from(sanitized, 'hex');
  }

  return Buffer.from(sanitized, 'utf8');
}

/**
 * Derive encryption key from environment variable
 * Uses SHA-256 hash to ensure consistent key length (same as client-side)
 */
function deriveEncryptionKey(): Buffer {
  const rawMaterial = getRawKeyMaterial();
  return crypto.createHash('sha256').update(rawMaterial).digest();
}

/**
 * Encrypt a sensitive field value
 * @param value - Plain text value to encrypt
 * @returns JSON stringified EncryptedPayload or null if encryption fails
 */
export async function encryptSensitiveValue(value: string): Promise<string | null> {
  try {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const key = deriveEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
    
    let encrypted = cipher.update(value, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine encrypted data with auth tag
    const encryptedWithTag = Buffer.concat([encrypted, authTag]);
    
    const payload: EncryptedPayload = {
      ciphertext: encryptedWithTag.toString('base64'),
      iv: iv.toString('base64'),
    };
    
    return JSON.stringify(payload);
  } catch (error) {
    console.error('[SENSITIVE_FIELD] Encryption error:', error);
    return null;
  }
}

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

    const key = deriveEncryptionKey();
    const iv = Buffer.from(payload.iv, 'base64');
    const encryptedWithTag = Buffer.from(payload.ciphertext, 'base64');
    
    // Validate encrypted data length
    if (encryptedWithTag.length < TAG_LENGTH) {
      return null;
    }
    
    // Extract auth tag and encrypted data
    const encrypted = encryptedWithTag.slice(0, -TAG_LENGTH);
    const authTag = encryptedWithTag.slice(-TAG_LENGTH);
    
    // Validate auth tag length explicitly (GCM requires 16-byte tag)
    if (authTag.length !== TAG_LENGTH) {
      return null;
    }
    
    const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
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

