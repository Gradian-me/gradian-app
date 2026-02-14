import fs from 'fs';
import path from 'path';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import type { EngagementGroup } from '@/domains/engagements/types';

const ENGAGEMENT_GROUPS_PATH = path.join(
  process.cwd(),
  'data',
  'engagement-groups.json',
);

export function loadEngagementGroups(): EngagementGroup[] {
  try {
    if (fs.existsSync(ENGAGEMENT_GROUPS_PATH)) {
      const fileContents = fs.readFileSync(ENGAGEMENT_GROUPS_PATH, 'utf-8');
      const data = JSON.parse(fileContents);
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading engagement-groups.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return [];
}

export function saveEngagementGroups(groups: EngagementGroup[]): void {
  try {
    fs.writeFileSync(
      ENGAGEMENT_GROUPS_PATH,
      JSON.stringify(groups, null, 2),
      'utf-8',
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error saving engagement-groups.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/** Exclude groups that have deletedAt set (for GET responses). */
export function filterOutDeletedGroups(
  groups: EngagementGroup[],
): EngagementGroup[] {
  return groups.filter((g) => !g.deletedAt);
}

/**
 * Find engagement group by referenceSchemaId + referenceInstanceId.
 * Returns undefined if not found (or if deleted).
 */
export function findGroupByReference(
  schemaId: string,
  instanceId: string,
): EngagementGroup | undefined {
  const groups = loadEngagementGroups();
  const active = filterOutDeletedGroups(groups);
  return active.find(
    (g) =>
      g.referenceSchemaId === schemaId && g.referenceInstanceId === instanceId,
  );
}

/**
 * Get existing engagement group for (schemaId, instanceId) or create one.
 * Used by nested data route POST when creating engagements scoped to a record.
 */
export function getOrCreateGroupForReference(
  schemaId: string,
  instanceId: string,
  createdBy?: string,
): EngagementGroup {
  const existing = findGroupByReference(schemaId, instanceId);
  if (existing) return existing;

  const { ulid } = require('ulid');
  const groups = loadEngagementGroups();
  const now = new Date().toISOString();
  const newGroup: EngagementGroup = {
    id: ulid(),
    referenceSchemaId: schemaId,
    referenceInstanceId: instanceId,
    createdBy,
    createdAt: now,
    owners: createdBy ? [createdBy] : [],
    members: [],
    viewers: [],
  };
  groups.push(newGroup);
  saveEngagementGroups(groups);
  return newGroup;
}
