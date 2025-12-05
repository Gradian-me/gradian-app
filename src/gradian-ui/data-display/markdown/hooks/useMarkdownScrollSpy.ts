'use client';

import { useState, useEffect, useRef } from 'react';

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Hook to track which heading is currently active based on URL hash (ID)
 * Updates hash when scrolling to keep URL in sync with visible heading
 */
export function useMarkdownScrollSpy(headings: Heading[]) {
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>();
  const isUpdatingHashRef = useRef(false);
  const activeHeadingIdRef = useRef<string | undefined>(undefined);
  
  // Keep ref in sync with state
  useEffect(() => {
    activeHeadingIdRef.current = activeHeadingId;
  }, [activeHeadingId]);

  // Get initial hash from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1); // Remove #
      if (hash && headings.some(h => h.id === hash)) {
        setActiveHeadingId(hash);
      }
    }
  }, [headings]);

  useEffect(() => {
    if (headings.length === 0) return;

    // Wait for DOM to be ready
    const findHeadingElements = () => {
      const found = headings.map(({ id }) => {
        const element = document.getElementById(id);
        if (!element) {
          console.warn(`Heading element not found: #${id}`);
        }
        return { id, element };
      }).filter(item => item.element !== null) as Array<{ id: string; element: HTMLElement }>;
      
      console.log(`Found ${found.length} of ${headings.length} heading elements in DOM`);
      return found;
    };

    // Try to find elements immediately, but also retry after a short delay
    let headingElements = findHeadingElements();
    let cleanup: (() => void) | null = null;
    
    // If no elements found, wait a bit and try again (DOM might not be ready)
    if (headingElements.length === 0) {
      const timeoutId = setTimeout(() => {
        headingElements = findHeadingElements();
        if (headingElements.length === 0) {
          console.warn('No heading elements found in DOM after retry. Expected IDs:', headings.map(h => `#${h.id}`));
          return;
        }
        cleanup = setupObserver(headingElements);
      }, 500);
      return () => {
        clearTimeout(timeoutId);
        cleanup?.();
      };
    }

    cleanup = setupObserver(headingElements);
    
    function setupObserver(headingElements: Array<{ id: string; element: HTMLElement }>): () => void {
      if (headingElements.length === 0) return () => {};

      const headerOffset = 100; // Account for sticky header
      const threshold = headerOffset + 20; // Threshold for "active" heading

      // Find the currently visible heading based on scroll position
      const findActiveHeading = (): string | undefined => {
        let activeId: string | undefined;
        let bestHeading: { id: string; element: HTMLElement } | null = null;
        let bestPosition = -Infinity;
        
        // Check all headings by ID to find the one closest to the threshold
        for (const { id, element } of headingElements) {
          if (element) {
            const rect = element.getBoundingClientRect();
            const top = rect.top;
            
            // Heading is above or at the threshold, and is the highest one
            if (top <= threshold && top > bestPosition) {
              bestPosition = top;
              bestHeading = { id, element };
            }
          }
        }
        
        // If we found a heading, use it
        if (bestHeading) {
          activeId = bestHeading.id;
        } else if (headingElements.length > 0) {
          // If we're at the top, use the first heading
          const firstHeading = headingElements[0];
          if (firstHeading.element) {
            const firstTop = firstHeading.element.getBoundingClientRect().top;
            if (firstTop > threshold) {
              activeId = firstHeading.id;
            } else {
              // We're past all headings, use the last one
              const lastHeading = headingElements[headingElements.length - 1];
              activeId = lastHeading.id;
            }
          }
        }
        
        return activeId;
      };

      // Update hash and active state
      const updateActiveHeading = (id: string | undefined) => {
        const currentActiveId = activeHeadingIdRef.current;
        if (id && id !== currentActiveId) {
          setActiveHeadingId(id);
          
          // Update URL hash if it's different (but don't trigger hashchange event)
          if (!isUpdatingHashRef.current && window.location.hash.slice(1) !== id) {
            isUpdatingHashRef.current = true;
            window.history.replaceState(null, '', `#${id}`);
            setTimeout(() => {
              isUpdatingHashRef.current = false;
            }, 100);
          }
        } else if (!id && currentActiveId) {
          setActiveHeadingId(undefined);
        }
      };

      // Listen to scroll events to detect visible heading
      let scrollTimeout: NodeJS.Timeout;
      const handleScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (!isUpdatingHashRef.current) {
            const activeId = findActiveHeading();
            updateActiveHeading(activeId);
          }
        }, 50); // Debounce scroll events
      };

      // Listen to hash changes in URL (from navigation clicks or browser back/forward)
      const handleHashChange = () => {
        if (!isUpdatingHashRef.current) {
          const hash = window.location.hash.slice(1); // Remove #
          if (hash && headingElements.some(h => h.id === hash)) {
            setActiveHeadingId(hash);
          } else if (!hash) {
            setActiveHeadingId(undefined);
          }
        }
      };

      // Listen to popstate for browser back/forward
      const handlePopState = () => {
        handleHashChange();
      };

      // Initial check
      const initialHash = window.location.hash.slice(1);
      if (initialHash && headingElements.some(h => h.id === initialHash)) {
        setActiveHeadingId(initialHash);
      } else {
        // No hash in URL, find the visible heading
        setTimeout(() => {
          const activeId = findActiveHeading();
          updateActiveHeading(activeId);
        }, 100);
      }

      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('hashchange', handleHashChange);
      window.addEventListener('popstate', handlePopState);

      return () => {
        clearTimeout(scrollTimeout);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('popstate', handlePopState);
      };
    }
    
    return () => {
      cleanup?.();
    };
  }, [headings]); // Only depend on headings, activeHeadingId is managed internally

  return activeHeadingId;
}

