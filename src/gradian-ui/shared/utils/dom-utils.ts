/**
 * DOM Utilities
 * General-purpose utilities for DOM manipulation and interactions
 */

export interface ScrollToElementOptions {
  /**
   * Scroll behavior (default: 'smooth')
   */
  behavior?: ScrollBehavior;
  /**
   * Block alignment (default: 'start')
   */
  block?: ScrollLogicalPosition;
  /**
   * Inline alignment (default: 'nearest')
   */
  inline?: ScrollLogicalPosition;
  /**
   * CSS classes to add for highlight effect
   */
  highlightClasses?: string[];
  /**
   * Duration in milliseconds to keep highlight classes (default: 2000)
   */
  highlightDuration?: number;
}

/**
 * Scrolls to an element by ID with optional highlight effect
 * @param elementId - The ID of the element to scroll to
 * @param options - Scroll and highlight options
 * @returns True if element was found and scrolled to, false otherwise
 * 
 * @example
 * scrollToElement('my-card', {
 *   highlightClasses: ['ring-2', 'ring-blue-500', 'ring-offset-2'],
 *   highlightDuration: 3000
 * })
 */
export function scrollToElement(
  elementId: string,
  options: ScrollToElementOptions = {}
): boolean {
  const {
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest',
    highlightClasses = [],
    highlightDuration = 2000,
  } = options;

  const element = document.getElementById(elementId);
  if (!element) return false;

  element.scrollIntoView({ behavior, block, inline });

  // Add highlight effect if classes provided
  if (highlightClasses.length > 0) {
    element.classList.add(...highlightClasses);
    setTimeout(() => {
      element.classList.remove(...highlightClasses);
    }, highlightDuration);
  }

  return true;
}

/**
 * Scrolls to an element by selector with optional highlight effect
 * @param selector - CSS selector for the element
 * @param options - Scroll and highlight options
 * @returns True if element was found and scrolled to, false otherwise
 * 
 * @example
 * scrollToSelector('.my-card', {
 *   highlightClasses: ['ring-2', 'ring-blue-500']
 * })
 */
export function scrollToSelector(
  selector: string,
  options: ScrollToElementOptions = {}
): boolean {
  const element = document.querySelector(selector) as HTMLElement;
  if (!element) return false;

  const {
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest',
    highlightClasses = [],
    highlightDuration = 2000,
  } = options;

  element.scrollIntoView({ behavior, block, inline });

  // Add highlight effect if classes provided
  if (highlightClasses.length > 0) {
    element.classList.add(...highlightClasses);
    setTimeout(() => {
      element.classList.remove(...highlightClasses);
    }, highlightDuration);
  }

  return true;
}

/**
 * Scrolls an input element into view when it receives focus, especially useful on mobile
 * when the keyboard opens. Accounts for keyboard height using visual viewport API.
 * @param element - The input element to scroll into view
 * @param options - Scroll options
 * @returns True if element was scrolled into view, false otherwise
 * 
 * @example
 * // In an input's onFocus handler:
 * onFocus={(e) => {
 *   scrollInputIntoView(e.currentTarget);
 *   onFocus?.();
 * }}
 */
export function scrollInputIntoView(
  element: HTMLElement | null,
  options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    delay?: number;
  } = {}
): boolean {
  if (!element) return false;

  const {
    behavior = 'smooth',
    block = 'nearest', // Use 'nearest' instead of 'center' to avoid creating extra space
    inline = 'nearest',
    delay = 0,
  } = options;

  const scrollIntoView = () => {
    // Check if element is already visible in viewport - if so, don't scroll
    const elementRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Check if element is at least partially visible (with some margin)
    // We only scroll if the element is significantly outside the viewport
    const margin = 50; // Small margin in pixels
    const isVisible = 
      elementRect.top >= -margin &&
      elementRect.bottom <= viewportHeight + margin;
    
    // Only scroll if element is not visible
    if (!isVisible) {
      // Use scrollIntoView with block: 'nearest' to scroll minimally
      element.scrollIntoView({
        behavior,
        block, // Use provided block option (default 'nearest')
        inline,
      });
    }
    
    // On mobile devices with keyboard, do a minimal adjustment only if element is hidden
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice && window.visualViewport && !isVisible) {
      // Wait a bit for the keyboard to open, then check if additional adjustment is needed
      setTimeout(() => {
        const visualViewport = window.visualViewport;
        if (!visualViewport) return; // Guard against null
        
        const newElementRect = element.getBoundingClientRect();
        const vpHeight = visualViewport.height;
        const vpTop = visualViewport.offsetTop;
        
        // Check if element is visible in the visual viewport (above keyboard)
        const elemTop = newElementRect.top - vpTop;
        const elemBottom = newElementRect.bottom - vpTop;
        
        // Only adjust if element is actually hidden
        // If element is below visible area
        if (elemBottom > vpHeight - 20) {
          // Scroll down just enough to make it visible with small margin
          const scrollAdjustment = elemBottom - (vpHeight - 40); // 40px margin from bottom
          if (scrollAdjustment > 10 && window.scrollY !== undefined) {
            window.scrollBy({
              top: scrollAdjustment,
              behavior: 'smooth',
            });
          }
        }
        // If element is above visible area
        else if (elemTop < -20) {
          // Scroll up just enough to make it visible with small margin
          const scrollAdjustment = elemTop + 40; // 40px margin from top
          if (scrollAdjustment < -10 && window.scrollY !== undefined) {
            window.scrollBy({
              top: scrollAdjustment,
              behavior: 'smooth',
            });
          }
        }
      }, 300); // Wait for keyboard animation
    }
  };

  if (delay > 0) {
    setTimeout(scrollIntoView, delay);
  } else {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      scrollIntoView();
    });
  }

  return true;
}

