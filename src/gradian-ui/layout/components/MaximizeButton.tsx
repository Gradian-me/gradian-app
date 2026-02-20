// MaximizeButton Component
// Button to toggle maximize/minimize view (hides header and sidebar)

'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/gradian-ui/shared/utils';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useLayoutContext } from '../contexts/LayoutContext';

export interface MaximizeButtonProps {
  className?: string;
  /**
   * Layout variant:
   * - "default": standard button size
   * - "inline": compact inline button (for headers/toolbars)
   */
  layout?: 'default' | 'inline';
  /** Translated label for maximize (tooltip and aria-label) */
  labelMaximize?: string;
  /** Translated label for minimize (tooltip and aria-label) */
  labelMinimize?: string;
  /**
   * Optional custom click handler.
   * When provided, the button works in controlled mode and won't toggle layout maximize state.
   */
  onClick?: () => void;
  /**
   * Optional controlled maximize state for custom mode.
   * Used only when `onClick` is provided.
   */
  isMaximized?: boolean;
  /** Render button with transparent background */
  transparentBackground?: boolean;
}

export const MaximizeButton: React.FC<MaximizeButtonProps> = ({
  className,
  layout = 'default',
  labelMaximize = 'Maximize view',
  labelMinimize = 'Minimize view',
  onClick,
  isMaximized: isMaximizedProp,
  transparentBackground = false,
}) => {
  const { isMaximized: layoutIsMaximized, toggleMaximize } = useLayoutContext();
  const isControlled = typeof onClick === 'function';
  const isMaximized = isControlled ? !!isMaximizedProp : layoutIsMaximized;
  const isInline = layout === 'inline';
  const tooltipLabel = isMaximized ? labelMinimize : labelMaximize;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={isControlled ? onClick : toggleMaximize}
            variant={transparentBackground ? 'ghost' : 'square'}
            size="sm"
            className={cn(
              isInline && 'h-11 w-11 p-0',
              transparentBackground &&
                'shadow-none text-gray-500 dark:text-gray-400 hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-gray-800 dark:hover:text-violet-300',
              className,
            )}
            aria-label={tooltipLabel}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

MaximizeButton.displayName = 'MaximizeButton';

