// Code Badge Component
// Minimal badge for displaying code values

import React from 'react';
import { cn } from '../../../shared/utils';
import { CopyContent } from './CopyContent';
import { renderHighlightedText } from '../../../shared/utils/highlighter';

export interface CodeBadgeProps {
  code: string | number;
  className?: string;
  highlightQuery?: string; // Optional search query for highlighting matches
}

export const CodeBadge: React.FC<CodeBadgeProps> = ({
  code,
  className,
  highlightQuery,
}) => {
  if (!code && code !== 0) return null;

  const codeString = String(code);
  const highlightedCode = highlightQuery 
    ? renderHighlightedText(codeString, highlightQuery, 'bg-yellow-300 text-gray-900 rounded px-0.5')
    : codeString;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs font-mono font-medium',
        'bg-cyan-50 text-cyan-700 border border-cyan-200',
        'select-none whitespace-nowrap',
        className
      )}
    >
      {highlightedCode}
      <CopyContent content={code} className="h-4 w-4 flex-shrink-0" />
    </span>
  );
};

CodeBadge.displayName = 'CodeBadge';

