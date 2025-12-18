import { NextRequest, NextResponse } from 'next/server';
import { REQUIRE_LOGIN, LOGIN_LOCALLY } from '@/gradian-ui/shared/configs/env-config';
import { EXCLUDED_LOGIN_ROUTES, AUTH_CONFIG } from '@/gradian-ui/shared/configs/auth-config';

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
    const config = {
      REQUIRE_LOGIN: REQUIRE_LOGIN ?? false,
      EXCLUDED_LOGIN_ROUTES: EXCLUDED_LOGIN_ROUTES ?? [],
      LOGIN_LOCALLY: LOGIN_LOCALLY ?? false,
      ACCESS_TOKEN_COOKIE: AUTH_CONFIG.ACCESS_TOKEN_COOKIE,
      REFRESH_TOKEN_COOKIE: AUTH_CONFIG.REFRESH_TOKEN_COOKIE,
      ACCESS_TOKEN_EXPIRY: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
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

