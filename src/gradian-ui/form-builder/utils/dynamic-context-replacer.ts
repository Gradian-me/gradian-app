import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { safeGetProperty, isPrototypePollutionKey } from '@/gradian-ui/shared/utils/security-utils';

/**
 * Extract a value from the dynamic form context using dot-notation path
 * Supports array access like [0] in the path
 * Returns the raw value (not URI-encoded)
 * 
 * @param contextKey - The context key: 'formSchema', 'formData', or 'userData'
 * @param path - Dot-notation path with optional array access, e.g., 'statusGroup.[0].id'
 * @param data - Optional data object to use instead of context store
 * @returns The extracted value as a string, or empty string if not found
 * 
 * @example
 * extractValueFromContext('formSchema', 'statusGroup.[0].id')
 * extractValueFromContext('formData', 'status.id')
 * extractValueFromContext('userData', 'email')
 */
export function extractValueFromContext(
  contextKey: 'formSchema' | 'formData' | 'userData' | 'referenceData',
  path: string,
  data?: {
    formSchema?: any;
    formData?: any;
    userData?: any;
    referenceData?: any;
  }
): string {
  // Use provided data or fall back to context store
  const source = data?.[contextKey] ?? useDynamicFormContextStore.getState()[contextKey];
  
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
  
  // Convert to string (not URI-encoded)
  return current !== null && current !== undefined ? String(current) : '';
}

/**
 * Replace dynamic context variables in a string
 * Supports variables in the format: {{contextKey.path}}
 * 
 * @param template - String template with variables like {{formData.id}} or {{formSchema.name}}
 * @param data - Optional data object to use instead of context store (for testing or custom data)
 * @returns String with all variables replaced
 * 
 * @example
 * replaceDynamicContext('/api/data/vendors?id={{formData.id}}')
 * replaceDynamicContext('/api/data/{{formSchema.id}}/{{formData.id}}')
 * replaceDynamicContext('User: {{userData.email}}')
 */
export function replaceDynamicContext(
  template: string,
  data?: {
    formSchema?: any;
    formData?: any;
    userData?: any;
    referenceData?: any;
  }
): string {
  if (!template || typeof template !== 'string') {
    return template || '';
  }

  // Get context from store or use provided data
  const context = data || {
    formSchema: useDynamicFormContextStore.getState().formSchema,
    formData: useDynamicFormContextStore.getState().formData,
    userData: useDynamicFormContextStore.getState().userData,
    referenceData: useDynamicFormContextStore.getState().referenceData,
  };

  // Match variables in format {{contextKey.path}}
  const variablePattern = /\{\{(\w+)\.([^}]+)\}\}/g;
  
  return template.replace(variablePattern, (match, contextKey, path) => {
    // Validate context key
    if (!['formSchema', 'formData', 'userData', 'referenceData'].includes(contextKey)) {
      console.warn(`Invalid context key in template: ${contextKey}`);
      return match; // Return original if invalid
    }

    // Extract value from context (pass data parameter if provided)
    const value = extractValueFromContext(
      contextKey as 'formSchema' | 'formData' | 'userData' | 'referenceData',
      path.trim(),
      data
    );

    return value || match; // Return value or original if not found
  });
}

/**
 * Replace dynamic context variables in an object recursively
 * Useful for replacing variables in nested objects like preloadRoutes
 * 
 * @param obj - Object to process (can be nested)
 * @param data - Optional data object to use instead of context store
 * @returns New object with all string values processed
 * 
 * @example
 * replaceDynamicContextInObject({
 *   route: '/api/data/vendors?id={{formData.id}}',
 *   queryParameters: {
 *     schema: 'vendors',
 *     id: '{{formData.id}}'
 *   }
 * })
 */
export function replaceDynamicContextInObject<T>(
  obj: T,
  data?: {
    formSchema?: any;
    formData?: any;
    userData?: any;
  }
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return replaceDynamicContext(obj, data) as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => replaceDynamicContextInObject(item, data)) as T;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceDynamicContextInObject(value, data);
    }
    return result as T;
  }

  // Return primitive values as-is
  return obj;
}

