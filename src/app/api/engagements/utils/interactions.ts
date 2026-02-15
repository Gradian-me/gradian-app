import fs from 'fs';
import path from 'path';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import type {
  EngagementInteraction,
  EngagementInteractionUserType,
} from '@/domains/engagements/types';

const INTERACTIONS_PATH = path.join(
  process.cwd(),
  'data',
  'engagement-interactions.json',
);

const VALID_INTERACTION_TYPES: EngagementInteractionUserType[] = [
  'read',
  'acknowledge',
  'mention',
];

export function loadEngagementInteractions(): EngagementInteraction[] {
  try {
    if (fs.existsSync(INTERACTIONS_PATH)) {
      const fileContents = fs.readFileSync(INTERACTIONS_PATH, 'utf-8');
      const data = JSON.parse(fileContents);
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading engagement-interactions.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return [];
}

export function saveEngagementInteractions(
  interactions: EngagementInteraction[],
): void {
  try {
    fs.writeFileSync(
      INTERACTIONS_PATH,
      JSON.stringify(interactions, null, 2),
      'utf-8',
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error saving engagement-interactions.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

export function findInteractionByEngagementAndUser(
  engagementId: string,
  userId: string,
): EngagementInteraction | undefined {
  const list = loadEngagementInteractions();
  return list.find(
    (i) => i.engagementId === engagementId && i.userId === userId,
  );
}

export function findInteractionsByEngagementIds(
  engagementIds: string[],
  userId: string,
): EngagementInteraction[] {
  const set = new Set(engagementIds);
  const list = loadEngagementInteractions();
  return list.filter((i) => i.userId === userId && set.has(i.engagementId));
}

export function upsertInteraction(
  engagementId: string,
  userId: string,
  updates: {
    interactionType?: EngagementInteractionUserType;
    interactedAt?: string;
    outputType?: 'approved' | 'rejected';
    comment?: string;
    referenceEngagementId?: string | null;
    /** @deprecated Use interactionType: 'read' instead */
    isRead?: boolean;
    /** @deprecated Use interactedAt instead */
    readAt?: string;
  },
): EngagementInteraction {
  const { ulid } = require('ulid');
  const list = loadEngagementInteractions();
  const idx = list.findIndex(
    (i) => i.engagementId === engagementId && i.userId === userId,
  );

  const now = new Date().toISOString();
  const resolvedInteractionType =
    updates.interactionType ??
    (updates.isRead ? ('read' as const) : undefined);
  const resolvedInteractedAt =
    updates.interactedAt ?? updates.readAt ?? (updates.outputType || resolvedInteractionType ? now : undefined);

  if (idx >= 0) {
    const existing = list[idx];
    if (updates.interactionType !== undefined || updates.isRead !== undefined)
      existing.interactionType = resolvedInteractionType;
    if (resolvedInteractedAt !== undefined)
      existing.interactedAt = resolvedInteractedAt;
    if (updates.outputType !== undefined)
      existing.outputType = updates.outputType;
    if (updates.comment !== undefined) existing.comment = updates.comment;
    if (updates.referenceEngagementId !== undefined)
      existing.referenceEngagementId = updates.referenceEngagementId;
    list[idx] = existing;
    saveEngagementInteractions(list);
    return existing;
  }

  const newInteraction: EngagementInteraction = {
    id: ulid(),
    engagementId,
    userId,
    interactionType: resolvedInteractionType,
    interactedAt: resolvedInteractedAt,
    outputType: updates.outputType,
    comment: updates.comment,
    referenceEngagementId: updates.referenceEngagementId ?? undefined,
  };

  list.push(newInteraction);
  saveEngagementInteractions(list);
  return newInteraction;
}

/** Derive isRead from interaction (interactionType read/acknowledge/mention = read) */
export function isInteractionRead(
  i: EngagementInteraction | null | undefined,
): boolean {
  if (!i) return false;
  return i.interactionType === 'read' || i.interactionType === 'acknowledge' || i.interactionType === 'mention';
}

export function getInteractionById(
  id: string,
): EngagementInteraction | undefined {
  const list = loadEngagementInteractions();
  return list.find((i) => i.id === id);
}

export function updateInteraction(
  id: string,
  updates: Partial<{
    interactionType: EngagementInteractionUserType;
    interactedAt: string;
    outputType: 'approved' | 'rejected';
    comment: string;
    referenceEngagementId: string | null;
  }>,
): EngagementInteraction | null {
  const list = loadEngagementInteractions();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const allowed = [
    'interactionType',
    'interactedAt',
    'outputType',
    'comment',
    'referenceEngagementId',
  ] as const;
  const updated = { ...list[idx] };
  for (const key of allowed) {
    if (key in updates && updates[key] !== undefined)
      (updated as Record<string, unknown>)[key] = updates[key];
  }
  list[idx] = updated;
  saveEngagementInteractions(list);
  return updated;
}
