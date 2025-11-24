/**
 * Time and Duration Utilities
 * General-purpose utilities for formatting time durations and intervals
 */

/**
 * Formats a duration in seconds to a human-readable string
 * @param seconds - Duration in seconds
 * @param options - Formatting options
 * @returns Formatted duration string (e.g., "2d 5h", "3h 45m", "30m")
 * 
 * @example
 * formatDuration(86400) // "1d 0h"
 * formatDuration(3661) // "1h 1m"
 * formatDuration(120) // "2m"
 */
export function formatDuration(
  seconds: number,
  options?: {
    showSeconds?: boolean;
    compact?: boolean;
  }
): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (options?.showSeconds && seconds < 60) {
    return `${secs}s`;
  }
  
  if (days > 0) {
    if (options?.compact) {
      return `${days}d ${hours}h`;
    }
    return `${days}d ${hours}h`;
  }
  
  if (hours > 0) {
    if (options?.compact) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

/**
 * Formats uptime in seconds to human-readable string
 * Alias for formatDuration with compact format
 * @param seconds - Uptime in seconds
 * @returns Formatted uptime string
 * 
 * @example
 * formatUptime(86400) // "1d 0h"
 * formatUptime(3661) // "1h 1m"
 */
export function formatUptime(seconds: number): string {
  return formatDuration(seconds, { compact: true });
}

