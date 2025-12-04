// External Nodes Storage Utility
// Manages external_nodes collection inside data/all-data.json
// SERVER-ONLY: uses Node.js fs module and must only be used in server-side code

import fs from 'fs';
import path from 'path';
import { ulid } from 'ulid';
import { DataStorageError } from '../errors/domain.errors';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'all-data.json');

export interface ExternalNode {
  id: string;
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

export function upsertExternalNodeFromOption(params: {
  sourceUrl: string;
  option: { id?: string | number; label?: string; icon?: string; color?: string; metadata?: any };
}): ExternalNode {
  const data = readAllData();
  const externalNodes: ExternalNode[] = data.external_nodes ?? [];

  const optionId = params.option.id ? String(params.option.id) : ulid();

  const existingIndex = externalNodes.findIndex(
    (node) => node.sourceUrl === params.sourceUrl && node.id === optionId,
  );

  const baseNode: ExternalNode = {
    id: optionId,
    label: params.option.label,
    icon: params.option.icon,
    color: params.option.color,
    sourceUrl: params.sourceUrl,
    extraPayload: params.option.metadata,
  };

  if (existingIndex >= 0) {
    const updated = {
      ...externalNodes[existingIndex],
      ...baseNode,
    };
    externalNodes[existingIndex] = updated;
    data.external_nodes = externalNodes;
    writeAllData(data);
    return updated;
  }

  const created: ExternalNode = baseNode;
  const nextNodes = [...externalNodes, created];
  data.external_nodes = nextNodes;
  writeAllData(data);
  return created;
}


