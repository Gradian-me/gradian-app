import fs from 'fs';
import path from 'path';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import type { EngagementInteraction } from '@/domains/engagements/types';

const INTERACTIONS_PATH = path.join(
  process.cwd(),
  'data',
  'engagement-interactions.json',
);

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
    isRead?: boolean;
    readAt?: string;
    interactedAt?: string;
    outputType?: 'approved' | 'rejected';
    comment?: string;
    dueDate?: string;
    referenceEngagementId?: string | null;
  },
): EngagementInteraction {
  const { ulid } = require('ulid');
  const list = loadEngagementInteractions();
  const idx = list.findIndex(
    (i) => i.engagementId === engagementId && i.userId === userId,
  );

  if (idx >= 0) {
    const existing = list[idx];
    if (updates.isRead !== undefined) existing.isRead = updates.isRead;
    if (updates.readAt !== undefined) existing.readAt = updates.readAt;
    if (updates.interactedAt !== undefined)
      existing.interactedAt = updates.interactedAt;
    if (updates.outputType !== undefined)
      existing.outputType = updates.outputType;
    if (updates.comment !== undefined) existing.comment = updates.comment;
    if (updates.dueDate !== undefined) existing.dueDate = updates.dueDate;
    if (updates.referenceEngagementId !== undefined)
      existing.referenceEngagementId = updates.referenceEngagementId;
    list[idx] = existing;
    saveEngagementInteractions(list);
    return existing;
  }

  const now = new Date().toISOString();
  const newInteraction: EngagementInteraction = {
    id: ulid(),
    engagementId,
    userId,
    isRead: updates.isRead ?? false,
    readAt: updates.readAt,
    dueDate: updates.dueDate,
    interactedAt:
      updates.interactedAt ?? (updates.outputType ? now : undefined),
    outputType: updates.outputType,
    comment: updates.comment,
    referenceEngagementId: updates.referenceEngagementId ?? undefined,
  };
  if (updates.isRead && !newInteraction.readAt) newInteraction.readAt = now;

  list.push(newInteraction);
  saveEngagementInteractions(list);
  return newInteraction;
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
    isRead: boolean;
    readAt: string;
    interactedAt: string;
    outputType: 'approved' | 'rejected';
    comment: string;
    dueDate: string;
    referenceEngagementId: string | null;
  }>,
): EngagementInteraction | null {
  const list = loadEngagementInteractions();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const allowed = [
    'isRead',
    'readAt',
    'interactedAt',
    'outputType',
    'comment',
    'dueDate',
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
