import { NextRequest, NextResponse } from 'next/server';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';

// Cache the config for a short time to avoid hitting the file system on every request
let cachedConfig: {
  REQUIRE_LOGIN: boolean;
  EXCLUDED_LOGIN_ROUTES: string[];
  LOGIN_LOCALLY: boolean;
  ACCESS_TOKEN_COOKIE: string;
  REFRESH_TOKEN_COOKIE: string;
  ACCESS_TOKEN_EXPIRY: number;
} | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    
    // Return cached config if still valid
    if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cachedConfig,
        cached: true,
      });
    }

    // Load fresh config
    const vars = loadApplicationVariables();
    const config = {
      REQUIRE_LOGIN: vars.REQUIRE_LOGIN ?? false,
      EXCLUDED_LOGIN_ROUTES: vars.EXCLUDED_LOGIN_ROUTES ?? [],
      LOGIN_LOCALLY: vars.LOGIN_LOCALLY ?? false,
      ACCESS_TOKEN_COOKIE: vars.AUTH_CONFIG?.ACCESS_TOKEN_COOKIE || 'access_token',
      REFRESH_TOKEN_COOKIE: vars.AUTH_CONFIG?.REFRESH_TOKEN_COOKIE || 'refresh_token',
      ACCESS_TOKEN_EXPIRY: vars.AUTH_CONFIG?.ACCESS_TOKEN_EXPIRY || 3600,
    };

    // Update cache
    cachedConfig = config;
    cacheTimestamp = now;

    return NextResponse.json({
      success: true,
      data: config,
      cached: false,
    });
  } catch (error) {
    // Return defaults on error
    const defaultConfig = {
      REQUIRE_LOGIN: false,
      EXCLUDED_LOGIN_ROUTES: [],
      LOGIN_LOCALLY: false,
      ACCESS_TOKEN_COOKIE: 'access_token',
      REFRESH_TOKEN_COOKIE: 'refresh_token',
      ACCESS_TOKEN_EXPIRY: 3600,
    };

    return NextResponse.json({
      success: true,
      data: defaultConfig,
      error: error instanceof Error ? error.message : 'Failed to load config',
    });
  }
}

