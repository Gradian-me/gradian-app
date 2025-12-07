// Card Wrapper Component

import React from 'react';
import { Card as RadixCard, CardContent, CardHeader, CardTitle, CardFooter } from '../../../../components/ui/card';
import { CardWrapperProps } from '../types';
import { cn } from '../../../shared/utils';

export const CardWrapper: React.FC<CardWrapperProps> = ({
  config,
  children,
  className,
  ...props
}) => {
  const {
    styling = {},
    behavior = {},
    layout = {},
  } = config;

  const hasBorderNone = className?.includes('border-none');
  
  const cardClasses = cn(
    'rounded-xl bg-card text-card-foreground shadow-sm',
    'w-full h-full', // Ensure full width and height
    !hasBorderNone && 'border', // Only add border if border-none is not in className
    styling.variant === 'elevated' && 'shadow-lg',
    styling.variant === 'outlined' && 'border',
    styling.variant === 'filled' && 'bg-muted',
    styling.rounded && 'rounded-2xl',
    styling.shadow === 'sm' && 'shadow-sm',
    styling.shadow === 'md' && 'shadow-md',
    styling.shadow === 'lg' && 'shadow-lg',
    behavior.hoverable && 'hover:shadow-md transition-all duration-100',
    behavior.clickable && 'cursor-pointer hover:scale-[1.01] transition-all duration-100', // Fast scale
    className
  );

  return (
    <RadixCard className={cardClasses} {...props}>
      {children}
    </RadixCard>
  );
};

// Export sub-components for convenience
export { CardContent, CardHeader, CardTitle, CardFooter };

CardWrapper.displayName = 'CardWrapper';
