import Dexie, { Table } from 'dexie';

import type { GraphRecord } from '../types';

const DB_NAME = 'gradian-graph-designer';
const DB_VERSION = 1;

class GraphDesignerDb extends Dexie {
  public graphs!: Table<GraphRecord, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      graphs: '&id, updatedAt',
    });
  }
}

let dbInstance: GraphDesignerDb | null = null;

function getDb(): GraphDesignerDb | null {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return null;
  }

  if (!dbInstance) {
    dbInstance = new GraphDesignerDb();
  }

  return dbInstance;
}

export async function saveGraphRecord(record: GraphRecord): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.graphs.put(record);
}


