/**
 * Metric Card Component
 * Displays metrics in a beautiful gradient card with icons and formatting
 */

'use client';

import React from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import type { MetricCardProps, MetricItem } from '../types';

const gradientClasses: Record<string, string> = {
  // Grays
  slate: 'from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/30 dark:via-gray-950/30 dark:to-zinc-950/30 border-slate-200/50 dark:border-slate-800/50',
  gray: 'from-gray-50 via-slate-50 to-neutral-50 dark:from-gray-950/30 dark:via-slate-950/30 dark:to-neutral-950/30 border-gray-200/50 dark:border-gray-800/50',
  zinc: 'from-zinc-50 via-gray-50 to-slate-50 dark:from-zinc-950/30 dark:via-gray-950/30 dark:to-slate-950/30 border-zinc-200/50 dark:border-zinc-800/50',
  neutral: 'from-neutral-50 via-gray-50 to-slate-50 dark:from-neutral-950/30 dark:via-gray-950/30 dark:to-slate-950/30 border-neutral-200/50 dark:border-neutral-800/50',
  stone: 'from-stone-50 via-neutral-50 to-gray-50 dark:from-stone-950/30 dark:via-neutral-950/30 dark:to-gray-950/30 border-stone-200/50 dark:border-stone-800/50',
  // Reds
  red: 'from-red-50 via-rose-50 to-pink-50 dark:from-red-950/30 dark:via-rose-950/30 dark:to-pink-950/30 border-red-200/50 dark:border-red-800/50',
  rose: 'from-rose-50 via-red-50 to-pink-50 dark:from-rose-950/30 dark:via-red-950/30 dark:to-pink-950/30 border-rose-200/50 dark:border-rose-800/50',
  // Oranges
  orange: 'from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30 border-orange-200/50 dark:border-orange-800/50',
  amber: 'from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/50',
  yellow: 'from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/30 dark:via-amber-950/30 dark:to-orange-950/30 border-yellow-200/50 dark:border-yellow-800/50',
  // Greens
  lime: 'from-lime-50 via-green-50 to-emerald-50 dark:from-lime-950/30 dark:via-green-950/30 dark:to-emerald-950/30 border-lime-200/50 dark:border-lime-800/50',
  green: 'from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border-green-200/50 dark:border-green-800/50',
  emerald: 'from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/30 dark:to-teal-950/30 border-emerald-200/50 dark:border-emerald-800/50',
  // Teals
  teal: 'from-teal-50 via-cyan-50 to-sky-50 dark:from-teal-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 border-teal-200/50 dark:border-teal-800/50',
  cyan: 'from-cyan-50 via-teal-50 to-sky-50 dark:from-cyan-950/30 dark:via-teal-950/30 dark:to-sky-950/30 border-cyan-200/50 dark:border-cyan-800/50',
  sky: 'from-sky-50 via-cyan-50 to-blue-50 dark:from-sky-950/30 dark:via-cyan-950/30 dark:to-blue-950/30 border-sky-200/50 dark:border-sky-800/50',
  // Blues
  blue: 'from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 border-blue-200/50 dark:border-blue-800/50',
  indigo: 'from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-purple-950/30 border-indigo-200/50 dark:border-indigo-800/50',
  // Purples
  violet: 'from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border-violet-200/50 dark:border-violet-800/50',
  purple: 'from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-rose-950/30 border-purple-200/50 dark:border-purple-800/50',
  fuchsia: 'from-fuchsia-50 via-pink-50 to-purple-50 dark:from-fuchsia-950/30 dark:via-pink-950/30 dark:to-purple-950/30 border-fuchsia-200/50 dark:border-fuchsia-800/50',
  pink: 'from-pink-50 via-rose-50 to-fuchsia-50 dark:from-pink-950/30 dark:via-rose-950/30 dark:to-fuchsia-950/30 border-pink-200/50 dark:border-pink-800/50',
};

const iconColorClasses: Record<string, string> = {
  // Grays
  slate: 'bg-slate-100 dark:bg-slate-900/50 group-hover:bg-slate-200 dark:group-hover:bg-slate-900/70 text-slate-600 dark:text-slate-400',
  gray: 'bg-gray-100 dark:bg-gray-900/50 group-hover:bg-gray-200 dark:group-hover:bg-gray-900/70 text-gray-600 dark:text-gray-400',
  zinc: 'bg-zinc-100 dark:bg-zinc-900/50 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-900/70 text-zinc-600 dark:text-zinc-400',
  neutral: 'bg-neutral-100 dark:bg-neutral-900/50 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-900/70 text-neutral-600 dark:text-neutral-400',
  stone: 'bg-stone-100 dark:bg-stone-900/50 group-hover:bg-stone-200 dark:group-hover:bg-stone-900/70 text-stone-600 dark:text-stone-400',
  // Reds
  red: 'bg-red-100 dark:bg-red-900/50 group-hover:bg-red-200 dark:group-hover:bg-red-900/70 text-red-600 dark:text-red-400',
  rose: 'bg-rose-100 dark:bg-rose-900/50 group-hover:bg-rose-200 dark:group-hover:bg-rose-900/70 text-rose-600 dark:text-rose-400',
  // Oranges
  orange: 'bg-orange-100 dark:bg-orange-900/50 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/70 text-orange-600 dark:text-orange-400',
  amber: 'bg-amber-100 dark:bg-amber-900/50 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/70 text-amber-600 dark:text-amber-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/50 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/70 text-yellow-600 dark:text-yellow-400',
  // Greens
  lime: 'bg-lime-100 dark:bg-lime-900/50 group-hover:bg-lime-200 dark:group-hover:bg-lime-900/70 text-lime-600 dark:text-lime-400',
  green: 'bg-green-100 dark:bg-green-900/50 group-hover:bg-green-200 dark:group-hover:bg-green-900/70 text-green-600 dark:text-green-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/50 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/70 text-emerald-600 dark:text-emerald-400',
  // Teals
  teal: 'bg-teal-100 dark:bg-teal-900/50 group-hover:bg-teal-200 dark:group-hover:bg-teal-900/70 text-teal-600 dark:text-teal-400',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/50 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900/70 text-cyan-600 dark:text-cyan-400',
  sky: 'bg-sky-100 dark:bg-sky-900/50 group-hover:bg-sky-200 dark:group-hover:bg-sky-900/70 text-sky-600 dark:text-sky-400',
  // Blues
  blue: 'bg-blue-100 dark:bg-blue-900/50 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/70 text-blue-600 dark:text-blue-400',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/50 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/70 text-indigo-600 dark:text-indigo-400',
  // Purples
  violet: 'bg-violet-100 dark:bg-violet-900/50 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/70 text-violet-600 dark:text-violet-400',
  purple: 'bg-purple-100 dark:bg-purple-900/50 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/70 text-purple-600 dark:text-purple-400',
  fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-900/50 group-hover:bg-fuchsia-200 dark:group-hover:bg-fuchsia-900/70 text-fuchsia-600 dark:text-fuchsia-400',
  pink: 'bg-pink-100 dark:bg-pink-900/50 group-hover:bg-pink-200 dark:group-hover:bg-pink-900/70 text-pink-600 dark:text-pink-400',
};

const textColorClasses: Record<string, string> = {
  // Format: labelColor valueColor unitColor
  // Label: Medium contrast for titles (readable but subtle)
  // Value: High contrast for numbers (most prominent)
  // Unit: Medium-high contrast for units (readable but secondary)
  // Grays
  slate: 'text-slate-700 dark:text-slate-300 text-slate-900 dark:text-slate-100 text-slate-600 dark:text-slate-400',
  gray: 'text-gray-700 dark:text-gray-300 text-gray-900 dark:text-gray-100 text-gray-600 dark:text-gray-400',
  zinc: 'text-zinc-700 dark:text-zinc-300 text-zinc-900 dark:text-zinc-100 text-zinc-600 dark:text-zinc-400',
  neutral: 'text-neutral-700 dark:text-neutral-300 text-neutral-900 dark:text-neutral-100 text-neutral-600 dark:text-neutral-400',
  stone: 'text-stone-700 dark:text-stone-300 text-stone-900 dark:text-stone-100 text-stone-600 dark:text-stone-400',
  // Reds
  red: 'text-red-700 dark:text-red-300 text-red-900 dark:text-red-100 text-red-600 dark:text-red-400',
  rose: 'text-rose-700 dark:text-rose-300 text-rose-900 dark:text-rose-100 text-rose-600 dark:text-rose-400',
  // Oranges
  orange: 'text-orange-700 dark:text-orange-300 text-orange-900 dark:text-orange-100 text-orange-600 dark:text-orange-400',
  amber: 'text-amber-700 dark:text-amber-300 text-amber-900 dark:text-amber-100 text-amber-600 dark:text-amber-400',
  yellow: 'text-yellow-700 dark:text-yellow-300 text-yellow-900 dark:text-yellow-100 text-yellow-600 dark:text-yellow-400',
  // Greens
  lime: 'text-lime-700 dark:text-lime-300 text-lime-900 dark:text-lime-100 text-lime-600 dark:text-lime-400',
  green: 'text-green-700 dark:text-green-300 text-green-900 dark:text-green-100 text-green-600 dark:text-green-400',
  emerald: 'text-emerald-700 dark:text-emerald-300 text-emerald-900 dark:text-emerald-100 text-emerald-600 dark:text-emerald-400',
  // Teals
  teal: 'text-teal-700 dark:text-teal-300 text-teal-900 dark:text-teal-100 text-teal-600 dark:text-teal-400',
  cyan: 'text-cyan-700 dark:text-cyan-300 text-cyan-900 dark:text-cyan-100 text-cyan-600 dark:text-cyan-400',
  sky: 'text-sky-700 dark:text-sky-300 text-sky-900 dark:text-sky-100 text-sky-600 dark:text-sky-400',
  // Blues
  blue: 'text-blue-700 dark:text-blue-300 text-blue-900 dark:text-blue-100 text-blue-600 dark:text-blue-400',
  indigo: 'text-indigo-700 dark:text-indigo-300 text-indigo-900 dark:text-indigo-100 text-indigo-600 dark:text-indigo-400',
  // Purples
  violet: 'text-violet-700 dark:text-violet-300 text-violet-900 dark:text-violet-100 text-violet-600 dark:text-violet-400',
  purple: 'text-purple-700 dark:text-purple-300 text-purple-900 dark:text-purple-100 text-purple-600 dark:text-purple-400',
  fuchsia: 'text-fuchsia-700 dark:text-fuchsia-300 text-fuchsia-900 dark:text-fuchsia-100 text-fuchsia-600 dark:text-fuchsia-400',
  pink: 'text-pink-700 dark:text-pink-300 text-pink-900 dark:text-pink-100 text-pink-600 dark:text-pink-400',
};

const formatValue = (metric: MetricItem): string => {
  const { value, format, precision = 0, prefix } = metric;
  
  if (typeof value === 'string') {
    return value;
  }
  
  switch (format) {
    case 'currency':
      return `${prefix || '$'}${value.toFixed(precision || 4)}`;
    case 'percentage':
      return `${value.toFixed(precision)}%`;
    case 'number':
      return value.toLocaleString();
    case 'custom':
      return String(value);
    default:
      return value.toFixed(precision);
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  metrics,
  footer,
  gradient = 'violet',
  showPattern = true,
  layout = 'grid',
  columns,
  className,
  ...props
}) => {
  // Auto-detect columns from metrics length if not provided
  const autoColumns = columns ?? (metrics.length <= 1 ? 1 : metrics.length <= 2 ? 2 : metrics.length <= 3 ? 3 : 4) as 1 | 2 | 3 | 4;
  
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  const gradientClass = gradientClasses[gradient] || gradientClasses['violet'];
  const borderClass = gradientClass.split(' ').find(cls => cls.startsWith('border-')) || 'border-violet-200/50 dark:border-violet-800/50';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-linear-to-br border shadow-sm',
        gradientClass,
        className
      )}
      {...props}
    >
      {/* Decorative background pattern */}
      {showPattern && (
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />
        </div>
      )}

      <div className="relative p-4">
        <div className={cn(
          layout === 'grid' ? `grid ${gridCols[autoColumns]} gap-4` : 'flex flex-col gap-4'
        )}>
          {metrics.map((metric) => {
            const iconColor = metric.iconColor || gradient || 'violet';
            const iconBgClass = iconColorClasses[iconColor] || iconColorClasses['violet'];
            const textColors = textColorClasses[iconColor] || textColorClasses['violet'];
            const [labelColor, valueColor, unitColor] = textColors.split(' ');

            return (
              <div key={metric.id} className="flex items-center gap-3 group">
                {metric.icon && (
                  <div className={cn(
                    'shrink-0 p-2.5 rounded-lg transition-colors',
                    iconBgClass
                  )}>
                    {typeof metric.icon === 'string' ? (
                      <IconRenderer
                        iconName={metric.icon}
                        className="h-5 w-5"
                      />
                    ) : React.isValidElement(metric.icon) ? (
                      metric.icon
                    ) : (
                      typeof metric.icon === 'function' ? (
                        React.createElement(metric.icon as React.ComponentType<any>, { className: "h-5 w-5" })
                      ) : null
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-xs font-medium uppercase tracking-wide mb-0.5',
                    labelColor
                  )}>
                    {metric.label}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    {metric.prefix && metric.format !== 'currency' && (
                      <span className={cn('h-5 w-5 mt-0.5', unitColor)}>
                        {metric.prefix}
                      </span>
                    )}
                    <span className={cn(
                      'text-2xl font-bold',
                      valueColor
                    )}>
                      {formatValue(metric)}
                    </span>
                    {metric.unit && (
                      <span className={cn(
                        'text-sm font-medium',
                        unitColor
                      )}>
                        {metric.unit}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer message */}
        {footer && (
          <div className={cn(
            'mt-4 pt-4 border-t',
            borderClass
          )}>
            <div className={cn(
              'flex items-center gap-2 text-xs font-medium',
              // Use a more readable color for footer in dark mode
              gradient === 'slate' && 'text-slate-600 dark:text-slate-400',
              gradient === 'gray' && 'text-gray-600 dark:text-gray-400',
              gradient === 'zinc' && 'text-zinc-600 dark:text-zinc-400',
              gradient === 'neutral' && 'text-neutral-600 dark:text-neutral-400',
              gradient === 'stone' && 'text-stone-600 dark:text-stone-400',
              gradient === 'red' && 'text-red-600 dark:text-red-400',
              gradient === 'rose' && 'text-rose-600 dark:text-rose-400',
              gradient === 'orange' && 'text-orange-600 dark:text-orange-400',
              gradient === 'amber' && 'text-amber-600 dark:text-amber-400',
              gradient === 'yellow' && 'text-yellow-600 dark:text-yellow-400',
              gradient === 'lime' && 'text-lime-600 dark:text-lime-400',
              gradient === 'green' && 'text-green-600 dark:text-green-400',
              gradient === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
              gradient === 'teal' && 'text-teal-600 dark:text-teal-400',
              gradient === 'cyan' && 'text-cyan-600 dark:text-cyan-400',
              gradient === 'sky' && 'text-sky-600 dark:text-sky-400',
              gradient === 'blue' && 'text-blue-600 dark:text-blue-400',
              gradient === 'indigo' && 'text-indigo-600 dark:text-indigo-400',
              gradient === 'violet' && 'text-violet-600 dark:text-violet-400',
              gradient === 'purple' && 'text-purple-600 dark:text-purple-400',
              gradient === 'fuchsia' && 'text-fuchsia-600 dark:text-fuchsia-400',
              gradient === 'pink' && 'text-pink-600 dark:text-pink-400'
            )}>
              {footer.icon && (
                typeof footer.icon === 'string' ? (
                  <IconRenderer iconName={footer.icon} className="h-3.5 w-3.5" />
                ) : React.isValidElement(footer.icon) ? (
                  footer.icon
                ) : (
                  typeof footer.icon === 'function' ? (
                    React.createElement(footer.icon as React.ComponentType<any>, { className: "h-3.5 w-3.5" })
                  ) : null
                )
              )}
              <span>{footer.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

MetricCard.displayName = 'MetricCard';

