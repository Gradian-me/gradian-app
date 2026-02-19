'use client';

import React from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/gradian-ui/shared/utils';

export interface TranslationButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** 'edit' = "Edit translations", 'view' = "View translations" */
  mode?: 'edit' | 'view';
  disabled?: boolean;
  className?: string;
  /** Icon size class, e.g. h-4 w-4 or h-3.5 w-3.5 */
  iconClassName?: string;
  title?: string;
  'aria-label'?: string;
}

const DEFAULT_EDIT_TITLE = 'Edit translations';
const DEFAULT_VIEW_TITLE = 'View translations';

export const TranslationButton: React.FC<TranslationButtonProps> = ({
  onClick,
  mode = 'edit',
  disabled = false,
  className,
  iconClassName = 'h-4 w-4',
  title,
  'aria-label': ariaLabel,
}) => {
  const resolvedTitle = title ?? (mode === 'view' ? DEFAULT_VIEW_TITLE : DEFAULT_EDIT_TITLE);
  const resolvedAriaLabel = ariaLabel ?? resolvedTitle;

  return (
    <Button
      type="button"
      variant="square"
      size="icon"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      disabled={disabled}
      title={resolvedTitle}
      aria-label={resolvedAriaLabel}
      className={cn('h-7 min-h-7 w-7 min-w-7 shrink-0 p-0', className)}
    >
      <Languages className={cn(iconClassName)} />
    </Button>
  );
};

TranslationButton.displayName = 'TranslationButton';
