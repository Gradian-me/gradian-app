// Button Minimal Component
// Minimal button with icon, title, and customizable color with subtle hover background

import React from 'react';
import { cn } from '../../../shared/utils';

export interface ButtonMinimalProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color?: 'gray' | 'violet' | 'red' | 'blue' | 'green' | 'yellow' | 'orange';
  size?: 'sm' | 'md' | 'lg';
}

export const ButtonMinimal: React.FC<ButtonMinimalProps> = ({
  icon: Icon,
  title,
  color = 'gray',
  size = 'md',
  className,
  ...props
}) => {
  const colorClasses = {
    gray: 'text-gray-600 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-100',
    violet: 'text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:bg-violet-50',
    red: 'text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50',
    blue: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50',
    green: 'text-green-600 dark:text-green-400 hover:text-green-700 hover:bg-green-50',
    yellow: 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 hover:bg-yellow-50',
    orange: 'text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-50',
  };

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-7 w-7',
    lg: 'h-8 w-8',
  };

  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const buttonClasses = cn(
    'inline-flex items-center justify-center rounded-lg transition-all duration-200',
    'bg-transparent',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400',
    'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
    'cursor-pointer',
    sizeClasses[size],
    colorClasses[color],
    className
  );

  return (
    <button
      className={buttonClasses}
      title={title}
      {...props}
    >
      <Icon className={iconSizeClasses[size]} />
    </button>
  );
};

ButtonMinimal.displayName = 'ButtonMinimal';

