// Sort Utilities for Form Elements

export type SortType = 'ASC' | 'DESC' | null;

export interface SortableOption {
  id?: string;
  label?: string;
  name?: string;
  title?: string;
  value?: string;
  [key: string]: any;
}

/**
 * Sorts an array of options based on sortType
 * @param options - Array of options to sort
 * @param sortType - Sort direction: 'ASC' (ascending), 'DESC' (descending), or null (no sorting)
 * @param sortBy - Optional field name to sort by (defaults to 'label' or 'name' or 'title')
 * @returns Sorted array of options
 */
export function sortOptions<T extends SortableOption>(
  options: T[],
  sortType: SortType = null,
  sortBy?: string
): T[] {
  if (!sortType || !Array.isArray(options) || options.length === 0) {
    return options;
  }

  // Determine which field to sort by
  const getSortValue = (option: T): string => {
    if (sortBy && option[sortBy] !== undefined) {
      return String(option[sortBy] || '');
    }
    // Default: try label, name, title, or id in that order
    return String(
      option.label || 
      option.name || 
      option.title || 
      option.id || 
      ''
    ).toLowerCase();
  };

  // Create a copy to avoid mutating the original array
  const sorted = [...options];

  sorted.sort((a, b) => {
    const aValue = getSortValue(a);
    const bValue = getSortValue(b);
    
    const comparison = aValue.localeCompare(bValue, undefined, {
      numeric: true,
      sensitivity: 'base',
    });

    return sortType === 'ASC' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Sorts normalized options (from option-normalizer)
 * @param options - Array of normalized options
 * @param sortType - Sort direction: 'ASC' (ascending), 'DESC' (descending), or null (no sorting)
 * @returns Sorted array of normalized options
 */
export function sortNormalizedOptions<T extends { id?: string; label?: string }>(
  options: T[],
  sortType: SortType = null
): T[] {
  if (!sortType || !Array.isArray(options) || options.length === 0) {
    return options;
  }

  const sorted = [...options];

  sorted.sort((a, b) => {
    const aValue = String(a.label || a.id || '').toLowerCase();
    const bValue = String(b.label || b.id || '').toLowerCase();
    
    const comparison = aValue.localeCompare(bValue, undefined, {
      numeric: true,
      sensitivity: 'base',
    });

    return sortType === 'ASC' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Sort configuration for multi-sort
 */
export interface SortConfig {
  column: string;
  isAscending: boolean;
}

/**
 * Apply multiple sorts to an array
 * @param data - Array to sort
 * @param sortArray - Array of sort configurations: [{ column: string, isAscending: boolean }]
 * @returns Sorted array
 */
export function multiSort<T extends Record<string, any>>(
  data: T[],
  sortArray: SortConfig[]
): T[] {
  if (!sortArray || sortArray.length === 0) return data;

  const sorted = [...data];

  sorted.sort((a, b) => {
    for (const sort of sortArray) {
      const { column, isAscending } = sort;
      const aValue = a[column];
      const bValue = b[column];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) {
        if (bValue === null || bValue === undefined) continue;
        return 1;
      }
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      let comparison = 0;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === 'string' && typeof bValue === 'string' && 
                 !isNaN(Date.parse(aValue)) && !isNaN(Date.parse(bValue))) {
        // Try parsing as dates if both are date strings
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        comparison = aDate - bDate;
      } else {
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        comparison = aStr.localeCompare(bStr, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      // Apply sort direction
      if (comparison !== 0) {
        return isAscending ? comparison : -comparison;
      }
    }
    
    return 0; // All sort criteria are equal
  });

  return sorted;
}

/**
 * Parse sortArray from query parameter
 * Expected format: JSON array string: [{"column":"name","isAscending":true},{"column":"date","isAscending":false}]
 * Or URL-encoded format: sortArray=[("name",true),("date",false)]
 */
export function parseSortArray(
  sortArrayParam: string | null
): SortConfig[] | null {
  if (!sortArrayParam) return null;

  try {
    // Try parsing as JSON first
    const parsed = JSON.parse(sortArrayParam);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        column: item.column || item[0],
        isAscending: typeof item.isAscending === 'boolean' 
          ? item.isAscending 
          : item[1] === true || item[1] === 'true' || item[1] === 1
      })).filter(item => item.column);
    }
  } catch {
    // If JSON parsing fails, try custom format: [("column",true),("column2",false)]
    const matches = Array.from(sortArrayParam.matchAll(/\(([^,]+),([^)]+)\)/g));
    const result: SortConfig[] = [];
    
    for (const match of matches) {
      const column = match[1].trim().replace(/['"]/g, '');
      const isAscending = match[2].trim() === 'true' || match[2].trim() === '1';
      if (column) {
        result.push({ column, isAscending });
      }
    }
    
    return result.length > 0 ? result : null;
  }

  return null;
}

