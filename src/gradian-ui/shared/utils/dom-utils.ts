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

