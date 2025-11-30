'use client';

import { useState, useEffect } from 'react';

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Hook to track which heading is currently active based on scroll position
 */
export function useMarkdownScrollSpy(headings: Heading[]) {
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>();

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

      const observerOptions = {
        root: null,
        rootMargin: '-100px 0px -80% 0px', // Trigger when heading is near top
        threshold: [0, 0.25, 0.5, 0.75, 1]
      };

      const observerCallback = (entries: IntersectionObserverEntry[]) => {
        // Find all intersecting entries that are above the threshold (100px for header)
        const intersecting = entries
          .filter(entry => {
            const top = entry.boundingClientRect.top;
            return entry.isIntersecting && top >= 0 && top <= 150;
          })
          .sort((a, b) => {
            // Sort by position from top (closest to top first)
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });

        if (intersecting.length > 0) {
          // Use the first (topmost) intersecting heading by ID
          const activeId = intersecting[0].target.id;
          if (activeId) {
            setActiveHeadingId(activeId);
          }
        }
      };

      const observer = new IntersectionObserver(observerCallback, observerOptions);

      // Observe all headings
      headingElements.forEach(({ element }) => {
        if (element) {
          observer.observe(element);
        }
      });

      // Also listen to scroll events for better accuracy - ID-based detection
      const handleScroll = () => {
        const headerOffset = 100; // Account for sticky header
        const threshold = headerOffset + 50; // Threshold for "active" heading
        
        // Find the heading that's currently at or just above the viewport top
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
        
        // If we found a heading, use it; otherwise, check if we're past all headings
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
        
        if (activeId) {
          setActiveHeadingId(activeId);
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      // Wait for DOM to be ready
      setTimeout(handleScroll, 100);

      return () => {
        observer.disconnect();
        window.removeEventListener('scroll', handleScroll);
      };
    }
    
    return () => {
      cleanup?.();
    };
  }, [headings]);

  return activeHeadingId;
}

