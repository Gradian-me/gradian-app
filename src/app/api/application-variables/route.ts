import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';
import { clearApplicationVariablesCache } from '@/gradian-ui/shared/utils/application-variables-loader';

const APPLICATION_VARIABLES_FILE = join(process.cwd(), 'data', 'application-variables.json');

/**
 * Ensure the application variables JSON file exists
 */
async function ensureApplicationVariablesFile(): Promise<void> {
  try {
    await readFile(APPLICATION_VARIABLES_FILE, 'utf-8');
  } catch {
    // File doesn't exist, create it with default values
    const defaultData = {
      LOG_CONFIG: {
        FORM_DATA: true,
        REQUEST_BODY: true,
        REQUEST_RESPONSE: true,
        SCHEMA_LOADER: true,
        CALL_BACKEND: true,
        INDEXDB_CACHE: true,
        INTEGRATION_LOG: true
      },
      AUTH_CONFIG: {
        JWT_SECRET: 'your-default-secret-key-change-in-production',
        ACCESS_TOKEN_EXPIRY: 3600,
        REFRESH_TOKEN_EXPIRY: 604800,
        ACCESS_TOKEN_COOKIE: 'auth_token',
        REFRESH_TOKEN_COOKIE: 'refresh_token',
        USERS_API_PATH: '/api/data/users',
        ERROR_MESSAGES: {
          USER_NOT_FOUND: 'User does not exist',
          INVALID_PASSWORD: 'Password is incorrect',
          INVALID_TOKEN: 'Invalid or expired token',
          MISSING_TOKEN: 'Authentication token is required',
          TOKEN_EXPIRED: 'Token has expired',
          UNAUTHORIZED: 'Unauthorized access',
          LOGIN_REQUIRED: 'Please log in to continue'
        }
      },
      UI_PARAMS: {
        CARD_INDEX_DELAY: {
          STEP: 0.05,
          MAX: 0.4,
          SKELETON_MAX: 0.25
        }
      },
      SCHEMA_SUMMARY_EXCLUDED_KEYS: [
        'fields',
        'sections',
        'detailPageMetadata'
      ],
      DEMO_MODE: true
    };
    await writeFile(APPLICATION_VARIABLES_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

/**
 * GET - Get application variables
 */
export async function GET(request: NextRequest) {
  try {
    await ensureApplicationVariablesFile();
    const fileContent = await readFile(APPLICATION_VARIABLES_FILE, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch application variables'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update application variables
 */
export async function PUT(request: NextRequest) {
  try {
    await ensureApplicationVariablesFile();
    const body = await request.json();
    
    // Read current data
    const fileContent = await readFile(APPLICATION_VARIABLES_FILE, 'utf-8');
    const currentData = JSON.parse(fileContent);
    
    // Merge updates with current data
    const updatedData = {
      ...currentData,
      ...(body.LOG_CONFIG && { LOG_CONFIG: { ...currentData.LOG_CONFIG, ...body.LOG_CONFIG } }),
      ...(body.AUTH_CONFIG && {
        AUTH_CONFIG: {
          ...currentData.AUTH_CONFIG,
          ...body.AUTH_CONFIG,
          ...(body.AUTH_CONFIG.ERROR_MESSAGES && {
            ERROR_MESSAGES: {
              ...currentData.AUTH_CONFIG?.ERROR_MESSAGES,
              ...body.AUTH_CONFIG.ERROR_MESSAGES
            }
          })
        }
      }),
      ...(body.UI_PARAMS && {
        UI_PARAMS: {
          ...currentData.UI_PARAMS,
          ...body.UI_PARAMS,
          ...(body.UI_PARAMS.CARD_INDEX_DELAY && {
            CARD_INDEX_DELAY: {
              ...currentData.UI_PARAMS?.CARD_INDEX_DELAY,
              ...body.UI_PARAMS.CARD_INDEX_DELAY
            }
          })
        }
      }),
      ...(body.SCHEMA_SUMMARY_EXCLUDED_KEYS !== undefined && {
        SCHEMA_SUMMARY_EXCLUDED_KEYS: body.SCHEMA_SUMMARY_EXCLUDED_KEYS
      }),
      ...(body.DEMO_MODE !== undefined && { DEMO_MODE: body.DEMO_MODE })
    };

    // Write back to file
    await writeFile(APPLICATION_VARIABLES_FILE, JSON.stringify(updatedData, null, 2), 'utf-8');

    // Clear server-side cache so next read will get fresh data
    clearApplicationVariablesCache();

    // Revalidate Next.js page cache for the builder page and all pages that use application variables
    try {
      revalidatePath('/builder/application-variables', 'page');
      revalidatePath('/builder/application-variables', 'layout');
      // Also revalidate root pages that might use application variables
      revalidatePath('/', 'layout');
    } catch (error) {
      console.warn('Could not revalidate application variables pages:', error);
      // Don't throw - cache clearing should still succeed even if revalidation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application variables updated successfully',
      clearClientCache: true // Signal to client that it should clear its cache
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update application variables'
      },
      { status: 500 }
    );
  }
}

