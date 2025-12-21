import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { safeGetProperty, isPrototypePollutionKey } from '@/gradian-ui/shared/utils/security-utils';

/**
 * Extract a value from the dynamic form context using dot-notation path
 * Supports array access like [0] in the path
 * Automatically converts to string and URI-encodes the result
 * 
 * @param contextKey - The context key: 'formSchema', 'formData', or 'userData'
 * @param path - Dot-notation path with optional array access, e.g., 'statusGroup.[0].id'
 * @returns The extracted value as a URI-encoded string, or empty string if not found
 * 
 * @example
 * extractFromDynamicContext('formSchema', 'statusGroup.[0].id')
 * extractFromDynamicContext('formData', 'status.id')
 * extractFromDynamicContext('userData', 'email')
 */
export function extractFromDynamicContext(
  contextKey: 'formSchema' | 'formData' | 'userData',
  path: string
): string {
  const context = useDynamicFormContextStore.getState();
  const source = context[contextKey];
  
  if (!source) {
    return '';
  }
  
  // Parse the path, handling array access like [0]
  const parts = path.split('.').filter(Boolean);
  let current: any = source;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return '';
    }
    
    // SECURITY: Prevent prototype pollution using security utility
    if (isPrototypePollutionKey(part)) {
      return '';
    }
    
    const arrayMatch = part.match(/^\[(\d+)\]$/);
    if (arrayMatch) {
      const index = parseInt(arrayMatch[1], 10);
      if (Array.isArray(current) && index >= 0 && index < current.length) {
        current = current[index];
      } else {
        return '';
      }
    } else {
      // SECURITY: Use safe property access from security utility
      current = safeGetProperty(current, part);
      if (current === undefined) {
        return '';
      }
    }
  }
  
  // Convert to string and URI-encode
  const value = current !== null && current !== undefined ? String(current) : '';
  return encodeURIComponent(value);
}

