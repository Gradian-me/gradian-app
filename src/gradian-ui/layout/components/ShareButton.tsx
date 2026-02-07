// ShareButton Component
// Button that opens the browser's native share dialog

import React from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/gradian-ui/shared/utils';

export interface ShareButtonProps {
  value: string;
  title?: string;
  text?: string;
  /** Translated label for tooltip and aria-label */
  tooltipLabel?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  value,
  title,
  text,
  tooltipLabel,
  className,
  variant = 'outline',
  size = 'md',
  disabled = false,
}) => {
  const label = tooltipLabel ?? 'Share';
  const handleShare = async () => {
    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Share',
          text: text || value,
          url: value,
        });
      } catch (error) {
        // User cancelled or error occurred
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(value);
        // You might want to show a toast notification here
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy to clipboard');
      }
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleShare}
            disabled={disabled}
            variant={variant}
            className={cn(sizeClasses[size], 'p-0', className)}
            aria-label={label}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

ShareButton.displayName = 'ShareButton';

