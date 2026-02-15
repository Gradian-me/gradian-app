import fs from 'fs';
import path from 'path';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import type { ReferenceType } from '@/domains/engagements/types';

export interface Bookmark {
  id: string;
  referenceType: ReferenceType;
  referenceId: string;
  referenceInstanceId?: string;
  userId: string;
  timestamp: string;
  inactive?: boolean;
  inactiveAt?: string;
}

const BOOKMARKS_PATH = path.join(process.cwd(), 'data', 'bookmarks.json');

export function loadBookmarks(): Bookmark[] {
  try {
    if (fs.existsSync(BOOKMARKS_PATH)) {
      const fileContents = fs.readFileSync(BOOKMARKS_PATH, 'utf-8');
      const data = JSON.parse(fileContents);
      return Array.isArray(data) ? data : [];
    }
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error reading bookmarks.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return [];
}

export function saveBookmarks(bookmarks: Bookmark[]): void {
  try {
    fs.writeFileSync(
      BOOKMARKS_PATH,
      JSON.stringify(bookmarks, null, 2),
      'utf-8',
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Error saving bookmarks.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

export function findBookmark(
  referenceType: string,
  referenceId: string,
  referenceInstanceId: string | undefined,
  userId: string,
): Bookmark | undefined {
  const list = loadBookmarks();
  return list.find(
    (b) =>
      b.referenceType === referenceType &&
      b.referenceId === referenceId &&
      (referenceInstanceId == null
        ? b.referenceInstanceId == null
        : b.referenceInstanceId === referenceInstanceId) &&
      b.userId === userId,
  );
}

/** Toggle inactive on duplicate; create new if not exists. Returns the bookmark. */
export function upsertBookmark(
  referenceType: ReferenceType,
  referenceId: string,
  referenceInstanceId: string | undefined,
  userId: string,
): Bookmark {
  const { ulid } = require('ulid');
  const list = loadBookmarks();
  const now = new Date().toISOString();
  const existing = findBookmark(
    referenceType,
    referenceId,
    referenceInstanceId,
    userId,
  );

  if (existing) {
    const idx = list.findIndex((b) => b.id === existing.id);
    const updated: Bookmark = {
      ...existing,
      inactive: !existing.inactive,
      inactiveAt: existing.inactive ? undefined : now,
    };
    list[idx] = updated;
    saveBookmarks(list);
    return updated;
  }

  const newBookmark: Bookmark = {
    id: ulid(),
    referenceType,
    referenceId,
    referenceInstanceId,
    userId,
    timestamp: now,
    inactive: false,
  };
  list.push(newBookmark);
  saveBookmarks(list);
  return newBookmark;
}

export function getBookmarksByUser(
  userId: string,
  options?: { inactive?: boolean },
): Bookmark[] {
  const list = loadBookmarks();
  let filtered = list.filter((b) => b.userId === userId);
  if (options?.inactive !== undefined) {
    filtered = filtered.filter((b) => (b.inactive ?? false) === options.inactive);
  }
  return filtered.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
