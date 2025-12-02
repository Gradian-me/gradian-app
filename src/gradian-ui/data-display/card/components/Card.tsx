// Card Component

import React from 'react';
import { CardProps } from '../types';
import { CardHeader } from './CardHeader';
import { CardContent } from './CardContent';
import { CardFooter } from './CardFooter';
import { CardImage } from './CardImage';
import { cn } from '../../../shared/utils';

export const Card: React.FC<CardProps> = ({
  config,
  children,
  onClick,
  onHover,
  className,
  ...props
}) => {
  const {
    title,
    subtitle,
    description,
    image,
    actions,
    styling = { variant: 'default' },
    behavior = { clickable: false, hoverable: false },
    layout = { direction: 'vertical' },
  } = config;

  const cardClasses = cn(
    'card bg-white border border-gray-200 w-full',
    // Variant styles
    styling.variant === 'minimal' && 'border-none shadow-none',
    styling.variant === 'elevated' && 'shadow-lg',
    styling.variant === 'outlined' && 'border-2',
    styling.variant === 'filled' && 'bg-gray-50',
    // Size styles
    styling.size === 'sm' && 'p-3',
    styling.size === 'md' && 'p-4',
    styling.size === 'lg' && 'p-6',
    styling.size === 'xl' && 'p-8',
    // Rounded styles
    styling.rounded && 'rounded-lg',
    !styling.rounded && 'rounded-md',
    // Shadow styles
    styling.shadow === 'sm' && 'shadow-sm',
    styling.shadow === 'md' && 'shadow-md',
    styling.shadow === 'lg' && 'shadow-lg',
    styling.shadow === 'xl' && 'shadow-xl',
    // Behavior styles
    behavior.clickable && 'cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all duration-100',
    behavior.hoverable && 'hover:shadow-md transition-shadow duration-100',
    // Layout styles
    layout.direction === 'horizontal' && 'flex flex-row',
    layout.direction === 'vertical' && 'flex flex-col',
    className
  );

  const handleClick = () => {
    if (behavior.clickable && onClick) {
      onClick();
    }
  };

  const handleMouseEnter = () => {
    if (behavior.hoverable && onHover) {
      onHover(true);
    }
  };

  const handleMouseLeave = () => {
    if (behavior.hoverable && onHover) {
      onHover(false);
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children || (
        <>
          {image && image.position === 'top' && (
            <CardImage
              src={image.src}
              alt={image.alt}
              position={image.position}
            />
          )}
          
          {(title || subtitle || description) && (
            <CardHeader
              title={title}
              subtitle={subtitle}
            />
          )}
          
          {description && (
            <CardContent>
              <p className="text-gray-600">{description}</p>
            </CardContent>
          )}
          
          {actions && actions.length > 0 && (
            <CardFooter actions={actions} />
          )}
          
          {image && image.position === 'bottom' && (
            <CardImage
              src={image.src}
              alt={image.alt}
              position={image.position}
            />
          )}
        </>
      )}
    </div>
  );
};

Card.displayName = 'Card';
