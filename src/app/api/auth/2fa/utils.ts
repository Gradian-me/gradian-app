import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

export type TwoFAEntry = {
  userId: string;
  twoFACode: string;
  expirationDate: string;
  isExpired: boolean;
  generatedAt?: string;
};

const TWO_FA_FILE = path.join(process.cwd(), 'data', '2fa.json');

async function ensureFile(): Promise<void> {
  try {
    await fs.access(TWO_FA_FILE);
  } catch {
    await fs.mkdir(path.dirname(TWO_FA_FILE), { recursive: true });
    await fs.writeFile(TWO_FA_FILE, '[]', 'utf8');
  }
}

export async function readTwoFAEntries(): Promise<TwoFAEntry[]> {
  await ensureFile();
  try {
    const file = await fs.readFile(TWO_FA_FILE, 'utf8');
    const parsed = JSON.parse(file);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => ({
        ...entry,
        expirationDate: entry.expirationDate,
        isExpired: Boolean(entry.isExpired),
      }));
    }
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'error',
      `[2FA] Failed to read entries: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return [];
}

export async function writeTwoFAEntries(entries: TwoFAEntry[]): Promise<void> {
  await ensureFile();
  const payload = JSON.stringify(entries, null, 2);
  await fs.writeFile(TWO_FA_FILE, payload, 'utf8');
}

export function generateSixDigitCode(): string {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return code;
}

export function hashCode(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function markExpired(entries: TwoFAEntry[], referenceDate = Date.now()): TwoFAEntry[] {
  return entries.map((entry) => {
    const expired = entry.isExpired || new Date(entry.expirationDate).getTime() <= referenceDate;
    return expired ? { ...entry, isExpired: true } : entry;
  });
}

export function timingSafeMatch(hashA: string, hashB: string): boolean {
  const a = Buffer.from(hashA, 'hex');
  const b = Buffer.from(hashB, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

