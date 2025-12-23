/**
 * Unit Resolver
 * 
 * Resolves unit expressions that may contain dynamic context variables
 * (e.g., "{{formData.currency.icon}}" or "kg")
 */

import { FormulaContext } from './formula-parser';
import { safeGetProperty, isPrototypePollutionKey } from '@/gradian-ui/shared/utils/security-utils';

/**
 * Resolve unit expression with dynamic context variables
 * Supports static units (e.g., "kg", "m²") and dynamic units (e.g., "{{formData.currency}}")
 * Returns the actual value which can be:
 * - String: for fixed units or text values
 * - Array: for picker field values like [{id, label, icon, color}]
 * - Object: for single picker field values like {id, label, icon, color}
 */
export function resolveUnit(
  unitExpression: string | undefined | null,
  context: FormulaContext
): string | any[] | any {
  if (!unitExpression || unitExpression.trim() === '') {
    return '';
  }

  // Check if it's a static unit (no variables)
  if (!unitExpression.includes('{{')) {
    return unitExpression;
  }

  // Match all variable patterns: {{context.field}} or {{context.field.property}}
  const variablePattern = /\{\{([^}]+)\}\}/g;
  let resolvedUnit: any = unitExpression;
  let match;

  while ((match = variablePattern.exec(unitExpression)) !== null) {
    const fullMatch = match[0]; // e.g., "{{formData.currency.icon}}"
    const content = match[1].trim(); // e.g., "formData.currency.icon"
    
    const parts = content.split('.');
    const contextKey = parts[0]; // e.g., "formData", "pageData"
    const fieldPath = parts.slice(1); // e.g., ["currency", "icon"]
    
    let value: any = null;

    try {
      switch (contextKey) {
        case 'formData': {
          if (context.formData && fieldPath.length > 0) {
            let nestedValue: any = context.formData;
            for (let i = 0; i < fieldPath.length; i++) {
              const part = fieldPath[i];
              if (isPrototypePollutionKey(part)) {
                value = null;
                break;
              }
              
              // Handle array access like [0]
              const arrayMatch = part.match(/^\[(\d+)\]$/);
              if (arrayMatch) {
                const index = parseInt(arrayMatch[1], 10);
                if (Array.isArray(nestedValue) && index >= 0 && index < nestedValue.length) {
                  nestedValue = nestedValue[index];
                } else {
                  nestedValue = undefined;
                  break;
                }
              } else {
                // Get the property from nestedValue first
                const propertyValue = safeGetProperty(nestedValue, part);
                
                // If this is the last part in the path, return the value as-is (could be array/object/string)
                if (i === fieldPath.length - 1) {
                  nestedValue = propertyValue;
                } else {
                  // For intermediate parts, handle arrays
                  // Handle picker field values: if propertyValue is an array (picker multi-select), use first item
                  if (Array.isArray(propertyValue) && propertyValue.length > 0) {
                    const firstItem = propertyValue[0];
                    if (typeof firstItem === 'object' && firstItem !== null) {
                      nestedValue = firstItem;
                    } else {
                      nestedValue = propertyValue;
                    }
                  } else {
                    nestedValue = propertyValue;
                  }
                }
              }
              
              if (nestedValue === undefined || nestedValue === null) {
                value = null;
                break;
              }
            }
            if (nestedValue !== undefined && nestedValue !== null) {
              value = nestedValue;
            }
          }
          break;
        }
        case 'pageData': {
          if (context.pageData && fieldPath.length > 0) {
            let nestedValue: any = context.pageData;
            for (const part of fieldPath) {
              if (isPrototypePollutionKey(part)) {
                value = null;
                break;
              }
              
              // Handle array access like [0]
              const arrayMatch = part.match(/^\[(\d+)\]$/);
              if (arrayMatch) {
                const index = parseInt(arrayMatch[1], 10);
                if (Array.isArray(nestedValue) && index >= 0 && index < nestedValue.length) {
                  nestedValue = nestedValue[index];
                } else {
                  nestedValue = undefined;
                  break;
                }
              } else {
                nestedValue = safeGetProperty(nestedValue, part);
              }
              
              if (nestedValue === undefined || nestedValue === null) {
                value = null;
                break;
              }
            }
            if (nestedValue !== undefined && nestedValue !== null) {
              value = nestedValue;
            }
          }
          break;
        }
        case 'userData': {
          if (context.userData && fieldPath.length > 0) {
            let nestedValue: any = context.userData;
            for (const part of fieldPath) {
              if (isPrototypePollutionKey(part)) {
                value = null;
                break;
              }
              
              // Handle array access like [0]
              const arrayMatch = part.match(/^\[(\d+)\]$/);
              if (arrayMatch) {
                const index = parseInt(arrayMatch[1], 10);
                if (Array.isArray(nestedValue) && index >= 0 && index < nestedValue.length) {
                  nestedValue = nestedValue[index];
                } else {
                  nestedValue = undefined;
                  break;
                }
              } else {
                nestedValue = safeGetProperty(nestedValue, part);
              }
              
              if (nestedValue === undefined || nestedValue === null) {
                value = null;
                break;
              }
            }
            if (nestedValue !== undefined && nestedValue !== null) {
              value = nestedValue;
            }
          }
          break;
        }
        case 'formSchema': {
          if (context.formSchema && fieldPath.length > 0) {
            let nestedValue: any = context.formSchema;
            for (const part of fieldPath) {
              if (isPrototypePollutionKey(part)) {
                value = null;
                break;
              }
              
              // Handle array access like [0]
              const arrayMatch = part.match(/^\[(\d+)\]$/);
              if (arrayMatch) {
                const index = parseInt(arrayMatch[1], 10);
                if (Array.isArray(nestedValue) && index >= 0 && index < nestedValue.length) {
                  nestedValue = nestedValue[index];
                } else {
                  nestedValue = undefined;
                  break;
                }
              } else {
                nestedValue = safeGetProperty(nestedValue, part);
              }
              
              if (nestedValue === undefined || nestedValue === null) {
                value = null;
                break;
              }
            }
            if (nestedValue !== undefined && nestedValue !== null) {
              value = nestedValue;
            }
          }
          break;
        }
      }

      // Replace the variable with its resolved value
      // If the entire expression is just one variable, return the actual value (could be array/object)
      if (unitExpression.trim() === fullMatch) {
        // If it's a single variable, return the actual value (not stringified)
        return value;
      }
      // Otherwise, replace in string
      const replacement = value !== null && value !== undefined ? String(value) : '';
      resolvedUnit = resolvedUnit.replace(fullMatch, replacement);
    } catch (error) {
      // If resolution fails, remove the variable (replace with empty string)
      resolvedUnit = resolvedUnit.replace(fullMatch, '');
    }
  }

  // If resolvedUnit is still a string, trim it
  if (typeof resolvedUnit === 'string') {
    return resolvedUnit.trim();
  }
  // Otherwise return as-is (could be array or object)
  return resolvedUnit;
}

