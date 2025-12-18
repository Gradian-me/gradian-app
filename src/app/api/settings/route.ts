// Settings API Route
// Handles CRUD operations for user settings

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UserSettings, SettingsUpdate } from '@/domains/settings/types';
import { mergeWithDefaults, getDefaultUserSettings } from '@/domains/settings/utils/defaults';
import { validateToken, extractTokenFromHeader, extractTokenFromCookies } from '@/domains/auth';
import { AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';
import { REQUIRE_LOGIN } from '@/gradian-ui/shared/configs/env-config';

/**
 * Extract userId from JWT token in request
 */
function getUserIdFromToken(request: NextRequest): string | null {
  // Try Authorization header
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);

  if (!token) {
    // Try cookies
    const cookies = request.headers.get('cookie');
    token = extractTokenFromCookies(cookies, AUTH_CONFIG.ACCESS_TOKEN_COOKIE);
  }

  if (!token) {
    return null;
  }

  try {
    const result = validateToken(token);
    if (result.valid && result.payload?.userId) {
      return result.payload.userId;
    }
  } catch (error) {
    console.error('Error extracting userId from token:', error);
  }

  return null;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'all-settings.json');

/**
 * Ensure data directory and settings file exist
 */
function ensureSettingsFile(): void {
  const dataDir = path.join(process.cwd(), 'data');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(SETTINGS_FILE_PATH)) {
    const initialData: Record<string, UserSettings> = {};
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

/**
 * Load all settings from the JSON file
 */
function loadAllSettings(): Record<string, UserSettings> {
  try {
    ensureSettingsFile();
    const fileContents = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
    const settings = JSON.parse(fileContents);
    return settings || {};
  } catch (error) {
    console.error('Error reading all-settings.json:', error);
    return {};
  }
}

/**
 * Save all settings to the JSON file
 */
function saveAllSettings(settings: Record<string, UserSettings>): void {
  try {
    ensureSettingsFile();
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving all-settings.json:', error);
    throw error;
  }
}

/**
 * Get settings for a specific user
 */
function getUserSettings(userId: string): UserSettings | null {
  const allSettings = loadAllSettings();
  return allSettings[userId] || null;
}

/**
 * Save settings for a specific user
 */
function saveUserSettings(userId: string, settings: UserSettings): void {
  const allSettings = loadAllSettings();
  allSettings[userId] = {
    ...settings,
    userId,
    updatedAt: new Date().toISOString(),
  };
  saveAllSettings(allSettings);
}

/**
 * GET - Get settings for a user
 * Gets userId from JWT token
 */
export async function GET(request: NextRequest) {
  try {
    // Get userId from JWT token
    let userId = getUserIdFromToken(request);

    // If REQUIRE_LOGIN is false, allow anonymous settings using a shared demo user
    if (!userId && !REQUIRE_LOGIN) {
      userId = 'anonymous-demo-user';
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please log in.',
        },
        { status: 401 }
      );
    }

    let userSettings = getUserSettings(userId);

    // If no settings exist, return defaults
    if (!userSettings) {
      userSettings = getDefaultUserSettings(userId);
      // Optionally save defaults (uncomment if you want to persist defaults)
      // saveUserSettings(userId, userSettings);
    } else {
      // Merge with defaults to ensure all fields are present
      userSettings = mergeWithDefaults(userSettings);
    }

    return NextResponse.json({
      success: true,
      data: userSettings,
      message: 'Settings retrieved successfully',
    });
  } catch (error) {
    console.error('Settings API GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new settings for a user
 * Gets userId from JWT token
 */
export async function POST(request: NextRequest) {
  try {
    // Get userId from JWT token
    let userId = getUserIdFromToken(request);
    const body = await request.json();

    // If REQUIRE_LOGIN is false, allow anonymous settings using a shared demo user
    if (!userId && !REQUIRE_LOGIN) {
      userId = 'anonymous-demo-user';
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please log in.',
        },
        { status: 401 }
      );
    }

    // Check if settings already exist
    const existingSettings = getUserSettings(userId);
    if (existingSettings) {
      return NextResponse.json(
        {
          success: false,
          error: 'Settings already exist for this user. Use PUT to update.',
        },
        { status: 409 }
      );
    }

    // Create new settings with defaults
    const newSettings = mergeWithDefaults({
      userId,
      ...body,
      createdAt: new Date().toISOString(),
    });

    saveUserSettings(userId, newSettings);

    return NextResponse.json({
      success: true,
      data: newSettings,
      message: 'Settings created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Settings API POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create settings',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update settings for a user (partial update)
 * Gets userId from JWT token
 */
export async function PUT(request: NextRequest) {
  try {
    // Get userId from JWT token
    let userId = getUserIdFromToken(request);
    const updates: SettingsUpdate = await request.json();

    // If REQUIRE_LOGIN is false, allow anonymous settings using a shared demo user
    if (!userId && !REQUIRE_LOGIN) {
      userId = 'anonymous-demo-user';
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please log in.',
        },
        { status: 401 }
      );
    }

    // Get existing settings or use defaults
    let existingSettings = getUserSettings(userId);
    if (!existingSettings) {
      existingSettings = getDefaultUserSettings(userId);
    }

    // Merge updates with existing settings
    const updatedSettings: UserSettings = {
      ...existingSettings,
      profile: {
        ...existingSettings.profile,
        ...updates.profile,
      },
      notifications: {
        ...existingSettings.notifications,
        ...updates.notifications,
      },
      security: {
        ...existingSettings.security,
        ...updates.security,
        // Don't store currentPassword in saved settings
        currentPassword: undefined,
      },
      appearance: {
        ...existingSettings.appearance,
        ...updates.appearance,
      },
      integrations: {
        ...existingSettings.integrations,
        ...updates.integrations,
      },
      userId,
      createdAt: existingSettings.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Merge with defaults to ensure all fields are present
    const finalSettings = mergeWithDefaults(updatedSettings);

    saveUserSettings(userId, finalSettings);

    return NextResponse.json({
      success: true,
      data: finalSettings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Settings API PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete settings for a user
 * Gets userId from JWT token
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get userId from JWT token
    let userId = getUserIdFromToken(request);

    // If REQUIRE_LOGIN is false, allow anonymous settings using a shared demo user
    if (!userId && !REQUIRE_LOGIN) {
      userId = 'anonymous-demo-user';
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please log in.',
        },
        { status: 401 }
      );
    }

    const allSettings = loadAllSettings();
    
    if (!allSettings[userId]) {
      return NextResponse.json(
        {
          success: false,
          error: 'Settings not found for this user',
        },
        { status: 404 }
      );
    }

    delete allSettings[userId];
    saveAllSettings(allSettings);

    return NextResponse.json({
      success: true,
      message: 'Settings deleted successfully',
    });
  } catch (error) {
    console.error('Settings API DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete settings',
      },
      { status: 500 }
    );
  }
}

