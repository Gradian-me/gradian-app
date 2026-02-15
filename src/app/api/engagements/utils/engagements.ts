import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled } from '@/app/api/data/utils';
import type {
  Engagement,
  EngagementCreatedByUser,
  EngagementType,
  EngagementWithInteraction,
} from '@/domains/engagements/types';
import { readSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { findGroupByReference, findGroupById } from './groups';
import {
  findInteractionsByEngagementIds,
  isInteractionRead,
} from './interactions';

/** Build createdBy object from user record (users schema) */
function toCreatedByUser(userId: string, user?: Record<string, unknown> | null): EngagementCreatedByUser {
  if (!user) {
    return {
      userId,
      username: 'Unknown',
      firstName: null,
      lastName: null,
      avatarUrl: null,
    };
  }
  return {
    userId: String(user.id ?? userId),
    username: (user.username ?? user.name ?? user.email ?? 'Unknown') as string,
    firstName: (user.firstName ?? null) as string | null,
    lastName: (user.lastName ?? user.lastname ?? null) as string | null,
    avatarUrl: (user.avatarUrl ?? null) as string | null,
  };
}

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
  /** @deprecated Use referenceType + referenceId. When referenceType=schema, referenceId=schemaId */
  referenceSchemaId?: string;
  referenceType?: string;
  referenceId?: string;
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

  const refSchemaId = query.referenceSchemaId ?? (query.referenceType === 'schema' ? query.referenceId : undefined);
  if (refSchemaId && query.referenceInstanceId) {
    const group = findGroupByReference(
      refSchemaId,
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
      (e) => isInteractionRead(e.interaction) === query.isRead,
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
  const { ulid } = require('ulid');
  const now = new Date().toISOString();
  const id = (body.id as string) ?? ulid();

  const rawMessage = typeof body.message === 'string' ? body.message : '';
  const message = rawMessage.trim();
  if (engagementType === 'discussion' && !message) {
    throw new Error('Discussion message is required');
  }

  const referenceEngagementId =
    typeof body.referenceEngagementId === 'string' && body.referenceEngagementId.trim()
      ? body.referenceEngagementId.trim()
      : undefined;

  const engagement: Engagement = {
    id,
    engagementGroupId: engagementGroupId ?? undefined,
    referenceEngagementId: referenceEngagementId ?? undefined,
    engagementType,
    message,
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
    dueDate: typeof body.dueDate === 'string' ? body.dueDate : undefined,
    createdBy, // Never use body.createdBy; set by API from user store / JWT or fixed id for notifications
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
    'referenceEngagementId',
    'dueDate',
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

/** Fetch users from /api/data/users (demo mode only). Live mode enrichment is handled by backend. */
async function fetchUsersFromDataApi(): Promise<Record<string, unknown>[]> {
  if (!isDemoModeEnabled()) return [];
  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000';
    const proto = headersList.get('x-forwarded-proto') ?? 'http';
    const baseUrl = `${proto}://${host}`;
    const url = `${baseUrl}/api/data/users`;
    const forwardedHeaders: Record<string, string> = {};
    const cookie = headersList.get('cookie');
    const auth = headersList.get('authorization') ?? headersList.get('Authorization');
    if (cookie) forwardedHeaders.cookie = cookie;
    if (auth) forwardedHeaders.authorization = auth;
    const xTenant = headersList.get('x-tenant-domain') ?? headersList.get('X-Tenant-Domain');
    if (xTenant) forwardedHeaders['x-tenant-domain'] = xTenant;
    const res = await fetch(url, {
      headers: forwardedHeaders,
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    const data = json?.data;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    loggingCustom(
      LogType.INFRA_LOG,
      'warn',
      `[enrichEngagementsWithCreatedBy] Could not fetch users from API: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

/** User map for createdBy enrichment. In demo mode uses /api/data/users; fallback to readSchemaData. */
async function buildUserMap(): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  let users: Record<string, unknown>[] = [];
  if (isDemoModeEnabled()) {
    users = await fetchUsersFromDataApi();
  }
  if (users.length === 0) {
    try {
      users = readSchemaData<Record<string, unknown>>('users');
    } catch (err) {
      loggingCustom(
        LogType.INFRA_LOG,
        'warn',
        `[enrichEngagementsWithCreatedBy] Could not load users: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  for (const u of users) {
    if (u && typeof u.id === 'string') {
      map.set(String(u.id), u);
    }
  }
  return map;
}

/**
 * Replace createdBy (string userId) with full createdBy object for demo mode responses.
 * Uses /api/data/users for user lookup. When createdBy is missing, infers from engagement group.
 * Live mode enrichment is handled by backend.
 * Matches backend format: { firstName, lastName, username, avatarUrl, userId }.
 */
export async function enrichEngagementsWithCreatedBy<
  T extends { createdBy?: string | EngagementCreatedByUser; engagementGroupId?: string | null },
>(items: T[]): Promise<T[]> {
  if (items.length === 0) return [];
  const userMap = await buildUserMap();
  return items.map((e) => {
    let userId: string | undefined;
    const cb = e.createdBy;
    if (cb != null) {
      if (typeof cb === 'object' && 'userId' in cb) return e;
      userId = String(cb);
    } else if (e.engagementGroupId) {
      const group = findGroupById(e.engagementGroupId);
      userId = group?.createdBy ?? undefined;
    }
    if (!userId) {
      return { ...e, createdBy: toCreatedByUser('unknown', null) };
    }
    const createdByObj = toCreatedByUser(userId, userMap.get(userId) ?? null);
    return { ...e, createdBy: createdByObj };
  });
}

/**
 * Replace createdBy (string userId) with full createdBy object for a single engagement.
 */
export async function enrichEngagementWithCreatedBy<T extends { createdBy?: string | EngagementCreatedByUser }>(
  item: T | null | undefined,
): Promise<T | null | undefined> {
  if (!item) return item;
  const enriched = await enrichEngagementsWithCreatedBy([item]);
  return enriched[0] ?? item;
}
