// ForceIcon Component
// Displays a wobbling OctagonAlert icon when isForce is true

import React from 'react';
import { motion } from 'framer-motion';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/gradian-ui/shared/utils';

export interface ForceIconProps {
  isForce?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
  tooltipText?: string;
  title?: string;
  forceReason?: string;
}

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const ForceIcon: React.FC<ForceIconProps> = ({
  isForce = false,
  size = 'md',
  className,
  showTooltip = true,
  tooltipText,
  title,
  forceReason,
}) => {
  if (!isForce) {
    return null;
  }

  const iconSize = sizeMap[size];

  const wobbleAnimation = {
    rotate: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 1,
      ease: [0.4, 0, 0.6, 1] as const, // easeInOut cubic bezier
    },
  };

  // Build tooltip content
  let tooltipContent: React.ReactNode;
  
  if (forceReason) {
    tooltipContent = (
      <p className="text-sm text-gray-900 dark:text-gray-100">
        <span className="font-medium text-pink-600 dark:text-pink-400">Force Reason:</span> <span className="text-gray-700 dark:text-gray-300">{forceReason}</span>
      </p>
    );
  } else {
    tooltipContent = <p className="text-sm text-gray-900 dark:text-gray-100">{tooltipText || 'This record is forced'}</p>;
  }

  if (showTooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              animate={wobbleAnimation}
              className={cn('inline-flex items-center justify-center cursor-pointer', className)}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              data-tooltip-trigger="true"
            >
              <IconRenderer
                iconName="OctagonAlert"
                className={cn(iconSize, 'text-pink-600 dark:text-pink-500')}
              />
            </motion.div>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            sideOffset={8}
            className="z-100"
            onClick={(e) => e.stopPropagation()}
            avoidCollisions={true}
            collisionPadding={8}
          >
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      animate={wobbleAnimation}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <IconRenderer
        iconName="OctagonAlert"
        className={cn(iconSize, 'text-pink-600 dark:text-pink-500')}
      />
    </motion.div>
  );
};

ForceIcon.displayName = 'ForceIcon';

