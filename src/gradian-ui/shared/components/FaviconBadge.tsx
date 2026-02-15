'use client';

import React from 'react';
import { useFaviconBadge } from '../hooks/use-favicon-badge';
import { useCountFromUrl } from '../hooks/use-count-from-url';

export interface FaviconBadgeProps {
  /**
   * Use when the parent already has the count (e.g. from useNotificationCount).
   * When provided, countUrl is ignored.
   */
  count?: number;
  /**
   * GET URL that returns { success: boolean, data: number }. Used when count is not provided.
   * Example: "/api/engagements/notifications/count?isRead=false"
   */
  countUrl?: string | null;
  /** Override base favicon URL. Default: /logo/favicon.ico */
  faviconUrl?: string;
  /** Poll interval in ms when using countUrl. Default 60_000. Set 0 to disable. */
  pollIntervalMs?: number;
}

/**
 * Renders nothing; applies a badge with the given count over the document favicon.
 * When count is 0 or undefined, restores the original favicon.
 * Use on a specific tab (e.g. notifications page) so the badge is shown only when that tab is active.
 * Reusable: use count for existing data or countUrl for standalone badge from API.
 */
export function FaviconBadge({
  count: countProp,
  countUrl,
  faviconUrl,
  pollIntervalMs = 60_000,
}: FaviconBadgeProps) {
  const { count: countFromUrl } = useCountFromUrl(
    countProp !== undefined ? null : countUrl ?? null,
    { pollIntervalMs, refetchOnFocus: true, initialCount: 0 }
  );

  const count = countProp !== undefined ? countProp : countFromUrl;

  useFaviconBadge(count, { faviconUrl });

  return null;
}
