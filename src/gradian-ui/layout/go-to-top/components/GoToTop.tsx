'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../shared/utils';
import { CircularProgress } from '@/gradian-ui/analytics/indicators/kpi-list/components/CircularProgress';

export interface GoToTopProps {
  /**
   * Minimum scroll position (in pixels) before showing the button
   * @default 300
   */
  threshold?: number;
  
  /**
   * CSS class name
   */
  className?: string;
  
  /**
   * Position of the button
   * @default "bottom-right"
   */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  
  /**
   * Whether to show the button
   * @default true
   */
  show?: boolean;
  
  /**
   * Optional scroll container selector (e.g., '[data-scroll-container]')
   * If not provided, listens to window scroll
   */
  scrollContainerSelector?: string;
}

/**
 * GoToTop - Scroll to top button component
 * Shows a button when user scrolls down and allows smooth scroll to top
 * Supports both window scrolling and custom scroll containers
 */
export const GoToTop: React.FC<GoToTopProps> = ({
  threshold = 100,
  className,
  position = 'bottom-right',
  show = true,
  scrollContainerSelector
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;
    let cleanupFn: (() => void) | null = null;
    let mutationObserver: MutationObserver | null = null;

    // Find scroll container if selector provided
    const findContainer = (): HTMLElement | null => {
      if (!scrollContainerSelector) return null;
      
      // Try direct selector first
      const container = document.querySelector(scrollContainerSelector) as HTMLElement;
      if (container) {
        return container;
      }
      
      // Fallback: try to find Radix ScrollArea viewport
      if (scrollContainerSelector.includes('form-dialog-scroll')) {
        // Method 1: Find by data attribute
        const scrollArea = document.querySelector('[data-scroll-container="form-dialog-scroll"]') as HTMLElement;
        if (scrollArea) {
          // Find Radix ScrollArea viewport - it has data-radix-scroll-area-viewport attribute
          const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          if (viewport) {
            return viewport;
          }
        }
        
        // Method 2: Find dialog and then find viewport inside it
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
        if (dialog) {
          const dialogViewport = dialog.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          if (dialogViewport) {
            return dialogViewport;
          }
        }
      }
      
      // Generic fallback: look for any ScrollArea viewport in open dialogs
      if (scrollContainerSelector.includes('form-dialog') || scrollContainerSelector.includes('dialog')) {
        const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
        if (dialog) {
          const dialogViewport = dialog.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          if (dialogViewport) {
            return dialogViewport;
          }
        }
      }
      
      return null;
    };

    const getScrollInfo = (): { position: number; max: number } => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const max = Math.max(container.scrollHeight - container.clientHeight, 0);
        return { position: container.scrollTop, max };
      }

      const doc = document.documentElement;
      const body = document.body;
      const scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
      const scrollHeight = Math.max(
        body.scrollHeight,
        doc.scrollHeight,
        body.offsetHeight,
        doc.offsetHeight,
        body.clientHeight,
        doc.clientHeight
      );
      const max = Math.max(scrollHeight - window.innerHeight, 0);
      return { position: scrollTop, max };
    };

    const updateVisibilityAndProgress = () => {
      if (!mounted) return;
      const { position, max } = getScrollInfo();
      setIsVisible(position > threshold);

      if (max > 0) {
        const pct = Math.min(100, Math.max(0, (position / max) * 100));
        setScrollProgress(pct);
      } else {
        setScrollProgress(0);
      }
    };

    const setupScrollListener = () => {
      if (!mounted) return null;

      const container = findContainer();
      const currentContainer = container || scrollContainerRef.current;
      if (currentContainer) {
        scrollContainerRef.current = currentContainer;
      }

      // Store references for cleanup
      const containerToListen = scrollContainerRef.current;

      // Listen to container scroll if found
      if (containerToListen) {
        containerToListen.addEventListener('scroll', updateVisibilityAndProgress, { passive: true });
      }
      
      // Also listen to window (as fallback or primary if no container)
      window.addEventListener('scroll', updateVisibilityAndProgress, { passive: true });
      
      // Initial check
      updateVisibilityAndProgress();

      return () => {
        if (containerToListen) {
          containerToListen.removeEventListener('scroll', updateVisibilityAndProgress);
        }
        window.removeEventListener('scroll', updateVisibilityAndProgress);
      };
    };

    // Initial setup
    cleanupFn = setupScrollListener();

    // Retry if container not found (for dynamic content like dialogs)
    if (scrollContainerSelector && !scrollContainerRef.current) {
      const maxRetries = 30; // Increased retries for dialogs
      let retries = 0;
      
      const retry = () => {
        if (!mounted || retries >= maxRetries) return;
        
        retries++;
        if (cleanupFn) {
          cleanupFn();
        }
        cleanupFn = setupScrollListener();
        
        if (!scrollContainerRef.current && retries < maxRetries) {
          retryTimeout = setTimeout(retry, 200); // Longer delay for dialogs
        }
      };
      
      // Also use MutationObserver to watch for dialog/content changes
      if (typeof MutationObserver !== 'undefined') {
        mutationObserver = new MutationObserver(() => {
          if (!scrollContainerRef.current && mounted) {
            const container = findContainer();
            if (container) {
              if (cleanupFn) {
                cleanupFn();
              }
              cleanupFn = setupScrollListener();
            }
          }
        });
        
        // Observe the document body for changes
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
      
      retryTimeout = setTimeout(retry, 100);
    }

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      if (cleanupFn) {
        cleanupFn();
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [threshold, scrollContainerSelector]);

  const scrollToTop = useCallback(() => {
    const container = scrollContainerRef.current;

    // Cancel any ongoing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const start =
      container && typeof container.scrollTop === 'number'
        ? container.scrollTop
        : (window.pageYOffset ||
            document.documentElement.scrollTop ||
            window.scrollY ||
            0);
    const duration = 800; // ms
    const startTime = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const next = start * (1 - eased);

      if (container) {
        container.scrollTop = next;
      } else {
        window.scrollTo(0, next);
      }

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(frame);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(frame);
  }, []);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2'
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className={cn('fixed z-50', positionClasses[position], className)}
        >
          <div className="relative flex items-center justify-center">
            {/* Circular scroll progress border */}
            <CircularProgress
              progress={scrollProgress}
              size={46}
              strokeWidth={4}
              color={['#A200FF']}
              showLabel={false}
              className="pointer-events-none"
            />
            {/* Center button */}
            <Button
              onClick={scrollToTop}
              size="icon"
              variant="outline"
              className={cn(
                'absolute h-9 w-9 rounded-full',
                'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
                'border border-gray-400/80 dark:border-gray-500/80',
                'shadow-md hover:shadow-lg',
                'text-gray-700 dark:text-gray-200',
                'hover:text-violet-500 dark:hover:text-violet-300',
                'transition-all duration-200',
                'hover:scale-105 active:scale-95',
                'hover:bg-white dark:hover:bg-gray-900'
              )}
              aria-label="Scroll to top"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

GoToTop.displayName = 'GoToTop';

