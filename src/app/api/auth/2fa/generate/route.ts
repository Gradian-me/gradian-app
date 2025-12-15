import { NextResponse } from 'next/server';

import {
  TwoFAEntry,
  generateSixDigitCode,
  hashCode,
  markExpired,
  readTwoFAEntries,
  writeTwoFAEntries,
} from '../utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

const DEFAULT_TTL_SECONDS = 5 * 60;
const MIN_REGEN_INTERVAL_MS = 10 * 1000;

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: 'Unauthorized request',
    },
    { status: 401 },
  );
}

type GenerateRequestBody = {
  userId?: string;
  clientId?: string;
  secretKey?: string;
  ttlSeconds?: number;
};

export async function POST(request: Request) {
  try {
    const envClientId = process.env.CLIENT_ID;
    const envSecretKey = process.env.SECRET_KEY;

    if (!envClientId || !envSecretKey) {
      loggingCustom(
        LogType.LOGIN_LOG,
        'error',
        '[2FA] CLIENT_ID or SECRET_KEY are missing from environment',
      );
      return NextResponse.json(
        {
          success: false,
          message: 'Server configuration error',
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as GenerateRequestBody;
    const { userId, clientId, secretKey, ttlSeconds } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'userId is required',
        },
        { status: 400 },
      );
    }

    if (clientId !== envClientId || secretKey !== envSecretKey) {
      return unauthorizedResponse();
    }

    const ttl = Math.max(30, Math.floor(ttlSeconds ?? DEFAULT_TTL_SECONDS));
    const now = Date.now();
    const expirationDate = new Date(now + ttl * 1000).toISOString();

    const entries = markExpired(await readTwoFAEntries(), now);

    const existing = entries.find((entry) => entry.userId === userId && !entry.isExpired);

    if (existing && existing.generatedAt) {
      const generatedAt = new Date(existing.generatedAt).getTime();
      if (now - generatedAt < MIN_REGEN_INTERVAL_MS) {
        return NextResponse.json(
          {
            success: false,
            message: '2FA code recently generated; please wait before requesting another.',
            retryAfterMs: MIN_REGEN_INTERVAL_MS - (now - generatedAt),
          },
          { status: 429 },
        );
      }
    }

    const code = generateSixDigitCode();
    const hashed = hashCode(code);

    const updatedEntry: TwoFAEntry = {
      userId,
      twoFACode: hashed,
      expirationDate,
      isExpired: false,
      generatedAt: new Date(now).toISOString(),
    };

    const filtered = entries.filter((entry) => entry.userId !== userId);
    filtered.push(updatedEntry);

    await writeTwoFAEntries(filtered);

    return NextResponse.json({
      success: true,
      message: '2FA code generated',
      data: {
        userId,
        expiresAt: expirationDate,
        code,
        ttlSeconds: ttl,
      },
    });
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'error',
      `[2FA] Generate route error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate 2FA code',
      },
      { status: 500 },
    );
  }
}

