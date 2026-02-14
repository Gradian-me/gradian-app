'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUserStore } from '@/stores/user.store';
import { fetchDiscussions, type FetchDiscussionsParams } from '../utils/discussion-api';
import type { DiscussionMessage } from '../types';

export interface UseDiscussionsOptions extends FetchDiscussionsParams {
  enabled?: boolean;
}

export interface UseDiscussionsReturn {
  discussions: DiscussionMessage[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDiscussions({
  schemaId,
  instanceId,
  currentUserId: currentUserIdProp,
  enabled = true,
}: UseDiscussionsOptions): UseDiscussionsReturn {
  const storeUserId = useUserStore((s) => s.user?.id ?? null);
  const currentUserId = currentUserIdProp ?? storeUserId ?? undefined;

  const [discussions, setDiscussions] = useState<DiscussionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !schemaId || !instanceId) {
      setDiscussions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchDiscussions({
        schemaId,
        instanceId,
        currentUserId,
      });

      const enriched: DiscussionMessage[] = list.map((e) => ({
        ...e,
        interactions: e.interactions ?? (e.interaction ? [e.interaction] : []),
      }));

      setDiscussions(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discussions');
      setDiscussions([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, schemaId, instanceId, currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  return { discussions, isLoading, error, refetch: load };
}
