'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../shared/utils';

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
  const scrollContainerRef = useRef<HTMLElement | null>(null);

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

    const getScrollPosition = (): number => {
      if (scrollContainerRef.current) {
        return scrollContainerRef.current.scrollTop;
      }
      return window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
    };

    const toggleVisibility = () => {
      if (!mounted) return;
      const scrollPosition = getScrollPosition();
      setIsVisible(scrollPosition > threshold);
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
      const shouldListenToWindow = !containerToListen || scrollContainerSelector;

      // Listen to container scroll if found
      if (containerToListen) {
        containerToListen.addEventListener('scroll', toggleVisibility, { passive: true });
      }
      
      // Also listen to window (as fallback or primary if no container)
      window.addEventListener('scroll', toggleVisibility, { passive: true });
      
      // Initial check
      toggleVisibility();

      return () => {
        if (containerToListen) {
          containerToListen.removeEventListener('scroll', toggleVisibility);
        }
        window.removeEventListener('scroll', toggleVisibility);
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
    };
  }, [threshold, scrollContainerSelector]);

  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
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
          className={cn(
            'fixed z-50',
            positionClasses[position],
            className
          )}
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            variant="outline"
            className={cn(
              'h-10 w-10 rounded-full',
              'bg-white/90 backdrop-blur-sm',
              'border-gray-400 hover:border-violet-400',
              'shadow-md hover:shadow-lg',
              'text-gray-700 hover:text-violet-600',
              'transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'hover:bg-white'
            )}
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

GoToTop.displayName = 'GoToTop';

