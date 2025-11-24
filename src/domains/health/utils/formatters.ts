/**
 * Re-export shared utilities for convenience
 * These utilities are now in @/gradian-ui/shared/utils
 */
export { formatUptime, formatDuration } from '@/gradian-ui/shared/utils/time-utils';
export { formatDateTimeWithFallback } from '@/gradian-ui/shared/utils/date-utils';

/**
 * Format date string to readable format
 * @deprecated Use formatDateTimeWithFallback from @/gradian-ui/shared/utils/date-utils instead
 */
export const formatDate = (dateString: string | null): string => {
  return formatDateTimeWithFallback(dateString);
};

