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
      // Convert to string and clean
      return cleanText(String(value));
    });
    return `  ${values.join(',')}`;
  });
  
  return `${header}\n\n${rows.join('\n')}`;
};
