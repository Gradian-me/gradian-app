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
 * Find engagement group by id.
 */
export function findGroupById(id: string): EngagementGroup | undefined {
  const groups = loadEngagementGroups();
  const active = filterOutDeletedGroups(groups);
  return active.find((g) => g.id === id);
}

/** Match group by schema reference (referenceType=schema, referenceId=schemaId or legacy referenceSchemaId) */
function matchesSchemaReference(
  g: EngagementGroup,
  schemaId: string,
  instanceId: string,
): boolean {
  const schemaMatch =
    (g.referenceType === 'schema' && g.referenceId === schemaId) ||
    g.referenceSchemaId === schemaId;
  return schemaMatch && g.referenceInstanceId === instanceId;
}

/**
 * Find engagement group by referenceSchemaId + referenceInstanceId.
 * Supports both referenceType/referenceId and legacy referenceSchemaId.
 */
export function findGroupByReference(
  schemaId: string,
  instanceId: string,
): EngagementGroup | undefined {
  const groups = loadEngagementGroups();
  const active = filterOutDeletedGroups(groups);
  return active.find((g) => matchesSchemaReference(g, schemaId, instanceId));
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
    referenceType: 'schema',
    referenceId: schemaId,
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
