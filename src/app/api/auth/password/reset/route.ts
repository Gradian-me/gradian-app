import { NextRequest, NextResponse } from 'next/server';

import {
  hashCode,
  markExpired,
  readTwoFAEntries,
  timingSafeMatch,
  writeTwoFAEntries,
} from '../../2fa/utils';
import { hashPassword } from '@/domains/auth/utils/password.util';
import { readSchemaData, writeSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { decryptSkipKeyFromRequest } from '@/gradian-ui/shared/utils/route-skip-key-decrypt';

type ResetPasswordRequestBody = {
  username?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
  skip_key?: string | Record<string, string>; // Encrypted skip key passed in body for POST requests (object or string)
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResetPasswordRequestBody;
    const username = body.username?.trim();
    const code = body.code?.trim();
    const password = body.password;
    const confirmPassword = body.confirmPassword;

    // Log the entire body for debugging
    console.log('[password/reset] Received request body:', {
      bodyKeys: Object.keys(body),
      hasSkipKey: 'skip_key' in body,
      skipKeyType: body.skip_key ? typeof body.skip_key : 'undefined',
      skipKeyValue: body.skip_key 
        ? (typeof body.skip_key === 'string' 
          ? body.skip_key.substring(0, 100) + '...' 
          : JSON.stringify(body.skip_key))
        : null,
    });

    // Check if skip_key is provided and matches NEXT_PUBLIC_SKIP_KEY
    // Skip key can be in body (for POST) or query params (fallback)
    // Skip key may be encrypted (needs decryption) or plain text
    // Skip key from body will be an object {ciphertext, iv}, from query params will be a string
    let skipKeyRaw: string | Record<string, string> | null = null;
    
    // For POST requests, check body first
    if (body.skip_key) {
      skipKeyRaw = body.skip_key as string | Record<string, string>;
      console.log('[password/reset] Found skip_key in request body:', {
        hasSkipKey: !!skipKeyRaw,
        skipKeyType: typeof skipKeyRaw,
        isObject: typeof skipKeyRaw === 'object',
        skipKeyStructure: typeof skipKeyRaw === 'object' 
          ? { hasCiphertext: 'ciphertext' in skipKeyRaw, hasIv: 'iv' in skipKeyRaw }
          : null,
      });
    } else {
      // Fallback to query parameter
      const querySkipKey = new URL(request.url).searchParams.get('skip_key');
      skipKeyRaw = querySkipKey;
      console.log('[password/reset] Skip_key not in body, checking query params:', {
        hasSkipKey: !!skipKeyRaw,
      });
    }
    
    console.log('[password/reset] Attempting to decrypt skip_key...');
    const skipKey = skipKeyRaw ? await decryptSkipKeyFromRequest(request, skipKeyRaw) : null;
    const expectedSkipKey = process.env.NEXT_PUBLIC_SKIP_KEY;
    
    // Normalize the skip key (remove any surrounding quotes or whitespace)
    let normalizedSkipKey = skipKey?.trim() || null;
    if (normalizedSkipKey && normalizedSkipKey.length >= 2 && normalizedSkipKey[0] === '"' && normalizedSkipKey[normalizedSkipKey.length - 1] === '"') {
      // Remove surrounding quotes
      normalizedSkipKey = normalizedSkipKey.slice(1, -1);
    }
    const normalizedExpectedKey = expectedSkipKey?.trim() || null;
    
    console.log('[password/reset] After decryption:', {
      skipKeyDecrypted: !!skipKey,
      skipKeyLength: skipKey?.length || 0,
      expectedKeyExists: !!expectedSkipKey,
      expectedKeyLength: expectedSkipKey?.length || 0,
    });
    
    const shouldSkipOTP = normalizedSkipKey && normalizedExpectedKey && normalizedSkipKey === normalizedExpectedKey;
    
    console.log('[password/reset] Skip key validation:', {
      hasSkipKey: !!skipKey,
      hasExpectedKey: !!expectedSkipKey,
      shouldSkipOTP,
      skipKeyMatch: normalizedSkipKey === normalizedExpectedKey,
      skipKeyRaw: skipKey || 'null',
      skipKeyNormalized: normalizedSkipKey || 'null',
      expectedKeyRaw: expectedSkipKey || 'null',
      expectedKeyNormalized: normalizedExpectedKey || 'null',
      exactMatch: normalizedSkipKey === normalizedExpectedKey,
    });

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 },
      );
    }

    // Only require OTP code if skip_key is not provided or doesn't match
    if (!shouldSkipOTP && !code) {
      return NextResponse.json(
        { success: false, error: '2FA code is required' },
        { status: 400 },
      );
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Password and confirmation are required' },
        { status: 400 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 },
      );
    }

    const users = readSchemaData<any>('users');

    const user = users.find((entry: any) => {
      const normalizedUsername = username.toLowerCase();
      return (
        entry?.email?.toLowerCase?.() === normalizedUsername ||
        entry?.username?.toLowerCase?.() === normalizedUsername
      );
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unable to locate user with provided username' },
        { status: 404 },
      );
    }

    // Skip OTP validation if skip_key matches NEXT_PUBLIC_SKIP_KEY
    if (!shouldSkipOTP) {
      const now = Date.now();
      const entries = markExpired(await readTwoFAEntries(), now);
      const entryIndex = entries.findIndex((item) => item.userId === user.id);

      if (entryIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'No active 2FA code found for this user' },
          { status: 404 },
        );
      }

      const entry = entries[entryIndex];

      if (entry.isExpired || new Date(entry.expirationDate).getTime() <= now) {
        entries[entryIndex] = { ...entry, isExpired: true };
        await writeTwoFAEntries(entries);
        return NextResponse.json(
          { success: false, error: '2FA code has expired' },
          { status: 410 },
        );
      }

      const hashedInput = hashCode(code!);
      if (!timingSafeMatch(entry.twoFACode, hashedInput)) {
        return NextResponse.json(
          { success: false, error: 'Invalid 2FA code' },
          { status: 400 },
        );
      }

      entries[entryIndex] = {
        ...entry,
        isExpired: true,
      };

      await writeTwoFAEntries(entries);
    }

    const hashedPassword = await hashPassword(password, 'argon2');
    const userIndex = users.findIndex((item: any) => item.id === user.id);

    if (userIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'User record could not be updated' },
        { status: 500 },
      );
    }

    users[userIndex] = {
      ...users[userIndex],
      password: hashedPassword,
      hashType: 'argon2',
      updatedAt: new Date().toISOString(),
    };

    writeSchemaData('users', users);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('[Auth] Password reset error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset password',
      },
      { status: 500 },
    );
  }
}

