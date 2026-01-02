/**
 * Normalize arbitrary text by trimming, removing diacritics, collapsing whitespace,
 * and optionally lowercasing.
 */
export const cleanText = (input: string | null | undefined, options?: { lowercase?: boolean }): string => {
  if (!input) return '';
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  return options?.lowercase ? normalized.toLowerCase() : normalized;
};

const splitIntoWords = (input: string | null | undefined): string[] => {
  const cleaned = cleanText(input ?? '', { lowercase: true });
  if (!cleaned) return [];
  return cleaned
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .split(/[\s_-]+/)
    .filter(Boolean);
};

export const toKebabCase = (input: string | null | undefined): string =>
  splitIntoWords(input).join('-');

export const toSnakeCase = (input: string | null | undefined): string =>
  splitIntoWords(input).join('_');

export const toCamelCase = (input: string | null | undefined): string => {
  const words = splitIntoWords(input);
  if (words.length === 0) return '';
  return words
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('');
};

export const toPascalCase = (input: string | null | undefined): string =>
  splitIntoWords(input)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

/**
 * Format JSON for markdown code blocks with proper indentation
 * Ensures consistent 2-space indentation and removes any formatting inconsistencies
 * Handles escaped JSON strings (strings containing \n, \", etc.)
 * 
 * @param data - Data to format (object, array, or JSON string)
 * @returns Properly formatted JSON string with 2-space indentation
 */
export function formatJsonForMarkdown(data: any): string {
  try {
    // If it's a string, check if it contains escaped JSON (like "{\n\"key\": \"value\"}")
    if (typeof data === 'string') {
      const trimmed = data.trim();
      
      // Check if it's an escaped JSON string (starts with " and contains \n or \" but not actual newlines)
      const isEscapedJsonString = trimmed.startsWith('"') && 
                                  trimmed.endsWith('"') && 
                                  (trimmed.includes('\\n') || trimmed.includes('\\"') || trimmed.includes('\\t')) && 
                                  !trimmed.includes('\n');
      
      if (isEscapedJsonString) {
        // This is a JSON-encoded string, parse it to get the actual JSON string
        try {
          const unescapedJsonString = JSON.parse(trimmed);
          // If the result is still a string, parse it again to get the object
          if (typeof unescapedJsonString === 'string') {
            try {
              const parsed = JSON.parse(unescapedJsonString);
              return JSON.stringify(parsed, null, 2);
            } catch {
              // If second parse fails, the string might not be JSON, return formatted first parse
              return JSON.stringify(unescapedJsonString, null, 2);
            }
          }
          // Otherwise, format the parsed object
          return JSON.stringify(unescapedJsonString, null, 2);
        } catch {
          // If parsing fails, it might not be valid JSON, return as-is
          return data;
        }
      } else {
        // Regular JSON string (not escaped), try to parse and format
        try {
          const parsed = JSON.parse(trimmed);
          return JSON.stringify(parsed, null, 2);
        } catch {
          // If parsing fails, it might be a template or invalid JSON, return as-is
          return data;
        }
      }
    }
    
    // If it's already an object/array, just format it
    return JSON.stringify(data, null, 2);
  } catch (error) {
    // If all parsing fails, return as string
    return String(data);
  }
}

export const ensureKebabCase = (input: string | null | undefined, fallbackPrefix = 'section'): string => {
  const result = toKebabCase(input);
  if (result) {
    return result;
  }
  return `${fallbackPrefix}-${Date.now()}`;
};

/**
 * Format data in TOON format
 * Example output:
 * users[3]{id,name,email}:
 *   1,Alice,alice@example.com
 *   2,Bob,bob@example.com
 *   3,Charlie,charlie@example.com
 * 
 * @param entityName - Name of the entity/collection (e.g., "users", "schemas")
 * @param data - Array of objects to format
 * @param fields - Array of field names to include in the format
 * @returns Formatted TOON string
 */
export const formatToToon = (
  entityName: string | null | undefined,
  data: any[],
  fields: string[]
): string => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return '';
  }

  if (!fields || fields.length === 0) {
    return '';
  }

  const cleanEntityName = cleanText(entityName || 'items');
  const count = data.length;
  const fieldsList = fields.join(',');
  
  // Build header: {entityName}[{count}]{field1,field2,...}:
  const header = `${cleanEntityName}[${count}]{${fieldsList}}:`;
  
  // Build rows: each row is comma-separated values
  const rows = data.map((item: any) => {
    const values = fields.map((field) => {
      const value = item?.[field];
      // Clean the value and handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // Convert to string, clean, and replace commas with dashes to avoid conflicts
      return cleanText(String(value)).replace(/,/g, '-');
    });
    return `  ${values.join(',')}`;
  });
  
  return `${header}\n\n${rows.join('\n')}`;
};

/**
 * Formats a key name to a human-readable label
 * Examples:
 * - "nodeTypeId" -> "Node Type Id"
 * - "dateCreated" -> "Date Created"
 * - "riskLevel" -> "Risk Level"
 * - "top10ProductsPercent" -> "Top 10 Products Percent"
 * - "node_type_id" -> "Node Type Id"
 * - "node-type-id" -> "Node Type Id"
 */
export function formatKeyToLabel(key: string): string {
  if (!key) return '';
  
  // First, handle snake_case and kebab-case by replacing with spaces
  let processed = key.replace(/[_-]/g, ' ');
  
  // Split camelCase and PascalCase by detecting capital letters and numbers
  // Insert a space before capital letters and numbers (but not at the start)
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2'); // camelCase: lowercase followed by uppercase
  processed = processed.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'); // PascalCase: uppercase followed by uppercase+lowercase
  processed = processed.replace(/([a-zA-Z])(\d)/g, '$1 $2'); // Letter followed by number
  processed = processed.replace(/(\d)([a-zA-Z])/g, '$1 $2'); // Number followed by letter
  
  // Split by spaces and clean up
  const words = processed
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
  
  if (words.length === 0) return key;
  
  // Capitalize first letter of each word and join with spaces
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a value for display in a card
 * Handles various types: strings, numbers, booleans, dates, arrays, objects, null, undefined
 * Returns formatted string for simple display, or returns special marker for complex types
 */
export function formatValueForDisplay(value: any): { display: string; isComplex: boolean } {
  if (value === null) return { display: '—', isComplex: false };
  if (value === undefined) return { display: '—', isComplex: false };
  
  if (typeof value === 'boolean') {
    return { display: value ? 'Yes' : 'No', isComplex: false };
  }
  
  if (typeof value === 'number') {
    // Format numbers with locale-aware formatting (e.g., 1000 -> 1,000)
    return { display: value.toLocaleString('en-US'), isComplex: false };
  }
  
  if (typeof value === 'string') {
    // Check if it's a date string (ISO format or common date formats)
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Format as readable date
          return { 
            display: date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }), 
            isComplex: false 
          };
        }
      } catch {
        // Not a valid date, continue with string formatting
      }
    }
    
    // Empty string
    if (value.trim() === '') {
      return { display: '—', isComplex: false };
    }
    
    return { display: value, isComplex: false };
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return { display: '—', isComplex: false };
    
    // Check if array contains complex objects
    const hasComplexItems = value.some(item => typeof item === 'object' && item !== null);
    if (hasComplexItems) {
      return { display: '', isComplex: true };
    }
    
    // Format simple array items
    const display = value.map(item => {
      if (item === null || item === undefined) return '—';
      return String(item);
    }).join(', ');
    
    return { display, isComplex: false };
  }
  
  if (typeof value === 'object') {
    // Objects are always complex
    return { display: '', isComplex: true };
  }
  
  return { display: String(value), isComplex: false };
}
