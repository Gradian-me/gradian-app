'use client';

import React from 'react';
import { Hexagon } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';

export interface EndLineProps {
  label?: string;
  className?: string;
}

export const EndLine: React.FC<EndLineProps> = ({ label = '', className }) => {
  return (
    <div className={cn('flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-400 py-4 mx-2', className)}>
      <span className={cn(
        'flex-1 h-px',
        label 
          ? 'bg-linear-to-r from-transparent to-gray-400 dark:to-gray-600' 
          : 'bg-linear-to-r from-transparent via-gray-400 to-transparent dark:via-gray-600'
      )} />
      <span className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full',
        label ? 'border border-violet-400 dark:border-violet-300' : ''
      )}>
        {!label && <Hexagon className="h-6 w-6 text-violet-400 dark:text-violet-300" />}
        {label && <span className="font-medium uppercase tracking-wide">{label}</span>}
      </span>
      <span className={cn(
        'flex-1 h-px',
        label 
          ? 'bg-linear-to-r from-gray-400 to-transparent dark:from-gray-600' 
          : 'bg-linear-to-l from-transparent via-gray-400 to-transparent dark:via-gray-600'
      )} />
    </div>
  );
};

EndLine.displayName = 'EndLine';

