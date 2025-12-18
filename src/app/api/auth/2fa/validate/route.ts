import { NextResponse } from 'next/server';

import { hashCode, markExpired, readTwoFAEntries, timingSafeMatch, writeTwoFAEntries } from '../utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

type ValidateRequestBody = {
  userId?: string;
  code?: string;
  clientId?: string;
  secretKey?: string;
};

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: 'Unauthorized request',
    },
    { status: 401 },
  );
}

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

    const body = (await request.json()) as ValidateRequestBody;
    const { userId, code, clientId, secretKey } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'userId is required',
        },
        { status: 400 },
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: '2FA code is required',
        },
        { status: 400 },
      );
    }

    if (clientId !== envClientId || secretKey !== envSecretKey) {
      return unauthorizedResponse();
    }

    const now = Date.now();
    const entries = markExpired(await readTwoFAEntries(), now);

    const entryIndex = entries.findIndex((item) => item.userId === userId);
    if (entryIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: 'No active 2FA code found for user',
        },
        { status: 404 },
      );
    }

    const entry = entries[entryIndex];

    if (entry.isExpired || new Date(entry.expirationDate).getTime() <= now) {
      entries[entryIndex] = { ...entry, isExpired: true };
      await writeTwoFAEntries(entries);
      return NextResponse.json(
        {
          success: false,
          message: '2FA code has expired',
        },
        { status: 410 },
      );
    }

    const hashedInput = hashCode(code);

    if (!timingSafeMatch(entry.twoFACode, hashedInput)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid 2FA code',
        },
        { status: 400 },
      );
    }

    entries[entryIndex] = {
      ...entry,
      isExpired: true,
    };

    await writeTwoFAEntries(entries);

    return NextResponse.json({
      success: true,
      message: '2FA code verified',
    });
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'error',
      `[2FA] Validate route error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to validate 2FA code',
      },
      { status: 500 },
    );
  }
}

