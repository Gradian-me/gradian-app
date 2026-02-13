import fs from 'fs';
import path from 'path';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import type {
  Engagement,
  EngagementType,
  EngagementWithInteraction,
} from '@/domains/engagements/types';
import { findGroupByReference } from './groups';
import { findInteractionsByEngagementIds } from './interactions';

const ENGAGEMENTS_PATH = path.join(process.cwd(), 'data', 'engagements.json');

export function loadEngagements(): Engagement[] {
  try {
    if (fs.existsSync(ENGAGEMENTS_PATH)) {
      const fileContents = fs.readFileSync(ENGAGEMENTS_PATH, 'utf-8');
      const data = JSON.parse(fileContents);
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading engagements.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return [];
}

export function saveEngagements(engagements: Engagement[]): void {
  try {
    fs.writeFileSync(
      ENGAGEMENTS_PATH,
      JSON.stringify(engagements, null, 2),
      'utf-8',
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error saving engagements.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

export function filterOutDeletedEngagements(
  engagements: Engagement[],
): Engagement[] {
  return engagements.filter((e) => !e.deletedAt);
}

export interface ListEngagementsQuery {
  engagementType: EngagementType;
  engagementGroupId?: string;
  referenceSchemaId?: string;
  referenceInstanceId?: string;
  search?: string;
  priority?: string;
  type?: string;
  currentUserId?: string;
  sourceType?: 'createdByMe' | 'assignedToMe';
  /** When set with currentUserId, count only engagements where user's interaction isRead matches (used by count endpoints). */
  isRead?: boolean;
}

export function listEngagements(query: ListEngagementsQuery): Engagement[] {
  let list = loadEngagements();
  list = filterOutDeletedEngagements(list);
  list = list.filter((e) => e.engagementType === query.engagementType);

  if (query.engagementGroupId !== undefined)
    list = list.filter((e) => e.engagementGroupId === query.engagementGroupId);

  if (query.referenceSchemaId && query.referenceInstanceId) {
    const group = findGroupByReference(
      query.referenceSchemaId,
      query.referenceInstanceId,
    );
    if (group) list = list.filter((e) => e.engagementGroupId === group.id);
    else list = [];
  }

  if (query.search) {
    const searchLower = query.search.toLowerCase();
    list = list.filter(
      (e) =>
        e.message?.toLowerCase().includes(searchLower) ||
        (e.metadata &&
          typeof e.metadata === 'object' &&
          (e.metadata as Record<string, unknown>).title != null &&
          String(
            (e.metadata as Record<string, unknown>).title,
          ).toLowerCase().includes(searchLower)),
    );
  }

  if (query.priority)
    list = list.filter((e) => e.priority === query.priority);
  if (query.type) list = list.filter((e) => e.type === query.type);

  if (query.sourceType && query.currentUserId) {
    if (query.sourceType === 'createdByMe')
      list = list.filter((e) => e.createdBy === query.currentUserId);
  }

  list.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  return list;
}

/**
 * Return count of engagements matching the query. When isRead and currentUserId
 * are set, enriches with interactions and counts only those matching isRead (for badges).
 */
export function countEngagements(
  query: ListEngagementsQuery,
): number {
  const list = listEngagements(query);
  if (query.currentUserId != null && query.isRead !== undefined) {
    const enriched = enrichEngagementsWithInteractions(list, query.currentUserId);
    return enriched.filter(
      (e) => (e.interaction?.isRead ?? false) === query.isRead,
    ).length;
  }
  return list.length;
}

export function getEngagementById(id: string): Engagement | undefined {
  const list = loadEngagements();
  const active = filterOutDeletedEngagements(list);
  return active.find((e) => e.id === id);
}

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const VALID_DISPLAY_TYPES = ['success', 'info', 'warning', 'error'] as const;
const VALID_INTERACTION_TYPES = ['canRead', 'needsAcknowledgement'] as const;

export function createEngagement(
  body: Record<string, unknown>,
  engagementType: EngagementType,
  engagementGroupId?: string | null,
  createdBy?: string,
): Engagement {
  const { generateSecureId } =
    require('@/gradian-ui/shared/utils/security-utils');
  const now = new Date().toISOString();
  const id = (body.id as string) ?? `e-${Date.now()}-${generateSecureId(9)}`;

  const engagement: Engagement = {
    id,
    engagementGroupId: engagementGroupId ?? undefined,
    engagementType,
    message: typeof body.message === 'string' ? body.message : '',
    metadata:
      body.metadata &&
      typeof body.metadata === 'object' &&
      !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined,
    priority:
      body.priority &&
      VALID_PRIORITIES.includes(body.priority as (typeof VALID_PRIORITIES)[number])
        ? (body.priority as Engagement['priority'])
        : undefined,
    type:
      body.type &&
      VALID_DISPLAY_TYPES.includes(body.type as (typeof VALID_DISPLAY_TYPES)[number])
        ? (body.type as Engagement['type'])
        : undefined,
    interactionType:
      body.interactionType &&
      VALID_INTERACTION_TYPES.includes(
        body.interactionType as Engagement['interactionType'],
      )
        ? (body.interactionType as Engagement['interactionType'])
        : 'canRead',
    reactions: Array.isArray(body.reactions) ? body.reactions : undefined,
    hashtags: Array.isArray(body.hashtags) ? body.hashtags : undefined,
    createdBy: createdBy ?? (body.createdBy as string),
    createdAt: (body.createdAt as string) ?? now,
  };

  const list = loadEngagements();
  list.push(engagement);
  saveEngagements(list);
  return engagement;
}

export function updateEngagement(
  id: string,
  body: Record<string, unknown>,
  updatedBy?: string,
): Engagement | null {
  const list = loadEngagements();
  const index = list.findIndex((e) => e.id === id);
  if (index === -1 || list[index].deletedAt) return null;

  const allowed = [
    'message',
    'metadata',
    'priority',
    'type',
    'interactionType',
    'reactions',
    'hashtags',
    'engagementGroupId',
  ] as const;
  const updated = { ...list[index] };
  for (const key of allowed) {
    if (key in body) (updated as Record<string, unknown>)[key] = body[key];
  }
  updated.updatedBy = updatedBy ?? (body.updatedBy as string);
  updated.updatedAt = new Date().toISOString();
  list[index] = updated;
  saveEngagements(list);
  return updated;
}

export function softDeleteEngagement(
  id: string,
  deletedBy?: string,
): boolean {
  const list = loadEngagements();
  const index = list.findIndex((e) => e.id === id);
  if (index === -1) return false;

  const now = new Date().toISOString();
  list[index] = {
    ...list[index],
    deletedBy,
    deletedAt: now,
  };
  saveEngagements(list);
  return true;
}

/**
 * Attach current user's interaction (isRead, readAt, outputType, etc.) to each engagement.
 * Used by GET list endpoints when currentUserId is provided.
 */
export function enrichEngagementsWithInteractions(
  engagements: Engagement[],
  userId: string,
): EngagementWithInteraction[] {
  if (engagements.length === 0) return [];
  const ids = engagements.map((e) => e.id);
  const interactions = findInteractionsByEngagementIds(ids, userId);
  const byEngagement = new Map(interactions.map((i) => [i.engagementId, i]));

  return engagements.map((e) => {
    const interaction = byEngagement.get(e.id) ?? null;
    return { ...e, interaction };
  });
}
