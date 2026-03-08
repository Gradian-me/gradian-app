/**
 * Server-safe color resolution for IconBox.
 * Kept in a separate file (no 'use client') so Server Components can call resolveIconBoxColor.
 */

/** Supported color names for IconBox (matches status/badge colors) */
export type IconBoxColor =
  | 'violet'
  | 'emerald'
  | 'indigo'
  | 'blue'
  | 'green'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'pink'
  | 'purple'
  | 'teal'
  | 'cyan'
  | 'stone'
  | 'neutral'
  | 'gray'
  | 'slate'
  | 'rose'
  | 'fuchsia'
  | 'lime'
  | 'sky'
  | 'zinc';

/** Resolve color string to IconBoxColor (handles badge/status color names). Safe to call from server. */
export function resolveIconBoxColor(color?: string): IconBoxColor {
  if (!color || typeof color !== 'string') return 'violet';
  const c = color.toLowerCase();
  const aliasMap: Record<string, IconBoxColor> = {
    muted: 'gray',
    destructive: 'red',
    success: 'green',
    warning: 'amber',
    danger: 'red',
    info: 'blue',
  };
  if (aliasMap[c]) return aliasMap[c];
  const valid: IconBoxColor[] = [
    'violet', 'emerald', 'indigo', 'blue', 'green', 'red', 'orange', 'amber',
    'yellow', 'pink', 'purple', 'teal', 'cyan', 'stone', 'neutral', 'gray',
    'slate', 'rose', 'fuchsia', 'lime', 'sky', 'zinc',
  ];
  return valid.includes(c as IconBoxColor) ? (c as IconBoxColor) : 'violet';
}
