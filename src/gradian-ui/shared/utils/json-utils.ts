/**
 * JSON manipulation utilities
 */

/**
 * Common language codes used in multilingual objects
 */
const LANGUAGE_CODES = [
  'en', 'fa', 'ar', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
  'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'fi', 'no', 'cs', 'hu', 'ro', 'el',
  'he', 'th', 'vi', 'id', 'ms', 'uk', 'bg', 'hr', 'sk', 'sl', 'et', 'lv',
  'lt', 'mt', 'ga', 'cy', 'is', 'mk', 'sq', 'sr', 'bs', 'az', 'ka', 'hy',
  'be', 'kk', 'ky', 'uz', 'mn', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am',
  'sw', 'zu', 'af', 'eu', 'ca', 'gl', 'br', 'gd', 'lb', 'fy', 'yi', 'jv',
  'su', 'ceb', 'haw', 'co', 'ht', 'mg', 'ny', 'sm', 'st', 'tn', 'xh', 'yo',
];

/**
 * Check if an object is a multilingual object (has language keys like en, fa)
 * 
 * @param obj - The object to check
 * @returns true if the object appears to be multilingual
 * 
 * @example
 * isMultilingualObject({ en: "Hello", fa: "سلام" }) // true
 * isMultilingualObject({ name: "John", age: 30 }) // false
 */
export function isMultilingualObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return false;
  }
  
  // Check if at least one key is a language code
  return keys.some(key => LANGUAGE_CODES.includes(key.toLowerCase()));
}

/**
 * Get all language keys from multilingual objects in an array
 * 
 * @param items - Array of items to scan for multilingual objects
 * @returns Sorted array of unique language codes found
 * 
 * @example
 * getAllLanguageKeys([
 *   { label: { en: "A", fa: "B" } },
 *   { name: { en: "C", ar: "D" } }
 * ]) // ["ar", "en", "fa"]
 */
export function getAllLanguageKeys(items: any[]): string[] {
  const languageKeys = new Set<string>();
  
  items.forEach((item: any) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      Object.values(item).forEach((value: any) => {
        if (isMultilingualObject(value)) {
          Object.keys(value).forEach(lang => languageKeys.add(lang));
        }
      });
    }
  });
  
  return Array.from(languageKeys).sort();
}

/**
 * Expand multilingual objects into separate language fields
 * e.g., {label: {en: "A", fa: "B"}} becomes {label_en: "A", label_fa: "B"}
 * 
 * @param items - Array of items to expand
 * @param languageKeys - Array of language codes to expand (if not provided, will be detected)
 * @returns Array of items with multilingual fields expanded
 * 
 * @example
 * expandMultilingualFields([
 *   { id: "1", label: { en: "Hello", fa: "سلام" } }
 * ], ["en", "fa"])
 * // [{ id: "1", label_en: "Hello", label_fa: "سلام" }]
 */
export function expandMultilingualFields(
  items: any[],
  languageKeys?: string[]
): any[] {
  // Auto-detect language keys if not provided
  const detectedLanguageKeys = languageKeys || getAllLanguageKeys(items);
  
  if (detectedLanguageKeys.length === 0) {
    return items;
  }
  
  return items.map((item: any) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return item;
    }
    
    const expanded: any = {};
    
    for (const [key, value] of Object.entries(item)) {
      if (isMultilingualObject(value)) {
        // Expand multilingual object into separate fields
        for (const lang of detectedLanguageKeys) {
          expanded[`${key}_${lang}`] = (value as any)[lang] || '';
        }
      } else {
        // Keep non-multilingual fields as is
        expanded[key] = value;
      }
    }
    
    return expanded;
  });
}

