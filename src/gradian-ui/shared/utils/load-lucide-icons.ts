import { LUCIDE_ICON_LIBRARY_ITEMS, LucideIconLibraryItem } from '@/gradian-ui/shared/constants/lucide-icon-library';
import { NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';

let cachedLucideIcons: LucideIconLibraryItem[] | null = null;
let cachedLucideOptions: NormalizedOption[] | null = null;

const EXCLUDED_EXPORTS = new Set([
  'default',
  'createLucideIcon',
  'iconNode',
  'icons',
  'LucideIcon',
]);

const toReadableLabel = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();

const isIconExport = (value: unknown): boolean => {
  if (typeof value === 'function') {
    return true;
  }
  if (value && typeof value === 'object' && '$$typeof' in (value as Record<string, unknown>)) {
    return true;
  }
  return false;
};

const buildRuntimeIconLibrary = (): LucideIconLibraryItem[] => {
  try {
    const LucideIcons = require('lucide-react');
    const seen = new Set<string>();
    return Object.keys(LucideIcons)
      .filter((key) => {
        if (EXCLUDED_EXPORTS.has(key) || key.endsWith('Icon')) {
          return false;
        }
        if (!isIconExport(LucideIcons[key])) {
          return false;
        }
        const normalized = key.toLowerCase();
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      })
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        id: name,
        label: toReadableLabel(name),
        icon: name,
      }));
  } catch (error) {
    console.error('Failed to build Lucide icon library at runtime', error);
    return [];
  }
};

const resolveIconLibrary = (): LucideIconLibraryItem[] => {
  if (LUCIDE_ICON_LIBRARY_ITEMS.length > 0) {
    return LUCIDE_ICON_LIBRARY_ITEMS;
  }
  return buildRuntimeIconLibrary();
};

/**
 * Returns all Lucide icons exposed by the `lucide-react` package.
 * Results are cached in-memory so repeated consumers avoid rebuilding the list.
 */
export const loadLucideIcons = (): LucideIconLibraryItem[] => {
  if (!cachedLucideIcons) {
    cachedLucideIcons = [...resolveIconLibrary()];
  }
  return cachedLucideIcons;
};

/**
 * Convenience helper that returns normalized option objects,
 * suitable for components like `PopupPicker`.
 */
export const loadLucideIconOptions = (): NormalizedOption[] => {
  if (!cachedLucideOptions) {
    cachedLucideOptions = loadLucideIcons().map((icon) => ({
      id: icon.id,
      label: icon.label,
      icon: icon.icon,
    }));
  }
  return cachedLucideOptions;
};


