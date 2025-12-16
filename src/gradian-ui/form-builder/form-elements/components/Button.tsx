// Button Component

import React from 'react';
import { Button as RadixButton } from '../../../../components/ui/button';
import { ButtonProps } from '../types';
import { cn } from '../../../shared/utils';

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  href,
  canOpenInNewTab = false,
  onClick,
  ...props
}) => {
  // Map gradian-ui Button variants to UI Button styles (matches button.tsx)
  const variantClasses = {
    default: 'bg-violet-600 text-white shadow-sm hover:bg-violet-700 hover:shadow-md dark:bg-violet-500 dark:text-white dark:hover:bg-violet-600',
    primary: 'bg-violet-600 text-white shadow-sm hover:bg-violet-700 hover:shadow-md dark:bg-violet-500 dark:text-white dark:hover:bg-violet-600',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md dark:bg-green-500 dark:text-white dark:hover:bg-green-600',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow-md dark:bg-yellow-500 dark:text-white dark:hover:bg-yellow-600',
    danger: 'bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md dark:bg-red-600 dark:text-white dark:hover:bg-red-700',
    outline: 'border border-none bg-gray-50 text-violet-700 hover:bg-violet-50 hover:border hover:border-violet-300 shadow-xs hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-violet-300 dark:hover:bg-gray-700 dark:hover:border-gray-700',
    ghost: 'text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-gray-800 dark:hover:text-violet-300',
    link: 'text-violet-600 underline-offset-4 hover:underline hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300',
  };

  const sizeClasses = {
    sm: 'h-9 rounded-lg px-4 text-xs',
    md: 'h-11 px-6 py-2',
    lg: 'h-12 rounded-xl px-8 text-base',
    xl: 'h-14 rounded-2xl px-10 text-lg',
  };

  const buttonClasses = cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Handle Ctrl+click (or Cmd+click on Mac) to open in new tab
    if (canOpenInNewTab && href && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }

    // Call original onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Handle middle-click to open in new tab
    if (canOpenInNewTab && href && e.button === 1) {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
  };

  return (
    <RadixButton 
      className={buttonClasses} 
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      {...props}
    >
      {children}
    </RadixButton>
  );
};

Button.displayName = 'Button';
