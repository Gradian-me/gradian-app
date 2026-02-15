/**
 * Discussion API utilities
 * Fetch and post discussions via engagement APIs
 */

import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { fetchEngagements } from '@/domains/engagements/api';
import type { Engagement, EngagementWithInteraction, EngagementInteraction } from '../types';

export interface FetchDiscussionsParams {
  schemaId: string;
  instanceId: string;
  currentUserId?: string | null;
}

/** Fetch discussions for a record. Convenience wrapper around fetchEngagements. */
export async function fetchDiscussions(
  params: FetchDiscussionsParams,
): Promise<EngagementWithInteraction[]> {
  return fetchEngagements({
    ...params,
    engagementType: 'discussion',
  });
}

export interface FetchInteractionsParams {
  engagementIds: string[];
  userId: string;
}

export async function fetchInteractions({
  engagementIds,
  userId,
}: FetchInteractionsParams): Promise<EngagementInteraction[]> {
  if (engagementIds.length === 0) return [];
  const params = new URLSearchParams({
    engagementIds: engagementIds.join(','),
    userId,
  });
  const url = `/api/engagement-interactions?${params}`;

  const res = await apiRequest<{ success: boolean; data: EngagementInteraction[] }>(url, {
    method: 'GET',
  });

  if (!res.success || !Array.isArray(res.data)) {
    return [];
  }
  return res.data;
}

export interface CreateDiscussionParams {
  schemaId: string;
  instanceId: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  referenceEngagementId?: string;
}

export async function createDiscussion({
  schemaId,
  instanceId,
  message,
  priority,
  referenceEngagementId,
}: CreateDiscussionParams): Promise<Engagement> {
  const url = `/api/data/${encodeURIComponent(schemaId)}/${encodeURIComponent(instanceId)}/engagements/discussion`;

  const body: Record<string, unknown> = {
    message: String(message || '').trim(),
    priority: priority ?? 'medium',
  };
  // Do not send createdBy: API uses user store / JWT (live mode).
  if (referenceEngagementId) {
    body.referenceEngagementId = referenceEngagementId;
  }

  const res = await apiRequest<Engagement>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.success || !res.data) {
    throw new Error('Failed to create discussion');
  }
  return res.data;
}
