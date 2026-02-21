// External Nodes Storage Utility
// Manages external_nodes collection inside data/all-data.json
// SERVER-ONLY: uses Node.js fs module and must only be used in server-side code

import fs from 'fs';
import path from 'path';
import { ulid } from 'ulid';
import { DataStorageError } from '../errors/domain.errors';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'all-data.json');

export interface ExternalNode {
  /** Unique stable id (ULID) for relations. Use this as targetId in HAS_FIELD_VALUE. */
  id: string;
  /** Business/source id from the external option (e.g. lookup row id). Avoids id collisions across sources. */
  businessId?: string;
  label?: string;
  color?: string;
  icon?: string;
  sourceUrl: string;
  /**
   * Optional payload for extra data coming from the external source.
   * This is intentionally untyped to remain flexible.
   */
  extraPayload?: any;
}

interface AllDataFile {
  [key: string]: any;
  external_nodes?: ExternalNode[];
}

function ensureAllDataFile(): void {
  const dataDir = path.join(process.cwd(), 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE_PATH)) {
    const initialData: AllDataFile = {};
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readAllData(): AllDataFile {
  try {
    ensureAllDataFile();
    const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    throw new DataStorageError('read all-data', error instanceof Error ? error.message : 'Unknown error');
  }
}

function writeAllData(data: AllDataFile): void {
  try {
    ensureAllDataFile();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    throw new DataStorageError('write all-data', error instanceof Error ? error.message : 'Unknown error');
  }
}

export function getExternalNodes(): ExternalNode[] {
  const data = readAllData();
  return data.external_nodes ?? [];
}

/**
 * Upsert an external node from a picker/select option.
 * Uses ULID for node.id to avoid collisions across sources; stores the option's id as businessId.
 * Match existing node by sourceUrl + (id or businessId) so re-saves after enrich still find the same node.
 */
export function upsertExternalNodeFromOption(params: {
  sourceUrl: string;
  option: { id?: string | number; label?: string; icon?: string; color?: string; metadata?: any };
}): ExternalNode {
  const data = readAllData();
  const externalNodes: ExternalNode[] = data.external_nodes ?? [];

  const optionId = params.option.id != null && params.option.id !== '' ? String(params.option.id) : undefined;
  const businessId = optionId;

  const existingIndex = externalNodes.findIndex(
    (node) =>
      node.sourceUrl === params.sourceUrl &&
      (node.id === optionId || node.businessId === optionId),
  );

  const basePayload = {
    label: params.option.label,
    icon: params.option.icon,
    color: params.option.color,
    sourceUrl: params.sourceUrl,
    extraPayload: params.option.metadata,
  };

  if (existingIndex >= 0) {
    const updated: ExternalNode = {
      ...externalNodes[existingIndex],
      ...basePayload,
      businessId: businessId ?? externalNodes[existingIndex].businessId,
    };
    externalNodes[existingIndex] = updated;
    data.external_nodes = externalNodes;
    writeAllData(data);
    return updated;
  }

  const created: ExternalNode = {
    id: ulid(),
    businessId: businessId,
    ...basePayload,
  };
  const nextNodes = [...externalNodes, created];
  data.external_nodes = nextNodes;
  writeAllData(data);
  return created;
}


