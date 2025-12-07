// Sync Button Component

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button as UIButton } from '@/components/ui/button';
import { cn } from '../../../shared/utils';

export interface SyncButtonProps {
  /**
   * Click handler for sync action
   */
  onClick?: () => void | Promise<void>;
  
  /**
   * Whether the sync is in progress
   * @default false
   */
  syncing?: boolean;
  
  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Button text label
   * @default "Sync"
   */
  label?: string;
  
  /**
   * Button variant
   * @default "outline"
   */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
  
  /**
   * Button size
   * @default "sm"
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Icon size class (e.g., 'h-4 w-4', 'h-5 w-5')
   * @default "h-4 w-4"
   */
  iconSize?: string;
}

export const SyncButton: React.FC<SyncButtonProps> = ({
  onClick,
  syncing = false,
  disabled = false,
  label = 'Sync',
  variant = 'outline',
  size = 'sm',
  className,
  iconSize = 'h-4 w-4',
}) => {
  const isDisabled = disabled || syncing;
  
  const iconClasses = cn(
    iconSize,
    syncing && 'animate-spin',
    'me-2'
  );

  return (
    <UIButton
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
    >
      <RefreshCw className={iconClasses} />
      {label}
    </UIButton>
  );
};

SyncButton.displayName = 'SyncButton';

