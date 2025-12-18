import { formatDistanceToNow, format } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * Formats a date as a relative time (e.g., "11 months ago")
 * @param date - The date to format
 * @param options - Optional formatting options
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | string,
  options?: { addSuffix?: boolean }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, {
    addSuffix: options?.addSuffix ?? true,
    locale: enUS,
  });
}

/**
 * Formats a date in a readable format (e.g., "December 10, 2024 at 11:00 AM")
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatFullDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'PPpp', { locale: enUS });
}

/**
 * Formats a date in a short format (e.g., "Dec 10, 2024 11:00 AM")
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatShortDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm', { locale: enUS });
}

/**
 * Formats a date with date and time (e.g., "Dec 10, 2024 11:00 AM")
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm', { locale: enUS });
}

/**
 * Formats a date for display (e.g., "December 10, 2024")
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'PPP', { locale: enUS });
}

/**
 * Formats a date with time only (e.g., "11:00 AM")
 * @param date - The date to format
 * @returns Formatted time string
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'p', { locale: enUS });
}

/**
 * Creates a formatted "Created" label with relative time and full date for tooltip
 * @param date - The date to format
 * @returns Object with display text and tooltip text
 * @example
 * const label = formatCreatedLabel(new Date());
 * // Use with Tooltip component:
 * <Tooltip>
 *   <TooltipTrigger>{label.display}</TooltipTrigger>
 *   <TooltipContent>{label.tooltip}</TooltipContent>
 * </Tooltip>
 */
export function formatCreatedLabel(date: Date | string): {
  display: string;
  tooltip: string;
  /** @deprecated Use `tooltip` instead. Kept for backward compatibility. */
  title: string;
} {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const tooltipText = formatFullDate(dateObj);
  return {
    display: formatRelativeTime(dateObj),
    tooltip: tooltipText,
    title: tooltipText, // Backward compatibility
  };
}

/**
 * Formats a date with custom format string
 * @param date - The date to format
 * @param formatString - The format string (e.g., 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatCustom(
  date: Date | string,
  formatString: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatString, { locale: enUS });
}

/**
 * Formats a date with date and time, with fallback for null/empty values
 * @param dateString - The date string to format (can be null or empty)
 * @param fallback - Fallback text when date is null/empty (default: 'Never')
 * @returns Formatted date string or fallback
 * 
 * @example
 * formatDateTimeWithFallback('2024-12-10T10:30:00Z') // "Dec 10, 2024 10:30 AM"
 * formatDateTimeWithFallback(null) // "Never"
 * formatDateTimeWithFallback(null, 'Not set') // "Not set"
 */
export function formatDateTimeWithFallback(
  dateString: string | null | undefined,
  fallback: string = 'Never'
): string {
  if (!dateString) return fallback;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallback;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch {
    return fallback;
  }
}

/**
 * Gets the current date and time in format: yyyy-MM-dd HH:mm:ss.ms
 * Useful for AI prompts and time-related analytics
 * @returns Formatted date/time string (e.g., "2025-01-22 14:30:45.123")
 */
export function getCurrentDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

