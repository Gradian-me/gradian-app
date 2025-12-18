// POST /api/auth/password/change
// Change user password by verifying current password with shared client credentials

import { NextRequest, NextResponse } from 'next/server';

import { hashPassword, verifyPassword, detectHashType } from '@/domains/auth/utils/password.util';
import { readSchemaData, writeSchemaData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

type ChangePasswordRequestBody = {
  clientId?: string;
  secretKey?: string;
  username?: string;
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(request: NextRequest) {
  try {
    const envClientId = process.env.CLIENT_ID ?? process.env.NEXT_PUBLIC_CLIENT_ID;
    const envSecretKey = process.env.SECRET_KEY ?? process.env.NEXT_PUBLIC_SECRET_KEY;

    if (!envClientId || !envSecretKey) {
      loggingCustom(
        LogType.LOGIN_LOG,
        'error',
        '[Password Change] CLIENT_ID or SECRET_KEY are missing from environment',
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as ChangePasswordRequestBody;
    const { clientId, secretKey, username, currentPassword, newPassword } = body;

    if (clientId !== envClientId || secretKey !== envSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized request',
        },
        { status: 401 },
      );
}

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Username or email is required',
        },
        { status: 400 },
      );
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Current password is required',
        },
        { status: 400 },
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'New password is required',
        },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'New password must be at least 8 characters long',
        },
        { status: 400 },
      );
    }

    const normalizedUsername = username.trim().toLowerCase();

    const users = readSchemaData<any>('users');
    const userIndex = users.findIndex((user: any) => {
      const email = user?.email?.toLowerCase?.();
      const handle = user?.username?.toLowerCase?.();
      return email === normalizedUsername || handle === normalizedUsername;
    });

    if (userIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 },
      );
    }

    const user = users[userIndex];
    const storedPassword = user.password || '';
    const hashType = user.hashType || detectHashType(storedPassword);
    
    const isValidPassword = await verifyPassword(currentPassword, storedPassword, hashType);
    
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current password is incorrect',
        },
        { status: 400 },
      );
    }

    const hashedNewPassword = await hashPassword(newPassword, 'argon2');

    users[userIndex] = {
      ...users[userIndex],
      password: hashedNewPassword,
      hashType: 'argon2',
      updatedAt: new Date().toISOString(),
    };

    writeSchemaData('users', users);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    loggingCustom(
      LogType.LOGIN_LOG,
      'error',
      `Password change API error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change password',
      },
      { status: 500 },
    );
  }
}

