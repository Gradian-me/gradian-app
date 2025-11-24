/**
 * Re-export shared scroll utilities
 * These utilities are now in @/gradian-ui/shared/utils
 */
import { scrollToElement, scrollToSelector } from '@/gradian-ui/shared/utils/dom-utils';

export { scrollToElement, scrollToSelector };

/**
 * Scroll to a service card with highlight effect
 * Convenience wrapper for scrollToElement with health-specific defaults
 */
export const scrollToService = (serviceId: string): void => {
  scrollToElement(`service-card-${serviceId}`, {
    highlightClasses: ['ring-2', 'ring-red-500', 'ring-offset-2'],
    highlightDuration: 2000,
  });
};

