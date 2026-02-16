/**
 * Helpers for engagementCounts from /api/data response.
 * Shape: [{ todo: 0 }, { sticky: 0 }, { notification: 0 }, { discussion: 1 }]
 */

export type EngagementCountItem = Record<string, number>;

/**
 * Get discussion count from API engagementCounts array.
 * Returns 0 if missing or invalid.
 */
export function getDiscussionCount(engagementCounts: unknown): number {
  if (!Array.isArray(engagementCounts)) return 0;
  const item = engagementCounts.find(
    (x): x is EngagementCountItem =>
      x != null && typeof x === 'object' && typeof (x as Record<string, number>).discussion === 'number'
  );
  return item ? Number(item.discussion) : 0;
}
