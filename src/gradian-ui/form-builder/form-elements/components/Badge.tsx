// Badge Component

import React from 'react';
import { Badge as RadixBadge } from '../../../../components/ui/badge';
import { BadgeProps } from '../types';
import { cn } from '../../../shared/utils';

// Helper to get pastel badge classes from Tailwind color name
const getPastelBadgeClasses = (color: string): string => {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-500/15 dark:text-violet-100 dark:border-violet-500/40',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-500/40',
    yellow: 'bg-yellow-50 text-yellow-700 border border-yellow-100 dark:bg-yellow-500/15 dark:text-yellow-100 dark:border-yellow-500/40',
    red: 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-500/15 dark:text-red-100 dark:border-red-500/40',
    green: 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-500/15 dark:text-green-100 dark:border-green-500/40',
    blue: 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/15 dark:text-blue-100 dark:border-blue-500/40',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-100 dark:border-indigo-500/40',
    purple: 'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-500/15 dark:text-purple-100 dark:border-purple-500/40',
    pink: 'bg-pink-50 text-pink-700 border border-pink-100 dark:bg-pink-500/15 dark:text-pink-100 dark:border-pink-500/40',
    orange: 'bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-500/15 dark:text-orange-100 dark:border-orange-500/40',
    amber: 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-500/40',
    teal: 'bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-500/15 dark:text-teal-100 dark:border-teal-500/40',
    cyan: 'bg-cyan-50 text-cyan-700 border border-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-100 dark:border-cyan-500/40',
    sky: 'bg-sky-50 text-sky-700 border border-sky-100 dark:bg-sky-500/15 dark:text-sky-100 dark:border-sky-500/40',
    slate: 'bg-slate-50 text-slate-700 border border-slate-100 dark:bg-slate-500/15 dark:text-slate-100 dark:border-slate-500/40',
    gray: 'bg-gray-50 text-gray-700 border border-gray-100 dark:bg-gray-500/15 dark:text-gray-100 dark:border-gray-500/40',
    zinc: 'bg-zinc-50 text-zinc-700 border border-zinc-100 dark:bg-zinc-500/15 dark:text-zinc-100 dark:border-zinc-500/40',
    rose: 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/15 dark:text-rose-100 dark:border-rose-500/40',
    fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 dark:bg-fuchsia-500/15 dark:text-fuchsia-100 dark:border-fuchsia-500/40',
    lime: 'bg-lime-50 text-lime-700 border border-lime-100 dark:bg-lime-500/15 dark:text-lime-100 dark:border-lime-500/40',
  };

  return colorMap[color.toLowerCase()] || colorMap.gray;
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  color,
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
    primary: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:border-blue-700',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
    success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-800 dark:text-green-200 dark:border-green-700',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-800 dark:text-yellow-200 dark:border-yellow-700',
    danger: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-800 dark:text-red-200 dark:border-red-700',
    outline: 'bg-transparent text-gray-700 border-gray-300 dark:bg-transparent dark:text-gray-200 dark:border-gray-700',
    cyan: 'bg-cyan-200 text-cyan-800 border-cyan-300 dark:bg-cyan-800 dark:text-cyan-200 dark:border-cyan-700',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };

  // Use pastel styling if color is provided, otherwise use variant
  const styleClasses = color 
    ? getPastelBadgeClasses(color)
    : variantClasses[variant];

  const badgeClasses = cn(
    'inline-flex items-center rounded-full border font-medium cursor-default',
    styleClasses,
    sizeClasses[size],
    className
  );

  return (
    <RadixBadge className={badgeClasses} {...props}>
      {children}
    </RadixBadge>
  );
};

Badge.displayName = 'Badge';
