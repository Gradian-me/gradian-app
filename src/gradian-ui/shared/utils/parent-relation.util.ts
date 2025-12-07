import { apiRequest } from '@/gradian-ui/shared/utils/api';

interface SyncParentRelationOptions {
  schemaId: string;
  childId: string;
  parentId?: string | null;
}

const RELATION_TYPE_ID = 'IS_PARENT_OF';

/**
 * Synchronize IS_PARENT_OF relation for a given child:
 * - Removes existing parent relations for this child
 * - Creates a new one if parentId is provided
 */
export const syncParentRelation = async ({
  schemaId,
  childId,
  parentId,
}: SyncParentRelationOptions): Promise<void> => {
  try {
    if (!schemaId || !childId) return;

    // 1) Load existing parent relations for this child
    // Build query params ensuring 'id' is always last
    const queryParams = new URLSearchParams();
    queryParams.append('schema', schemaId);
    queryParams.append('direction', 'target');
    queryParams.append('relationTypeId', RELATION_TYPE_ID);
    queryParams.append('id', childId); // id is always last
    
    const existingRes = await apiRequest<{
      success: boolean;
      data?: any[];
    }>(`/api/relations?${queryParams.toString()}`);

    const existing = existingRes.success && Array.isArray(existingRes.data) ? existingRes.data : [];

    // 2) Delete all existing parent relations if any
    for (const rel of existing) {
      if (!rel?.id) continue;
      try {
        await apiRequest(`/api/relations/${encodeURIComponent(rel.id)}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn('[syncParentRelation] Failed to delete relation', rel.id, error);
      }
    }

    // 3) If no new parent, we're done
    if (!parentId) {
      return;
    }

    // 4) Create new parent relation
    await apiRequest(`/api/relations`, {
      method: 'POST',
      body: {
        sourceSchema: schemaId,
        sourceId: String(parentId),
        targetSchema: schemaId,
        targetId: String(childId),
        relationTypeId: RELATION_TYPE_ID,
      },
    });
  } catch (error) {
    console.warn('[syncParentRelation] Failed to sync parent relation', {
      schemaId,
      childId,
      parentId,
      error,
    });
  }
};


