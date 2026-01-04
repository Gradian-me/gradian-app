import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { safeGetProperty, isPrototypePollutionKey } from '@/gradian-ui/shared/utils/security-utils';

/**
 * Get page data (URL, query parameters, etc.) from browser
 * Only works in browser environment
 */
function getPageData(): {
  host?: string;
  hostname?: string;
  origin?: string;
  pathname?: string;
  query?: Record<string, string>;
} {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const url = new URL(window.location.href);
    const query: Record<string, string> = {};
    
    // Extract all query parameters
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    return {
      host: url.host,
      hostname: url.hostname,
      origin: url.origin,
      pathname: url.pathname,
      query,
    };
  } catch (error) {
    console.warn('Failed to get page data:', error);
    return {};
  }
}

/**
 * Extract a value from the dynamic form context using dot-notation path
 * Supports array access like [0] in the path
 * Returns the raw value (not URI-encoded)
 * 
 * @param contextKey - The context key: 'formSchema', 'formData', 'userData', 'referenceData', or 'pageData'
 * @param path - Dot-notation path with optional array access, e.g., 'statusGroup.[0].id', 'query.inquiry_id'
 * @param data - Optional data object to use instead of context store
 * @returns The extracted value as a string, or empty string if not found
 * 
 * @example
 * extractValueFromContext('formSchema', 'statusGroup.[0].id')
 * extractValueFromContext('formData', 'status.id')
 * extractValueFromContext('userData', 'email')
 * extractValueFromContext('pageData', 'query.inquiry_id')
 * extractValueFromContext('pageData', 'host')
 */
export function extractValueFromContext(
  contextKey: 'formSchema' | 'formData' | 'userData' | 'referenceData' | 'pageData',
  path: string,
  data?: {
    formSchema?: any;
    formData?: any;
    userData?: any;
    referenceData?: any;
    pageData?: any;
  }
): string {
  // Special handling for pageData - get from browser if not provided
  let source: any;
  if (contextKey === 'pageData') {
    source = data?.pageData ?? getPageData();
  } else {
    source = data?.[contextKey] ?? useDynamicFormContextStore.getState()[contextKey];
  }
  
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
  // Handle objects by extracting 'id' property if it exists (common for picker/select values)
  if (current !== null && current !== undefined) {
    // Check if it's an array first (arrays are objects in JS)
    if (Array.isArray(current)) {
      // If it's an array, try to extract id from first element
      if (current.length > 0) {
        const first = current[0];
        if (typeof first === 'object' && first !== null) {
          if ('id' in first && first.id !== undefined && first.id !== null) {
            return String(first.id);
          }
          if ('value' in first && first.value !== undefined && first.value !== null) {
            return String(first.value);
          }
        } else if (first !== undefined && first !== null) {
          return String(first);
        }
      }
      return '';
    }
    
    // If it's an object (but not an array), try to extract 'id' or 'value' property
    if (typeof current === 'object') {
      // Try to extract 'id' property (common pattern for picker/select values)
      if ('id' in current && current.id !== undefined && current.id !== null) {
        return String(current.id);
      }
      // If no 'id' property, try 'value' property as fallback
      if ('value' in current && current.value !== undefined && current.value !== null) {
        return String(current.value);
      }
    }
    
    // Fallback to string conversion
    return String(current);
  }
  return '';
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
 * replaceDynamicContext('/api/data/inquiries?id={{pageData.query.inquiry_id}}')
 * replaceDynamicContext('Host: {{pageData.host}}')
 */
export function replaceDynamicContext(
  template: string,
  data?: {
    formSchema?: any;
    formData?: any;
    userData?: any;
    referenceData?: any;
    pageData?: any;
  }
): string {
  if (!template || typeof template !== 'string') {
    return template || '';
  }

  // Get context from store or use provided data
  // For pageData, always get fresh from browser unless explicitly provided
  const context = data || {
    formSchema: useDynamicFormContextStore.getState().formSchema,
    formData: useDynamicFormContextStore.getState().formData,
    userData: useDynamicFormContextStore.getState().userData,
    referenceData: useDynamicFormContextStore.getState().referenceData,
    // pageData is always fetched fresh from browser, so don't store it
  };

  // Match variables in format {{contextKey.path}}
  const variablePattern = /\{\{(\w+)\.([^}]+)\}\}/g;
  
  return template.replace(variablePattern, (match, contextKey, path) => {
    // Validate context key
    if (!['formSchema', 'formData', 'userData', 'referenceData', 'pageData'].includes(contextKey)) {
      console.warn(`Invalid context key in template: ${contextKey}`);
      return match; // Return original if invalid
    }

    // Extract value from context (pass data parameter if provided)
    const value = extractValueFromContext(
      contextKey as 'formSchema' | 'formData' | 'userData' | 'referenceData' | 'pageData',
      path.trim(),
      data || context
    );

    // Return value if found (even if empty string), otherwise return original match
    // Use !== '' to distinguish between empty string (valid value) and not found (returns '' from extractValueFromContext)
    // However, if value is empty string, we should still return it (to clear the template)
    // But in practice, if value is empty, we probably want to keep the template
    // So we return value if it's not empty, otherwise return match
    return value !== '' ? value : match; // Return value if found, otherwise return original template
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
    referenceData?: any;
    pageData?: any;
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

