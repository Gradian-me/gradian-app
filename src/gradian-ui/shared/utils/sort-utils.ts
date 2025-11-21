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

