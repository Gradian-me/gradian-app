// Code Badge Component
// Minimal badge for displaying code values

import React from 'react';
import { cn } from '../../../shared/utils';
import { CopyContent } from './CopyContent';

export interface CodeBadgeProps {
  code: string | number;
  className?: string;
}

export const CodeBadge: React.FC<CodeBadgeProps> = ({
  code,
  className,
}) => {
  if (!code && code !== 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-mono font-medium',
        'bg-cyan-50 text-cyan-700 border border-cyan-200',
        'select-none whitespace-nowrap overflow-hidden',
        className
      )}
    >
      <span className="truncate">{String(code)}</span>
      <CopyContent content={code} className="h-4 w-4 flex-shrink-0" />
    </span>
  );
};

CodeBadge.displayName = 'CodeBadge';

