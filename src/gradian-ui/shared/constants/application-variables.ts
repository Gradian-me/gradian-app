// Application logging enums and variables
export enum LogType {
  FORM_DATA = 'FORM_DATA',
  REQUEST_BODY = 'REQUEST_BODY',
  REQUEST_RESPONSE = 'REQUEST_RESPONSE',
  SCHEMA_LOADER = 'SCHEMA_LOADER',
  CALL_BACKEND = 'CALL_BACKEND',
  INDEXDB_CACHE = 'INDEXDB_CACHE',
  INTEGRATION_LOG = 'INTEGRATION_LOG',
  GRAPH_LOG = 'GRAPH_LOG',
  EMAIL_LOG = 'EMAIL_LOG',
  LOGIN_LOG = 'LOGIN_LOG',
  INFRA_LOG = 'INFRA_LOG',
}

// Try to import JSON file as single source of truth for defaults
// If import fails, we'll use shared defaults
let defaultVariables: any = null;
try {
  defaultVariables = require('../../../../data/application-variables.json');
} catch {
  // JSON import failed, will use shared defaults
}

import { DEFAULT_APPLICATION_VARIABLES } from './application-variables-defaults';

// CLIENT-SAFE: This file must not import server-only modules
// Server-side code that needs file system access should import
// application-variables-loader directly

function loadVariables() {
  // Use imported JSON if available, otherwise use shared defaults
  const defaults = defaultVariables || DEFAULT_APPLICATION_VARIABLES;
  
  // Ensure we always have a valid LOG_CONFIG structure
  const sourceLogConfig = defaults?.LOG_CONFIG || DEFAULT_APPLICATION_VARIABLES.LOG_CONFIG || {};
  const logConfig = Object.values(LogType).reduce((acc, logType) => {
    acc[logType] = sourceLogConfig[logType] ?? DEFAULT_APPLICATION_VARIABLES.LOG_CONFIG[logType] ?? true;
    return acc;
  }, {} as Record<LogType, boolean>);

  // Allow explicitly disabling demo mode via env; default allows unless non-dev
  const canSetDemoEnv = typeof process !== 'undefined' ? process.env.CAN_SET_DEMO_MODE : undefined;
  const canSetDemoMode = canSetDemoEnv === undefined ? true : canSetDemoEnv.toLowerCase() === 'true';
  // DEMO_MODE follows config unless explicitly disallowed via CAN_SET_DEMO_MODE=false
  const demoMode = canSetDemoMode
    ? (defaults?.DEMO_MODE ?? DEFAULT_APPLICATION_VARIABLES.DEMO_MODE)
    : false;

  return {
    LOG_CONFIG: logConfig,
    AUTH_CONFIG: defaults?.AUTH_CONFIG || DEFAULT_APPLICATION_VARIABLES.AUTH_CONFIG,
    UI_PARAMS: defaults?.UI_PARAMS || DEFAULT_APPLICATION_VARIABLES.UI_PARAMS,
    SCHEMA_SUMMARY_EXCLUDED_KEYS: defaults?.SCHEMA_SUMMARY_EXCLUDED_KEYS || DEFAULT_APPLICATION_VARIABLES.SCHEMA_SUMMARY_EXCLUDED_KEYS,
    DEMO_MODE: demoMode,
    LOGIN_LOCALLY: defaults?.LOGIN_LOCALLY ?? DEFAULT_APPLICATION_VARIABLES.LOGIN_LOCALLY,
    AD_MODE: defaults?.AD_MODE ?? DEFAULT_APPLICATION_VARIABLES.AD_MODE,
    REQUIRE_LOGIN: defaults?.REQUIRE_LOGIN ?? DEFAULT_APPLICATION_VARIABLES.REQUIRE_LOGIN,
    EXCLUDED_LOGIN_ROUTES: defaults?.EXCLUDED_LOGIN_ROUTES ?? DEFAULT_APPLICATION_VARIABLES.EXCLUDED_LOGIN_ROUTES,
    FORBIDDEN_ROUTES_PRODUCTION: defaults?.FORBIDDEN_ROUTES_PRODUCTION ?? DEFAULT_APPLICATION_VARIABLES.FORBIDDEN_ROUTES_PRODUCTION,
    AI_CONFIG: defaults?.AI_CONFIG || DEFAULT_APPLICATION_VARIABLES.AI_CONFIG,
  };
}

const vars = loadVariables();

export const LOG_CONFIG = vars.LOG_CONFIG;
export const AUTH_CONFIG = vars.AUTH_CONFIG;
export const UI_PARAMS = vars.UI_PARAMS;
export const SCHEMA_SUMMARY_EXCLUDED_KEYS = vars.SCHEMA_SUMMARY_EXCLUDED_KEYS;
export const DEMO_MODE_PARAMS = { DEMO_MODE: vars.DEMO_MODE } as const;
export const DEMO_MODE = vars.DEMO_MODE;
export const LOGIN_LOCALLY_PARAMS = { LOGIN_LOCALLY: vars.LOGIN_LOCALLY } as const;
export const LOGIN_LOCALLY = vars.LOGIN_LOCALLY;
export const AD_MODE_PARAMS = { AD_MODE: vars.AD_MODE } as const;
export const AD_MODE = vars.AD_MODE;
export const REQUIRE_LOGIN = vars.REQUIRE_LOGIN;
export const EXCLUDED_LOGIN_ROUTES = vars.EXCLUDED_LOGIN_ROUTES;
export const FORBIDDEN_ROUTES_PRODUCTION = vars.FORBIDDEN_ROUTES_PRODUCTION;
export const AI_CONFIG = vars.AI_CONFIG;

// Common URLs
export const URL_HOME: string =
  (vars?.UI_PARAMS as any)?.HOME_URL ?? '/apps';

// Client-safe cache clear function (no-op on client, server code should use loader directly)
export function clearCache() {
  // This is a no-op for client-side code
  // Server-side code should import and use clearApplicationVariablesCache from application-variables-loader
}