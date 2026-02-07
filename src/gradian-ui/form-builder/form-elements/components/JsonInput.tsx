// JSON Input Component
// Displays JSON in a textarea for editing, but stores as actual JSON object/array

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { TextareaProps, FormElementRef } from '../types';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses } from '../utils/field-styles';
import { CopyContent } from './CopyContent';
import { scrollInputIntoView } from '@/gradian-ui/shared/utils/dom-utils';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { isPrototypePollutionKey, safeObjectKeys } from '@/gradian-ui/shared/utils/security-utils';

export interface JsonInputProps extends Omit<TextareaProps, 'value' | 'onChange'> {
  value?: any; // Can be object, array, or string (will be parsed)
  onChange?: (value: any) => void; // Returns parsed JSON object/array, not string
  rows?: number;
  cols?: number;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  canCopy?: boolean;
}

// Security constants
const MAX_JSON_SIZE = 5 * 1024 * 1024; // 5MB max JSON size
const MAX_JSON_DEPTH = 50; // Maximum nesting depth
const MAX_JSON_STRING_LENGTH = 10 * 1024 * 1024; // 10MB max string length for textarea

/**
 * SECURITY: Safely parse JSON with size and depth limits, and prototype pollution protection
 */
function safeJsonParse(jsonString: string): { success: boolean; data?: any; error?: string } {
  if (!jsonString || typeof jsonString !== 'string') {
    return { success: false, error: 'Invalid JSON string' };
  }

  // SECURITY: Check size before parsing to prevent DoS attacks
  const sizeInBytes = new Blob([jsonString]).size;
  if (sizeInBytes > MAX_JSON_SIZE) {
    return {
      success: false,
      error: `JSON size exceeds maximum allowed size of ${Math.floor(MAX_JSON_SIZE / (1024 * 1024))}MB`,
    };
  }

  // SECURITY: Check string length to prevent extremely long strings
  if (jsonString.length > MAX_JSON_STRING_LENGTH) {
    return {
      success: false,
      error: `JSON string length exceeds maximum allowed length`,
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    
    // SECURITY: Sanitize parsed object to remove prototype pollution keys
    const sanitized = sanitizeJsonObject(parsed, 0);
    
    return { success: true, data: sanitized };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON format',
    };
  }
}

/**
 * SECURITY: Sanitize JSON object to prevent prototype pollution and limit depth
 */
function sanitizeJsonObject(obj: any, depth: number): any {
  // SECURITY: Prevent excessive nesting depth
  if (depth > MAX_JSON_DEPTH) {
    throw new Error(`Maximum JSON depth of ${MAX_JSON_DEPTH} exceeded`);
  }

  // Handle null/undefined/primitives
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // SECURITY: Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeJsonObject(item, depth + 1));
  }

  // SECURITY: Handle objects - filter out prototype pollution keys
  const sanitized: Record<string, any> = {};
  const keys = safeObjectKeys(obj); // Uses security utility to filter prototype pollution keys
  
  for (const key of keys) {
    // SECURITY: Double-check for prototype pollution keys (defense in depth)
    if (isPrototypePollutionKey(key)) {
      continue; // Skip prototype pollution keys
    }
    
    try {
      sanitized[key] = sanitizeJsonObject(obj[key], depth + 1);
    } catch (err) {
      // If sanitization fails (e.g., depth exceeded), skip this property
      continue;
    }
  }

  return sanitized;
}

/**
 * SECURITY: Safely stringify JSON with circular reference protection
 */
function safeJsonStringify(value: any): string {
  try {
    // SECURITY: Use a replacer function to prevent circular references and filter prototype pollution
    const seen = new WeakSet();
    const replacer = (key: string, val: any): any => {
      // SECURITY: Filter prototype pollution keys
      if (isPrototypePollutionKey(key)) {
        return undefined; // Remove prototype pollution keys
      }

      // SECURITY: Handle circular references
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular Reference]';
        }
        seen.add(val);
      }

      return val;
    };

    return JSON.stringify(value, replacer, 2);
  } catch (err) {
    // SECURITY: If stringification fails, return safe error message
    return '{}';
  }
}

export const JsonInput = forwardRef<FormElementRef, JsonInputProps>(
  (
    {
      config,
      value,
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      required = false,
      rows = 12,
      cols,
      resize = 'vertical',
      className,
      touched,
      canCopy = false,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [jsonString, setJsonString] = useState<string>('');
    const [parseError, setParseError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Convert value (object/array/string) to formatted JSON string for display
    useEffect(() => {
      if (!isFocused) {
        // Only update display when not focused (to avoid cursor jumping)
        try {
          if (value === null || value === undefined || value === '') {
            setJsonString('');
            setParseError(null);
          } else if (typeof value === 'string') {
            // SECURITY: If it's already a string, use safe JSON parse
            const parseResult = safeJsonParse(value);
            if (parseResult.success && parseResult.data !== undefined) {
              setJsonString(safeJsonStringify(parseResult.data));
              setParseError(null);
            } else {
              // If parsing fails, it might be a non-JSON string, show as-is
              setJsonString(value);
              setParseError(parseResult.error || 'Invalid JSON format');
            }
          } else {
            // SECURITY: It's an object or array, use safe stringify
            setJsonString(safeJsonStringify(value));
            setParseError(null);
          }
        } catch (err) {
          setJsonString('{}');
          setParseError(err instanceof Error ? err.message : 'Failed to stringify value');
        }
      }
    }, [value, isFocused]);

    // Validate JSON and apply custom validation rules
    // Only show validation errors after user has interacted with the field
    useEffect(() => {
      // Don't validate until field is touched (user has interacted)
      if (!touched) {
        setValidationError(null);
        return;
      }

      // First check for JSON parse errors (always show these)
      if (parseError) {
        setValidationError(parseError);
        return;
      }

      // If JSON is valid, apply custom validation rules
      if (config.validation) {
        // Check required first
        if (config.validation.required) {
          const isEmpty = value === undefined || 
                        value === null || 
                        value === '' ||
                        (Array.isArray(value) && value.length === 0) ||
                        (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);
          if (isEmpty) {
            setValidationError('This field is required');
            return;
          }
        }

        // Apply other validation rules if value exists
        if (value !== undefined && value !== null && value !== '') {
          const result = validateField(value, config.validation);
          if (!result.isValid) {
            setValidationError(result.error || 'Invalid value');
          } else {
            setValidationError(null);
          }
        } else {
          setValidationError(null);
        }
      } else {
        setValidationError(null);
      }
    }, [value, parseError, config.validation, touched]);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      validate: () => {
        // First check JSON syntax
        if (parseError) {
          return false;
        }

        // Then check custom validation rules
        if (!config.validation) {
          return true;
        }

        // For required validation, check if value is empty
        if (config.validation.required) {
          const isEmpty = value === undefined || 
                        value === null || 
                        value === '' ||
                        (Array.isArray(value) && value.length === 0) ||
                        (typeof value === 'object' && Object.keys(value).length === 0);
          if (isEmpty) {
            return false;
          }
        }

        // Apply other validation rules
        const result = validateField(value, config.validation);
        return result.isValid;
      },
      reset: () => {
        setJsonString('');
        setParseError(null);
        setValidationError(null);
        onChange?.(undefined);
      },
      getValue: () => value,
      setValue: (newValue) => {
        // This will trigger the useEffect to update jsonString
        onChange?.(newValue);
      },
    }));

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newString = e.target.value;
      
      // SECURITY: Limit input length to prevent DoS attacks
      if (newString.length > MAX_JSON_STRING_LENGTH) {
        setParseError(`Input exceeds maximum length of ${MAX_JSON_STRING_LENGTH} characters`);
        return;
      }
      
      setJsonString(newString);
      
      // Try to parse the JSON
      if (newString.trim() === '') {
        setParseError(null);
        onChange?.(undefined);
        return;
      }

      // SECURITY: Use safe JSON parse with size and depth limits
      const parseResult = safeJsonParse(newString);
      if (parseResult.success && parseResult.data !== undefined) {
        setParseError(null);
        // SECURITY: Store sanitized JSON object/array, not string
        onChange?.(parseResult.data);
      } else {
        // Invalid JSON, but keep the string for editing
        setParseError(parseResult.error || 'Invalid JSON');
        // Don't call onChange with invalid JSON - let user fix it
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Trigger validation on blur if not already validated
      if (config.validation && value !== undefined) {
        if (parseError) {
          setValidationError(parseError);
        } else {
          const result = validateField(value, config.validation);
          if (!result.isValid) {
            setValidationError(result.error || 'Invalid value');
          }
        }
      }
      onBlur?.();
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      scrollInputIntoView(e.currentTarget, { delay: 100 });
      onFocus?.();
    };

    const textareaClasses = cn(
      'w-full direction-auto px-3 py-2 border rounded-lg border-gray-300 bg-white text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors font-mono',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500',
      'dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300',
      (error || parseError || validationError)
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      resize === 'none' && 'resize-none',
      resize === 'horizontal' && 'resize-x',
      resize === 'vertical' && 'resize-y',
      resize === 'both' && 'resize',
      className
    );

    const displayError = error || parseError || validationError;
    
    // Determine if JSON is valid (no parse error and no validation error, and has content)
    const isValidJson = jsonString.trim() !== '' && !parseError && !validationError && value !== undefined && value !== null;

    return (
      <div className="w-full">
        {(config.label || (canCopy && jsonString) || jsonString.trim() !== '') && (
          <div className="flex items-center justify-between mb-1">
            {config.label ? (
              <label
                htmlFor={config.name}
                dir="auto"
                className={getLabelClasses({ error: Boolean(displayError), required })}
              >
                {config.label}
              </label>
            ) : (
              <div></div>
            )}
            <div className="flex items-center gap-2">
              {/* Validation Status Indicator */}
              {jsonString.trim() !== '' && (
                <div className={cn(
                  "flex items-center gap-1.5 text-xs",
                  isValidJson 
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {isValidJson ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Valid</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>Invalid</span>
                    </>
                  )}
                </div>
              )}
              {canCopy && jsonString && (
                <CopyContent content={jsonString} />
              )}
            </div>
          </div>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={config.name}
            name={config.name}
            value={jsonString}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholder={config.placeholder || 'Enter JSON (object or array)...'}
            rows={rows}
            cols={cols}
            maxLength={MAX_JSON_STRING_LENGTH}
            required={required ?? config.validation?.required ?? false}
            disabled={disabled}
            className={textareaClasses}
            dir="ltr"
            spellCheck={false}
            {...props}
          />
        </div>
        {displayError && (
          <div className="mt-1 flex items-start gap-1.5">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {displayError}
            </p>
          </div>
        )}
        {config.description && !displayError && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {config.description}
          </p>
        )}
      </div>
    );
  }
);

JsonInput.displayName = 'JsonInput';

