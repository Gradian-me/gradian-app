'use client';

import React from 'react';
import { cn } from '@/gradian-ui/shared/utils';

export interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Custom className for the spinner
   */
  className?: string;
  
  /**
   * Custom container className
   */
  containerClassName?: string;
  
  /**
   * Whether to show the spinner in a centered container
   */
  centered?: boolean;
}

/**
 * LoadingSpinner component for consistent loading states
 * 
 * @example
 * // Simple spinner
 * <LoadingSpinner />
 * 
 * @example
 * // Centered spinner
 * <LoadingSpinner centered />
 * 
 * @example
 * // Custom size
 * <LoadingSpinner size="lg" />
 */
export function LoadingSpinner({
  size = 'md',
  className,
  containerClassName,
  centered = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-b-2',
    lg: 'h-12 w-12 border-b-2',
  };

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-blue-600',
        sizeClasses[size],
        className
      )}
    />
  );

  if (centered) {
    return (
      <div className={cn('flex items-center justify-center', containerClassName)}>
        {spinner}
      </div>
    );
  }

  return spinner;
}

