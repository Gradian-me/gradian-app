'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { isRTL } from '@/gradian-ui/shared/utils/translation-utils';

export interface GoToTopFormProps {
  /**
   * Minimum scroll position (in pixels) before showing the button
   * @default 100
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
   * If not provided, tries to auto-detect form scroll containers
   */
  scrollContainerSelector?: string;
}

/**
 * GoToTopForm - Scroll to top button component specifically for forms
 * Automatically detects form dialog scroll containers and form scroll areas
 */
export const GoToTopForm: React.FC<GoToTopFormProps> = ({
  threshold = 100,
  className,
  position = 'bottom-right',
  show = true,
  scrollContainerSelector
}) => {
  const language = useLanguageStore((s) => s.getLanguage()) ?? 'en';
  const rtl = isRTL(language);
  const [isVisible, setIsVisible] = useState(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;
    let cleanupFn: (() => void) | null = null;
    let mutationObserver: MutationObserver | null = null;

    // Find scroll container - prioritize form dialog containers
    const findContainer = (): HTMLElement | null => {
      // If custom selector provided, use it
      if (scrollContainerSelector) {
        const container = document.querySelector(scrollContainerSelector) as HTMLElement;
        if (container) {
          return container;
        }
      }

      // Auto-detect: Try to find form dialog scroll area viewport
      const formDialogForm = document.getElementById('form-dialog-form');
      if (formDialogForm) {
        // Find the ScrollArea parent
        const scrollArea = formDialogForm.closest('[data-scroll-container="form-dialog-scroll"]') ||
                         formDialogForm.closest('[data-radix-scroll-area-root]');
        
        if (scrollArea) {
          const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          if (viewport) {
            return viewport;
          }
        }
      }

      // Auto-detect: Find any open dialog's scroll viewport
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      if (dialog) {
        const dialogViewport = dialog.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (dialogViewport) {
          return dialogViewport;
        }
        
        // Fallback: check if dialog itself is scrollable
        const dialogContent = dialog.querySelector('[class*="DialogContent"]') as HTMLElement;
        if (dialogContent && dialogContent.scrollHeight > dialogContent.clientHeight) {
          return dialogContent;
        }
      }

      // Auto-detect: Find form element and check if its container is scrollable
      const formElement = document.getElementById('form-dialog-form') || 
                         document.querySelector('form');
      if (formElement) {
        let parent = formElement.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
          if (parent.scrollHeight > parent.clientHeight) {
            return parent;
          }
          parent = parent.parentElement;
          depth++;
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
      
      // Listen to container scroll if found
      if (containerToListen) {
        containerToListen.addEventListener('scroll', toggleVisibility, { passive: true });
      }
      
      // Also listen to window (as fallback)
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
    if (!scrollContainerRef.current) {
      const maxRetries = 30;
      let retries = 0;
      
      const retry = () => {
        if (!mounted || retries >= maxRetries) return;
        
        retries++;
        if (cleanupFn) {
          cleanupFn();
        }
        cleanupFn = setupScrollListener();
        
        if (!scrollContainerRef.current && retries < maxRetries) {
          retryTimeout = setTimeout(retry, 200);
        }
      };
      
      // Use MutationObserver to watch for dialog/content changes
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
    const startTime = performance.now();
    const duration = 500;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      if (scrollContainerRef.current) {
        const start = scrollContainerRef.current.scrollTop;
        scrollContainerRef.current.scrollTop = start * (1 - eased);
      } else {
        const start = window.scrollY ?? document.documentElement.scrollTop;
        window.scrollTo(0, start * (1 - eased));
      }

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, []);

  const positionClasses: Record<typeof position, string> = {
    'bottom-right': 'bottom-6 end-4 md:end-6',
    'bottom-left': 'bottom-6 start-6',
    'bottom-center': 'bottom-6 start-1/2 -translate-x-1/2'
  };

  // For dialogs/forms with ScrollArea, position relative to avoid scrollbar
  const isInDialog = typeof window !== 'undefined' && 
    (document.querySelector('[role="dialog"]') !== null || 
     document.getElementById('form-dialog-form') !== null);

  const dialogPositionClasses: Record<typeof position, string> = {
    'bottom-right': 'bottom-5 end-10',
    'bottom-left': 'bottom-5 start-10',
    'bottom-center': 'bottom-8 start-1/2 -translate-x-1/2'
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          dir={rtl ? 'rtl' : 'ltr'}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className={cn(
            'fixed z-100',
            isInDialog ? dialogPositionClasses[position] : positionClasses[position],
            className
          )}
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            variant="outline"
            className={cn(
              'h-9 w-9 rounded-full',
              'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
              'border border-violet-300 dark:border-violet-700 hover:border-violet-400',
              'shadow-md hover:shadow-lg',
              'text-violet-700 dark:text-violet-300 hover:text-violet-600',
              'transition-all duration-200',
              'hover:scale-105 active:scale-95',
              'hover:bg-white dark:hover:bg-gray-900'
            )}
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

GoToTopForm.displayName = 'GoToTopForm';

