// Badge Component

import React from 'react';
import { Badge as RadixBadge } from '../../../../components/ui/badge';
import { BadgeProps } from '../types';
import { cn } from '../../../shared/utils';

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
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

  const badgeClasses = cn(
    'inline-flex items-center rounded-full border font-medium cursor-default',
    variantClasses[variant],
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
