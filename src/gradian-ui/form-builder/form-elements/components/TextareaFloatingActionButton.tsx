'use client';

import React from 'react';
import { cn } from '../../../shared/utils';

export interface TextareaFloatingActionButtonProps {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title: string;
  className?: string;
}

const floatingActionButtonClasses = cn(
  'h-8 w-8 rounded-full border border-violet-200/70 bg-white/80 text-violet-600 shadow-sm transition-all',
  'flex items-center justify-center',
  'hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md',
  'dark:border-violet-500/50 dark:bg-gray-900/80 dark:text-violet-200 dark:hover:bg-violet-500/10',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-violet-200/70 disabled:hover:bg-white/80',
  'focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-700'
);

export const TextareaFloatingActionButton: React.FC<TextareaFloatingActionButtonProps> = ({
  children,
  onClick,
  disabled = false,
  title,
  className,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(floatingActionButtonClasses, className)}
    title={title}
  >
    {children}
  </button>
);

TextareaFloatingActionButton.displayName = 'TextareaFloatingActionButton';
