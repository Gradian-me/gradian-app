'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '../../../shared/utils';

export interface AddButtonFullProps {
  /**
   * Button label text
   */
  label: string;
  
  /**
   * Click handler
   */
  onClick: () => void;
  
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether the button is in loading state
   */
  loading?: boolean;
  
  /**
   * Additional className
   */
  className?: string;
  
  /**
   * Icon size (defaults to w-5 h-5)
   */
  iconSize?: string;
  
  /**
   * Text size class (defaults to default text size)
   */
  textSize?: string;
  
  /**
   * Whether button should be full width (defaults to true)
   */
  fullWidth?: boolean;
}

/**
 * Full-width add button component with loading state support
 * 
 * @example
 * ```tsx
 * <AddButtonFull
 *   label="Add Item"
 *   onClick={handleAdd}
 *   loading={isAdding}
 *   disabled={!canAdd}
 * />
 * ```
 */
export const AddButtonFull: React.FC<AddButtonFullProps> = ({
  label,
  onClick,
  disabled = false,
  loading = false,
  className,
  iconSize = 'w-5 h-5',
  textSize = 'text-xs',
  fullWidth = true,
}) => {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center px-4 py-3 border-2 border-dashed border-violet-300 rounded-lg bg-violet-200 dark:bg-violet-600/10 text-violet-800 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-200 dark:hover:bg-violet-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        fullWidth && 'w-full',
        textSize,
        className
      )}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, 'me-2 animate-spin')} />
      ) : (
        <Plus className={cn(iconSize, 'me-2')} />
      )}
      {loading ? 'Loading...' : label}
    </Button>
  );
};

AddButtonFull.displayName = 'AddButtonFull';

