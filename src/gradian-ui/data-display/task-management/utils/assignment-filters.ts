import { extractFirstId, extractIds } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { AssignmentCounts, AssignmentFilterResult, AssignmentView } from '../types';

const normalizeUserId = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    if (candidate.id !== undefined && candidate.id !== null) {
      return String(candidate.id);
    }
    if (candidate.value !== undefined && candidate.value !== null) {
      return String(candidate.value);
    }
  }

  const extracted = extractFirstId(value as any);
  return extracted ?? null;
};

const getAssignedIds = (entity: Record<string, any>): string[] => {
  const assigned =
    entity?.assignedTo ??
    entity?.assigned_to ??
    entity?.assignees ??
    entity?.assignedUsers ??
    [];
  return extractIds(assigned);
};

const getCreatorId = (entity: Record<string, any>): string | null => {
  const creatorCandidate =
    entity?.createdBy ??
    entity?.created_by ??
    entity?.creator ??
    entity?.created_by_id ??
    entity?.created_by_user;

  const normalized = normalizeUserId(creatorCandidate);
  if (normalized) {
    return normalized;
  }

  if (entity?.created_by_id !== undefined && entity.created_by_id !== null) {
    return String(entity.created_by_id);
  }

  return null;
};

const isAssignedToUser = (entity: Record<string, any>, userId: string | null): boolean => {
  if (!userId) {
    return false;
  }
  const assignedIds = getAssignedIds(entity);
  return assignedIds.some((id) => id === userId);
};

const isInitiatedByUser = (entity: Record<string, any>, userId: string | null): boolean => {
  if (!userId) {
    return false;
  }
  const creatorId = getCreatorId(entity);
  return Boolean(creatorId && creatorId === userId);
};

export const computeAssignmentCounts = (
  rawEntities: any[] | null | undefined,
  userId: string | null
): AssignmentCounts => {
  const entities = Array.isArray(rawEntities) ? rawEntities : [];
  if (!userId) {
    return {
      assignedTo: 0,
      initiatedBy: 0,
    };
  }

  return entities.reduce<AssignmentCounts>(
    (acc, entity) => {
      if (isAssignedToUser(entity, userId)) {
        acc.assignedTo += 1;
      }
      if (isInitiatedByUser(entity, userId)) {
        acc.initiatedBy += 1;
      }
      return acc;
    },
    { assignedTo: 0, initiatedBy: 0 }
  );
};

export const applyAssignmentFilters = <T = any>({
  entities,
  view,
  userId,
}: {
  entities?: T[] | null;
  view: AssignmentView;
  userId: string | null;
}): AssignmentFilterResult<T> => {
  const normalizedEntities = Array.isArray(entities) ? entities : [];
  const counts = computeAssignmentCounts(normalizedEntities, userId);

  if (!userId) {
    return {
      filteredEntities: [],
      counts,
    };
  }

  const filteredEntities =
    view === 'assignedTo'
      ? normalizedEntities.filter((entity) => isAssignedToUser(entity as Record<string, any>, userId))
      : normalizedEntities.filter((entity) => isInitiatedByUser(entity as Record<string, any>, userId));

  return {
    filteredEntities,
    counts,
  };
};
