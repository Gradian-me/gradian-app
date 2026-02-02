/**
 * Map ColorPicker color id (role: 'color') to Tailwind background class for cards.
 * Solid shades only (no opacity): light uses 100, dark uses 950.
 */
const COLOR_ID_TO_CARD_BG: Record<string, string> = {
  rose: 'bg-rose-200 dark:bg-rose-500/50',
  pink: 'bg-pink-200 dark:bg-pink-500/50',
  fuchsia: 'bg-fuchsia-200 dark:bg-fuchsia-500/50',
  purple: 'bg-purple-200 dark:bg-purple-500/50',
  violet: 'bg-violet-200 dark:bg-violet-500/50',
  indigo: 'bg-indigo-200 dark:bg-indigo-500/50',
  blue: 'bg-blue-200 dark:bg-blue-500/50',
  sky: 'bg-sky-200 dark:bg-sky-500/50',
  cyan: 'bg-cyan-200 dark:bg-cyan-500/50',
  teal: 'bg-teal-200 dark:bg-teal-500/50',
  emerald: 'bg-emerald-200 dark:bg-emerald-500/50',
  green: 'bg-green-200 dark:bg-green-500/50',
  lime: 'bg-lime-200 dark:bg-lime-500/50',
  yellow: 'bg-yellow-200 dark:bg-yellow-500/50',
  amber: 'bg-amber-200 dark:bg-amber-500/50',
  orange: 'bg-orange-200 dark:bg-orange-500/50',
  red: 'bg-red-200 dark:bg-red-500/50',
  stone: 'bg-stone-200 dark:bg-stone-500/50',
  neutral: 'bg-neutral-200 dark:bg-neutral-500/50',
  zinc: 'bg-zinc-200 dark:bg-zinc-500/50',
  gray: 'bg-gray-200 dark:bg-gray-500/50',
  slate: 'bg-slate-200 dark:bg-slate-500/50',
};

/**
 * Returns Tailwind background class for a card when the schema has a color role field.
 * Pass the raw value (e.g. color id string like "amber", "rose"). Returns empty string if no match.
 */
export function getCardBackgroundClass(colorId: string | undefined | null): string {
  if (!colorId || typeof colorId !== 'string') return '';
  const tw = COLOR_ID_TO_CARD_BG[colorId.trim().toLowerCase()];
  return tw ?? '';
}
