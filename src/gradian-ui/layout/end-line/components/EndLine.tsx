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
      <span className="flex-1 h-px bg-linear-to-r from-transparent via-gray-400 to-transparent dark:via-gray-600" />
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full  dark:border-gray-300">
        <Hexagon className="h-6 w-6 text-violet-400 dark:text-violet-300" />
        {label && <span className="font-medium uppercase tracking-wide">{label}</span>}
      </span>
      <span className="flex-1 h-px bg-linear-to-l from-transparent via-gray-400 to-transparent dark:via-gray-600" />
    </div>
  );
};

EndLine.displayName = 'EndLine';

