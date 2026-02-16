'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/gradian-ui/shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

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

/** Flat variant: rounded-lg, no border, light bg (for integrations, etc.) */
const flatColorVariants: Record<IconBoxColor, string> = {
  violet: 'rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-100',
  emerald: 'rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-100',
  indigo: 'rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-100',
  blue: 'rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-100',
  green: 'rounded-lg bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-100',
  red: 'rounded-lg bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-100',
  orange: 'rounded-lg bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-100',
  amber: 'rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-100',
  yellow: 'rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-100',
  pink: 'rounded-lg bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-100',
  purple: 'rounded-lg bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-100',
  teal: 'rounded-lg bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-100',
  cyan: 'rounded-lg bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-100',
  stone: 'rounded-lg bg-stone-50 dark:bg-stone-500/15 text-stone-700 dark:text-stone-100',
  neutral: 'rounded-lg bg-neutral-50 dark:bg-neutral-500/15 text-neutral-700 dark:text-neutral-100',
  gray: 'rounded-lg bg-gray-50 dark:bg-gray-500/15 text-gray-700 dark:text-gray-100',
  slate: 'rounded-lg bg-slate-50 dark:bg-slate-500/15 text-slate-700 dark:text-slate-100',
  rose: 'rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-100',
  fuchsia: 'rounded-lg bg-fuchsia-50 dark:bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-100',
  lime: 'rounded-lg bg-lime-50 dark:bg-lime-500/15 text-lime-700 dark:text-lime-100',
  sky: 'rounded-lg bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-100',
  zinc: 'rounded-lg bg-zinc-50 dark:bg-zinc-500/15 text-zinc-700 dark:text-zinc-100',
};

/** Filled variant: dark bg, white icon (for component cards) */
const filledColorVariants: Record<IconBoxColor, string> = {
  violet: 'rounded-lg bg-violet-600 text-white',
  emerald: 'rounded-lg bg-emerald-600 text-white',
  indigo: 'rounded-lg bg-indigo-600 text-white',
  blue: 'rounded-lg bg-blue-600 text-white',
  green: 'rounded-lg bg-green-600 text-white',
  red: 'rounded-lg bg-red-600 text-white',
  orange: 'rounded-lg bg-orange-600 text-white',
  amber: 'rounded-lg bg-amber-600 text-white',
  yellow: 'rounded-lg bg-amber-600 text-white',
  pink: 'rounded-lg bg-pink-600 text-white',
  purple: 'rounded-lg bg-purple-600 text-white',
  teal: 'rounded-lg bg-teal-600 text-white',
  cyan: 'rounded-lg bg-cyan-600 text-white',
  stone: 'rounded-lg bg-stone-600 text-white',
  neutral: 'rounded-lg bg-neutral-600 text-white',
  gray: 'rounded-lg bg-gray-600 text-white',
  slate: 'rounded-lg bg-slate-600 text-white',
  rose: 'rounded-lg bg-rose-600 text-white',
  fuchsia: 'rounded-lg bg-fuchsia-600 text-white',
  lime: 'rounded-lg bg-lime-600 text-white',
  sky: 'rounded-lg bg-sky-600 text-white',
  zinc: 'rounded-lg bg-zinc-600 text-white',
};

const roundedColorVariants: Record<IconBoxColor, string> = {
  violet: 'rounded-xl bg-violet-50 dark:bg-violet-500/15 border-2 border-violet-100 dark:border-violet-500/40 text-violet-700 dark:text-violet-100',
  emerald: 'rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-100 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-100',
  indigo: 'rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border-2 border-indigo-100 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-100',
  blue: 'rounded-xl bg-blue-50 dark:bg-blue-500/15 border-2 border-blue-100 dark:border-blue-500/40 text-blue-700 dark:text-blue-100',
  green: 'rounded-xl bg-green-50 dark:bg-green-500/15 border-2 border-green-100 dark:border-green-500/40 text-green-700 dark:text-green-100',
  red: 'rounded-xl bg-red-50 dark:bg-red-500/15 border-2 border-red-100 dark:border-red-500/40 text-red-700 dark:text-red-100',
  orange: 'rounded-xl bg-orange-50 dark:bg-orange-500/15 border-2 border-orange-100 dark:border-orange-500/40 text-orange-700 dark:text-orange-100',
  amber: 'rounded-xl bg-amber-50 dark:bg-amber-500/15 border-2 border-amber-100 dark:border-amber-500/40 text-amber-700 dark:text-amber-100',
  yellow: 'rounded-xl bg-amber-50 dark:bg-amber-500/15 border-2 border-amber-100 dark:border-amber-500/40 text-amber-700 dark:text-amber-100',
  pink: 'rounded-xl bg-pink-50 dark:bg-pink-500/15 border-2 border-pink-100 dark:border-pink-500/40 text-pink-700 dark:text-pink-100',
  purple: 'rounded-xl bg-purple-50 dark:bg-purple-500/15 border-2 border-purple-100 dark:border-purple-500/40 text-purple-700 dark:text-purple-100',
  teal: 'rounded-xl bg-teal-50 dark:bg-teal-500/15 border-2 border-teal-100 dark:border-teal-500/40 text-teal-700 dark:text-teal-100',
  cyan: 'rounded-xl bg-cyan-50 dark:bg-cyan-500/15 border-2 border-cyan-100 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-100',
  stone: 'rounded-xl bg-stone-50 dark:bg-stone-500/15 border-2 border-stone-100 dark:border-stone-500/40 text-stone-700 dark:text-stone-100',
  neutral: 'rounded-xl bg-neutral-50 dark:bg-neutral-500/15 border-2 border-neutral-100 dark:border-neutral-500/40 text-neutral-700 dark:text-neutral-100',
  gray: 'rounded-xl bg-gray-50 dark:bg-gray-500/15 border-2 border-gray-100 dark:border-gray-500/40 text-gray-700 dark:text-gray-100',
  slate: 'rounded-xl bg-slate-50 dark:bg-slate-500/15 border-2 border-slate-100 dark:border-slate-500/40 text-slate-700 dark:text-slate-100',
  rose: 'rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-100 dark:border-rose-500/40 text-rose-700 dark:text-rose-100',
  fuchsia: 'rounded-xl bg-fuchsia-50 dark:bg-fuchsia-500/15 border-2 border-fuchsia-100 dark:border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-100',
  lime: 'rounded-xl bg-lime-50 dark:bg-lime-500/15 border-2 border-lime-100 dark:border-lime-500/40 text-lime-700 dark:text-lime-100',
  sky: 'rounded-xl bg-sky-50 dark:bg-sky-500/15 border-2 border-sky-100 dark:border-sky-500/40 text-sky-700 dark:text-sky-100',
  zinc: 'rounded-xl bg-zinc-50 dark:bg-zinc-500/15 border-2 border-zinc-100 dark:border-zinc-500/40 text-zinc-700 dark:text-zinc-100',
};

// Base structure
const iconBoxVariants = cva(
  'flex items-center justify-center shrink-0 p-0 [&_svg]:shrink-0',
  {
    variants: {
      size: {
        sm: 'h-8 min-h-8 w-8 min-w-8 [&_svg]:h-4 [&_svg]:w-4',
        md: 'h-10 min-h-10 w-10 min-w-10 [&_svg]:h-5 [&_svg]:w-5',
        lg: 'h-12 min-h-12 w-12 min-w-12 [&_svg]:h-6 [&_svg]:w-6',
      },
      variant: {
        squircle: 'squircle squircle-2xl squircle-smooth-md',
        rounded: '',
        flat: '',
        filled: '',
      },
      color: {
        violet:
          'squircle-violet-50 squircle-border-2 squircle-border-violet-100 dark:squircle-violet-500/15 dark:squircle-border-violet-500/40 text-violet-700 dark:text-violet-100',
        emerald:
          'squircle-emerald-50 squircle-border-2 squircle-border-emerald-100 dark:squircle-emerald-500/15 dark:squircle-border-emerald-500/40 text-emerald-700 dark:text-emerald-100',
        indigo:
          'squircle-indigo-50 squircle-border-2 squircle-border-indigo-100 dark:squircle-indigo-500/15 dark:squircle-border-indigo-500/40 text-indigo-700 dark:text-indigo-100',
        blue: 'squircle-blue-50 squircle-border-2 squircle-border-blue-100 dark:squircle-blue-500/15 dark:squircle-border-blue-500/40 text-blue-700 dark:text-blue-100',
        green:
          'squircle-green-50 squircle-border-2 squircle-border-green-100 dark:squircle-green-500/15 dark:squircle-border-green-500/40 text-green-700 dark:text-green-100',
        red: 'squircle-red-50 squircle-border-2 squircle-border-red-100 dark:squircle-red-500/15 dark:squircle-border-red-500/40 text-red-700 dark:text-red-100',
        orange:
          'squircle-orange-50 squircle-border-2 squircle-border-orange-100 dark:squircle-orange-500/15 dark:squircle-border-orange-500/40 text-orange-700 dark:text-orange-100',
        amber:
          'squircle-amber-50 squircle-border-2 squircle-border-amber-100 dark:squircle-amber-500/15 dark:squircle-border-amber-500/40 text-amber-700 dark:text-amber-100',
        yellow:
          'squircle-amber-50 squircle-border-2 squircle-border-amber-100 dark:squircle-amber-500/15 dark:squircle-border-amber-500/40 text-amber-700 dark:text-amber-100',
        pink: 'squircle-pink-50 squircle-border-2 squircle-border-pink-100 dark:squircle-pink-500/15 dark:squircle-border-pink-500/40 text-pink-700 dark:text-pink-100',
        purple:
          'squircle-purple-50 squircle-border-2 squircle-border-purple-100 dark:squircle-purple-500/15 dark:squircle-border-purple-500/40 text-purple-700 dark:text-purple-100',
        teal: 'squircle-teal-50 squircle-border-2 squircle-border-teal-100 dark:squircle-teal-500/15 dark:squircle-border-teal-500/40 text-teal-700 dark:text-teal-100',
        cyan: 'squircle-cyan-50 squircle-border-2 squircle-border-cyan-100 dark:squircle-cyan-500/15 dark:squircle-border-cyan-500/40 text-cyan-700 dark:text-cyan-100',
        stone:
          'squircle-stone-50 squircle-border-2 squircle-border-stone-100 dark:squircle-stone-500/15 dark:squircle-border-stone-500/40 text-stone-700 dark:text-stone-100',
        neutral:
          'squircle-neutral-50 squircle-border-2 squircle-border-neutral-100 dark:squircle-neutral-500/15 dark:squircle-border-neutral-500/40 text-neutral-700 dark:text-neutral-100',
        gray: 'squircle-gray-50 squircle-border-2 squircle-border-gray-100 dark:squircle-gray-500/15 dark:squircle-border-gray-500/40 text-gray-700 dark:text-gray-100',
        slate:
          'squircle-slate-50 squircle-border-2 squircle-border-slate-100 dark:squircle-slate-500/15 dark:squircle-border-slate-500/40 text-slate-700 dark:text-slate-100',
        rose: 'squircle-rose-50 squircle-border-2 squircle-border-rose-100 dark:squircle-rose-500/15 dark:squircle-border-rose-500/40 text-rose-700 dark:text-rose-100',
        fuchsia:
          'squircle-fuchsia-50 squircle-border-2 squircle-border-fuchsia-100 dark:squircle-fuchsia-500/15 dark:squircle-border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-100',
        lime: 'squircle-lime-50 squircle-border-2 squircle-border-lime-100 dark:squircle-lime-500/15 dark:squircle-border-lime-500/40 text-lime-700 dark:text-lime-100',
        sky: 'squircle-sky-50 squircle-border-2 squircle-border-sky-100 dark:squircle-sky-500/15 dark:squircle-border-sky-500/40 text-sky-700 dark:text-sky-100',
        zinc: 'squircle-zinc-50 squircle-border-2 squircle-border-zinc-100 dark:squircle-zinc-500/15 dark:squircle-border-zinc-500/40 text-zinc-700 dark:text-zinc-100',
        /** Sentinel: no cva color (used when variant is flat/rounded/filled) */
        _none: '',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'squircle',
      color: 'violet',
    },
  }
);

/** Get classes for rounded variant (colors always work) */
function getRoundedColorClasses(color: IconBoxColor): string {
  return roundedColorVariants[color] ?? roundedColorVariants.violet;
}

function getFlatColorClasses(color: IconBoxColor): string {
  return flatColorVariants[color] ?? flatColorVariants.violet;
}

function getFilledColorClasses(color: IconBoxColor): string {
  return filledColorVariants[color] ?? filledColorVariants.violet;
}

export interface IconBoxProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof iconBoxVariants> {
  /** Icon name for IconRenderer (Lucide icon). When set, IconRenderer is rendered inside. */
  name?: string;
  /** Optional className for the icon SVG. Default: h-4 w-4 */
  iconClassName?: string;
  children?: React.ReactNode;
}

/** Resolve color string to IconBoxColor (handles badge/status color names) */
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

/** Check if value looks like a hex color */
export function isHexColor(value?: string): boolean {
  return Boolean(value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value));
}

export const IconBox = React.forwardRef<HTMLDivElement, IconBoxProps>(
  (
    { className, color = 'violet', variant = 'squircle', size = 'md', name, iconClassName, children, style, ...props },
    ref
  ) => {
    const resolvedColor = (color ?? 'violet') as IconBoxColor;
    let colorClasses: string;
    if (variant === 'rounded') {
      colorClasses = getRoundedColorClasses(resolvedColor);
    } else if (variant === 'flat') {
      colorClasses = getFlatColorClasses(resolvedColor);
    } else if (variant === 'filled') {
      colorClasses = getFilledColorClasses(resolvedColor);
    } else {
      colorClasses = ''; // squircle uses cva color
    }
    const cvaColor = variant === 'squircle' ? resolvedColor : '_none';
    const baseClasses = iconBoxVariants({ variant, size, color: cvaColor as never });
    const classes = cn(
      baseClasses,
      (variant === 'rounded' || variant === 'flat' || variant === 'filled') && colorClasses
    );
    const iconSizeClass = iconClassName ?? (size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5');
    const content =
      name != null ? (
        <IconRenderer iconName={name} className={iconSizeClass} />
      ) : (
        children
      );
    return (
      <div ref={ref} className={cn(classes, className)} style={style} {...props}>
        {content}
      </div>
    );
  }
);

IconBox.displayName = 'IconBox';
