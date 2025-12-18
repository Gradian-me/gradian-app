'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/gradian-ui/shared/utils';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';

export type LoadingSkeletonVariant = 
  | 'card'
  | 'card-list'
  | 'stats-card'
  | 'table'
  | 'list'
  | 'custom';

export interface LoadingSkeletonProps {
  /**
   * Variant of the skeleton to display
   */
  variant?: LoadingSkeletonVariant;
  
  /**
   * Number of skeleton items to display
   */
  count?: number;
  
  /**
   * Custom className for the container
   */
  className?: string;
  
  /**
   * Grid columns configuration (for grid layouts)
   */
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  
  /**
   * Gap between items
   */
  gap?: number;
  
  /**
   * Enable animation delay between items
   */
  animate?: boolean;
  
  /**
   * Custom content to render (overrides variant)
   */
  children?: React.ReactNode;
}

/**
 * Generic LoadingSkeleton component for consistent loading states
 * 
 * @example
 * // Card skeleton
 * <LoadingSkeleton variant="card" count={6} />
 * 
 * @example
 * // Stats cards skeleton
 * <LoadingSkeleton variant="stats-card" count={4} />
 * 
 * @example
 * // Custom skeleton
 * <LoadingSkeleton variant="custom">
 *   <Skeleton className="h-10 w-10" />
 * </LoadingSkeleton>
 */
export function LoadingSkeleton({
  variant = 'card',
  count = 6,
  className,
  columns = { default: 1, md: 2, lg: 3 },
  gap = 6,
  animate = true,
  children,
}: LoadingSkeletonProps) {
  // Custom variant - render children directly
  if (variant === 'custom' && children) {
    return <div className={cn('flex items-center justify-center', className)}>{children}</div>;
  }

  // Stats card variant
  if (variant === 'stats-card') {
    const gridColsMap: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-4',
      5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    };
    const gridCols = gridColsMap[count || 4] || 'grid-cols-2 md:grid-cols-4';
    const gapClass = `gap-${gap}`;
    return (
      <div className={cn('grid', gridCols, gapClass, className)}>
        {Array.from({ length: count || 4 }).map((_, index) => {
          const animationDelay = animate
            ? Math.min(
                index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
                UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX
              )
            : 0;

          const content = (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          if (animate) {
            return (
              <motion.div
                key={`stats-skeleton-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: animationDelay }}
              >
                {content}
              </motion.div>
            );
          }

          return <React.Fragment key={`stats-skeleton-${index}`}>{content}</React.Fragment>;
        })}
      </div>
    );
  }

  // Card list variant (like health page service cards)
  if (variant === 'card-list') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: count }).map((_, index) => {
          const animationDelay = animate
            ? Math.min(
                index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
                UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX
              )
            : 0;

          const content = (
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex flex-row items-end space-x-2 w-full sm:w-auto shrink-0">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
                <div className="rounded-xl border bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-sky-950/30 border-blue-200/50 dark:border-blue-800/50 p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          if (animate) {
            return (
              <motion.div
                key={`card-list-skeleton-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: animationDelay, ease: 'easeOut' }}
              >
                {content}
              </motion.div>
            );
          }

          return <React.Fragment key={`card-list-skeleton-${index}`}>{content}</React.Fragment>;
        })}
      </div>
    );
  }

  // Card variant (default - like integrations page cards)
  if (variant === 'card') {
    // Map column numbers to Tailwind classes
    const getGridColClass = (cols?: number, prefix = '') => {
      if (!cols) return '';
      const prefixClass = prefix ? `${prefix}:` : '';
      const colMap: Record<number, string> = {
        1: `${prefixClass}grid-cols-1`,
        2: `${prefixClass}grid-cols-2`,
        3: `${prefixClass}grid-cols-3`,
        4: `${prefixClass}grid-cols-4`,
        5: `${prefixClass}grid-cols-5`,
        6: `${prefixClass}grid-cols-6`,
        12: `${prefixClass}grid-cols-12`,
      };
      return colMap[cols] || '';
    };

    const gridCols = [
      getGridColClass(columns.default),
      getGridColClass(columns.sm, 'sm'),
      getGridColClass(columns.md, 'md'),
      getGridColClass(columns.lg, 'lg'),
      getGridColClass(columns.xl, 'xl'),
    ]
      .filter(Boolean)
      .join(' ');

    const gapClass = `gap-${gap}`;
    return (
      <div className={cn('grid', gridCols || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', gapClass, className)}>
        {Array.from({ length: count }).map((_, index) => {
          const animationDelay = animate
            ? Math.min(
                index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
                UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX
              )
            : 0;

          const content = (
            <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <Skeleton className="h-10 w-10 rounded shrink-0" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end space-y-2 w-full sm:w-auto shrink-0">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          if (animate) {
            return (
              <motion.div
                key={`card-skeleton-${index}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: animationDelay, ease: 'easeOut' }}
              >
                {content}
              </motion.div>
            );
          }

          return <React.Fragment key={`card-skeleton-${index}`}>{content}</React.Fragment>;
        })}
      </div>
    );
  }

  // List variant
  if (variant === 'list') {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: count }).map((_, index) => {
          const animationDelay = animate
            ? Math.min(
                index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
                UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX
              )
            : 0;

          const content = (
            <div className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          );

          if (animate) {
            return (
              <motion.div
                key={`list-skeleton-${index}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: animationDelay }}
              >
                {content}
              </motion.div>
            );
          }

          return <React.Fragment key={`list-skeleton-${index}`}>{content}</React.Fragment>;
        })}
      </div>
    );
  }

  // Table variant
  if (variant === 'table') {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Table header */}
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 w-24 flex-1" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`table-row-${index}`}
            className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-800"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`cell-${index}-${i}`} className="h-4 w-full flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

