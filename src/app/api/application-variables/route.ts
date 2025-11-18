import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const APPLICATION_VARIABLES_FILE = join(
  process.cwd(),
  'src',
  'gradian-ui',
  'shared',
  'constants',
  'application-variables.ts'
);

/**
 * GET - Get application variables
 */
export async function GET(request: NextRequest) {
  try {
    const fileContent = await readFile(APPLICATION_VARIABLES_FILE, 'utf-8');
    
    // Parse the TypeScript file to extract values
    // This is a simplified parser - in production you might want to use a proper TS parser
    const logConfigMatch = fileContent.match(/export const LOG_CONFIG = \{([\s\S]+?)\}/);
    const authConfigMatch = fileContent.match(/export const AUTH_CONFIG = \{([\s\S]+?(?:\{[\s\S]+?\}[\s\S]*?)*?)\}/);
    const uiParamsMatch = fileContent.match(/export const UI_PARAMS = \{([\s\S]+?(?:\{[\s\S]+?\}[\s\S]*?)*?)\}/);
    const schemaSummaryMatch = fileContent.match(/export const SCHEMA_SUMMARY_EXCLUDED_KEYS = \[([\s\S]+?)\]/);
    const demoModeParamsMatch = fileContent.match(/export const DEMO_MODE_PARAMS = \{[\s\S]*?DEMO_MODE:\s*(true|false)[\s\S]*?\} as const;/);

    // Extract LOG_CONFIG values
    const logConfig: Record<string, boolean> = {};
    if (logConfigMatch) {
      const logConfigContent = logConfigMatch[1];
      const logTypes = ['FORM_DATA', 'REQUEST_BODY', 'REQUEST_RESPONSE', 'SCHEMA_LOADER', 'CALL_BACKEND', 'INDEXDB_CACHE', 'INTEGRATION_LOG'];
      logTypes.forEach(type => {
        const regex = new RegExp(`\\[LogType\\.${type}\\]:\\s*(true|false)`);
        const match = logConfigContent.match(regex);
        if (match) {
          logConfig[type] = match[1] === 'true';
        }
      });
    }

    // Extract AUTH_CONFIG values (simplified - only non-env values)
    const authConfig: any = {
      ERROR_MESSAGES: {}
    };
    if (authConfigMatch) {
      const authConfigContent = authConfigMatch[1];
      
      // Extract ACCESS_TOKEN_COOKIE
      const accessTokenCookieMatch = authConfigContent.match(/ACCESS_TOKEN_COOKIE:\s*['"]([^'"]+)['"]/);
      if (accessTokenCookieMatch) {
        authConfig.ACCESS_TOKEN_COOKIE = accessTokenCookieMatch[1];
      }
      
      // Extract REFRESH_TOKEN_COOKIE
      const refreshTokenCookieMatch = authConfigContent.match(/REFRESH_TOKEN_COOKIE:\s*['"]([^'"]+)['"]/);
      if (refreshTokenCookieMatch) {
        authConfig.REFRESH_TOKEN_COOKIE = refreshTokenCookieMatch[1];
      }
      
      // Extract USERS_API_PATH
      const usersApiPathMatch = authConfigContent.match(/USERS_API_PATH:\s*['"]([^'"]+)['"]/);
      if (usersApiPathMatch) {
        authConfig.USERS_API_PATH = usersApiPathMatch[1];
      }
      
      // Extract JWT_SECRET (from env or fallback)
      const jwtSecretMatch = authConfigContent.match(/JWT_SECRET:\s*process\.env\.(?:JWT_SECRET|NEXTAUTH_SECRET)[^,}]*\|\|\s*['"]([^'"]+)['"]/);
      if (jwtSecretMatch) {
        authConfig.JWT_SECRET = jwtSecretMatch[1];
      } else {
        // Try to extract just the fallback value
        const jwtSecretFallbackMatch = authConfigContent.match(/JWT_SECRET:[^'"]*['"]([^'"]+)['"]/);
        if (jwtSecretFallbackMatch) {
          authConfig.JWT_SECRET = jwtSecretFallbackMatch[1];
        }
      }
      
      // Extract ACCESS_TOKEN_EXPIRY
      const accessTokenExpiryMatch = authConfigContent.match(/ACCESS_TOKEN_EXPIRY:\s*parseInt\([^,}]*\|\|\s*['"]([^'"]+)['"]/);
      if (accessTokenExpiryMatch) {
        authConfig.ACCESS_TOKEN_EXPIRY = parseInt(accessTokenExpiryMatch[1], 10);
      } else {
        // Try to extract just the fallback value
        const accessTokenExpiryFallbackMatch = authConfigContent.match(/ACCESS_TOKEN_EXPIRY:[^'"]*['"]([^'"]+)['"]/);
        if (accessTokenExpiryFallbackMatch) {
          authConfig.ACCESS_TOKEN_EXPIRY = parseInt(accessTokenExpiryFallbackMatch[1], 10);
        }
      }
      
      // Extract REFRESH_TOKEN_EXPIRY
      const refreshTokenExpiryMatch = authConfigContent.match(/REFRESH_TOKEN_EXPIRY:\s*parseInt\([^,}]*\|\|\s*['"]([^'"]+)['"]/);
      if (refreshTokenExpiryMatch) {
        authConfig.REFRESH_TOKEN_EXPIRY = parseInt(refreshTokenExpiryMatch[1], 10);
      } else {
        // Try to extract just the fallback value
        const refreshTokenExpiryFallbackMatch = authConfigContent.match(/REFRESH_TOKEN_EXPIRY:[^'"]*['"]([^'"]+)['"]/);
        if (refreshTokenExpiryFallbackMatch) {
          authConfig.REFRESH_TOKEN_EXPIRY = parseInt(refreshTokenExpiryFallbackMatch[1], 10);
        }
      }
      
      // Extract ERROR_MESSAGES - extract directly from file content to handle nested braces
      const errorMessagesMatch = fileContent.match(/ERROR_MESSAGES:\s*\{([\s\S]*?)\}\s*(?=,|\})/);
      if (errorMessagesMatch) {
        const errorMessagesContent = errorMessagesMatch[1];
        authConfig.ERROR_MESSAGES = {};
        const errorKeys = ['USER_NOT_FOUND', 'INVALID_PASSWORD', 'INVALID_TOKEN', 'MISSING_TOKEN', 'TOKEN_EXPIRED', 'UNAUTHORIZED', 'LOGIN_REQUIRED'];
        errorKeys.forEach(key => {
          // Match key: 'value' or key: "value"
          const regex = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`);
          const match = errorMessagesContent.match(regex);
          if (match) {
            authConfig.ERROR_MESSAGES[key] = match[1];
          }
        });
      }
    }

    // Extract UI_PARAMS values
    const uiParams: any = {};
    if (uiParamsMatch) {
      const uiParamsContent = uiParamsMatch[1];
      const stepMatch = uiParamsContent.match(/STEP:\s*([\d.]+)/);
      const maxMatch = uiParamsContent.match(/MAX:\s*([\d.]+)/);
      const skeletonMaxMatch = uiParamsContent.match(/SKELETON_MAX:\s*([\d.]+)/);
      
      if (stepMatch || maxMatch || skeletonMaxMatch) {
        uiParams.CARD_INDEX_DELAY = {};
        if (stepMatch) uiParams.CARD_INDEX_DELAY.STEP = parseFloat(stepMatch[1]);
        if (maxMatch) uiParams.CARD_INDEX_DELAY.MAX = parseFloat(maxMatch[1]);
        if (skeletonMaxMatch) uiParams.CARD_INDEX_DELAY.SKELETON_MAX = parseFloat(skeletonMaxMatch[1]);
      }
    }

    // Extract SCHEMA_SUMMARY_EXCLUDED_KEYS
    const schemaSummaryExcludedKeys: string[] = [];
    if (schemaSummaryMatch) {
      const keysContent = schemaSummaryMatch[1];
      const keyMatches = keysContent.matchAll(/['"]([^'"]+)['"]/g);
      for (const match of keyMatches) {
        schemaSummaryExcludedKeys.push(match[1]);
      }
    }

    // Extract DEMO_MODE_PARAMS
    let demoMode = true; // default
    if (demoModeParamsMatch) {
      demoMode = demoModeParamsMatch[1] === 'true';
    }

    return NextResponse.json({
      success: true,
      data: {
        LOG_CONFIG: logConfig,
        AUTH_CONFIG: authConfig,
        UI_PARAMS: uiParams,
        SCHEMA_SUMMARY_EXCLUDED_KEYS: schemaSummaryExcludedKeys,
        DEMO_MODE: demoMode,
        rawFile: fileContent
      }
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
    const body = await request.json();
    const { LOG_CONFIG, AUTH_CONFIG, UI_PARAMS, SCHEMA_SUMMARY_EXCLUDED_KEYS, DEMO_MODE } = body;

    // Read current file
    let fileContent = await readFile(APPLICATION_VARIABLES_FILE, 'utf-8');

    // Update LOG_CONFIG
    if (LOG_CONFIG) {
      const logConfigSection = fileContent.match(/export const LOG_CONFIG = \{([\s\S]+?)\}/);
      if (logConfigSection) {
        const logTypes = Object.keys(LOG_CONFIG);
        let newLogConfig = 'export const LOG_CONFIG = {\n';
        logTypes.forEach((type, index) => {
          newLogConfig += `  [LogType.${type}]: ${LOG_CONFIG[type]}`;
          if (index < logTypes.length - 1) newLogConfig += ',\n';
          else newLogConfig += '\n';
        });
        newLogConfig += '};';
        fileContent = fileContent.replace(/export const LOG_CONFIG = \{([\s\S]+?)\}/, newLogConfig);
      }
    }

    // Update AUTH_CONFIG (only non-env values)
    if (AUTH_CONFIG) {
      // Update ACCESS_TOKEN_COOKIE
      if (AUTH_CONFIG.ACCESS_TOKEN_COOKIE) {
        fileContent = fileContent.replace(
          /ACCESS_TOKEN_COOKIE:\s*['"][^'"]+['"]/,
          `ACCESS_TOKEN_COOKIE: '${AUTH_CONFIG.ACCESS_TOKEN_COOKIE}'`
        );
      }
      
      // Update REFRESH_TOKEN_COOKIE
      if (AUTH_CONFIG.REFRESH_TOKEN_COOKIE) {
        fileContent = fileContent.replace(
          /REFRESH_TOKEN_COOKIE:\s*['"][^'"]+['"]/,
          `REFRESH_TOKEN_COOKIE: '${AUTH_CONFIG.REFRESH_TOKEN_COOKIE}'`
        );
      }
      
      // Update USERS_API_PATH
      if (AUTH_CONFIG.USERS_API_PATH) {
        fileContent = fileContent.replace(
          /USERS_API_PATH:\s*['"][^'"]+['"]/,
          `USERS_API_PATH: '${AUTH_CONFIG.USERS_API_PATH}'`
        );
      }
      
      // Update ERROR_MESSAGES
      if (AUTH_CONFIG.ERROR_MESSAGES) {
        Object.keys(AUTH_CONFIG.ERROR_MESSAGES).forEach(key => {
          const regex = new RegExp(`${key}:\\s*['"][^'"]+['"]`);
          fileContent = fileContent.replace(
            regex,
            `${key}: '${AUTH_CONFIG.ERROR_MESSAGES[key]}'`
          );
        });
      }
      
      // Update JWT_SECRET fallback value
      if (AUTH_CONFIG.JWT_SECRET !== undefined) {
        fileContent = fileContent.replace(
          /JWT_SECRET:\s*process\.env\.(?:JWT_SECRET|NEXTAUTH_SECRET)[^,}]*\|\|\s*['"][^'"]+['"]/,
          `JWT_SECRET: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '${AUTH_CONFIG.JWT_SECRET}'`
        );
      }
      
      // Update ACCESS_TOKEN_EXPIRY fallback value
      if (AUTH_CONFIG.ACCESS_TOKEN_EXPIRY !== undefined) {
        fileContent = fileContent.replace(
          /ACCESS_TOKEN_EXPIRY:\s*parseInt\([^)]*\)/,
          `ACCESS_TOKEN_EXPIRY: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '${AUTH_CONFIG.ACCESS_TOKEN_EXPIRY}', 10)`
        );
      }
      
      // Update REFRESH_TOKEN_EXPIRY fallback value
      if (AUTH_CONFIG.REFRESH_TOKEN_EXPIRY !== undefined) {
        fileContent = fileContent.replace(
          /REFRESH_TOKEN_EXPIRY:\s*parseInt\([^)]*\)/,
          `REFRESH_TOKEN_EXPIRY: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '${AUTH_CONFIG.REFRESH_TOKEN_EXPIRY}', 10)`
        );
      }
    }

    // Update UI_PARAMS
    if (UI_PARAMS?.CARD_INDEX_DELAY) {
      const { STEP, MAX, SKELETON_MAX } = UI_PARAMS.CARD_INDEX_DELAY;
      if (STEP !== undefined) {
        fileContent = fileContent.replace(/STEP:\s*[\d.]+/, `STEP: ${STEP}`);
      }
      if (MAX !== undefined) {
        fileContent = fileContent.replace(/MAX:\s*[\d.]+/, `MAX: ${MAX}`);
      }
      if (SKELETON_MAX !== undefined) {
        fileContent = fileContent.replace(/SKELETON_MAX:\s*[\d.]+/, `SKELETON_MAX: ${SKELETON_MAX}`);
      }
    }

    // Update SCHEMA_SUMMARY_EXCLUDED_KEYS
    if (SCHEMA_SUMMARY_EXCLUDED_KEYS && Array.isArray(SCHEMA_SUMMARY_EXCLUDED_KEYS)) {
      const keysString = SCHEMA_SUMMARY_EXCLUDED_KEYS.map(key => `  '${key}'`).join(',\n');
      fileContent = fileContent.replace(
        /export const SCHEMA_SUMMARY_EXCLUDED_KEYS = \[([\s\S]+?)\]\s*as const;/,
        `export const SCHEMA_SUMMARY_EXCLUDED_KEYS = [\n${keysString},\n] as const;`
      );
    }

    // Update DEMO_MODE_PARAMS
    if (DEMO_MODE !== undefined) {
      const demoModeValue = DEMO_MODE ? 'true' : 'false';
      // Replace DEMO_MODE_PARAMS
      fileContent = fileContent.replace(
        /export const DEMO_MODE_PARAMS = \{[\s\S]*?DEMO_MODE:\s*(true|false)[\s\S]*?\} as const;/,
        `export const DEMO_MODE_PARAMS = {
  DEMO_MODE: ${demoModeValue},
} as const;`
      );
    }

    // Write back to file
    await writeFile(APPLICATION_VARIABLES_FILE, fileContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Application variables updated successfully'
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

