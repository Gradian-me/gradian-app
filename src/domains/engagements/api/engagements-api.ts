/**
 * Shared engagement API utilities.
 * Record-scoped: GET /api/data/{schemaId}/{instanceId}/engagements/{engagementType}
 */

import { apiRequest } from '@/gradian-ui/shared/utils/api';
import type { EngagementWithInteraction } from '../types';
import type { EngagementType } from '../types';

export interface FetchEngagementsParams {
  schemaId: string;
  instanceId: string;
  engagementType: EngagementType;
  currentUserId?: string | null;
  search?: string | null;
}

export async function fetchEngagements({
  schemaId,
  instanceId,
  engagementType,
  currentUserId,
  search,
}: FetchEngagementsParams): Promise<EngagementWithInteraction[]> {
  const params: Record<string, string> = {};
  if (currentUserId) params.currentUserId = currentUserId;
  if (search) params.search = search;

  const url = `/api/data/${encodeURIComponent(schemaId)}/${encodeURIComponent(instanceId)}/engagements/${encodeURIComponent(engagementType)}`;

  const res = await apiRequest<EngagementWithInteraction[]>(url, {
    method: 'GET',
    params: Object.keys(params).length ? params : undefined,
  });

  if (!res.success || !Array.isArray(res.data)) {
    return [];
  }
  return res.data;
}
