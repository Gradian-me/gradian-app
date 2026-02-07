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
}

export const MaximizeButton: React.FC<MaximizeButtonProps> = ({
  className,
  layout = 'default',
  labelMaximize = 'Maximize view',
  labelMinimize = 'Minimize view',
}) => {
  const { isMaximized, toggleMaximize } = useLayoutContext();
  const isInline = layout === 'inline';
  const tooltipLabel = isMaximized ? labelMinimize : labelMaximize;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleMaximize}
            variant="outline"
            size={isInline ? 'icon' : 'sm'}
            className={cn(
              isInline
                ? 'h-11 w-11 p-0 rounded-xl'
                : 'h-10 w-10 p-0 rounded-lg',
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

