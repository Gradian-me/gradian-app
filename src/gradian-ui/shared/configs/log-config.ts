// Logging Configuration

export enum LogType {
  FORM_DATA = 'FORM_DATA',
  REQUEST_BODY = 'REQUEST_BODY',
  REQUEST_RESPONSE = 'REQUEST_RESPONSE',
  AI_BODY_LOG = 'AI_BODY_LOG',
  AI_RESPONSE_LOG = 'AI_RESPONSE_LOG',
  AI_MODEL_LOG = 'AI_MODEL_LOG',
  SCHEMA_LOADER = 'SCHEMA_LOADER',
  CALL_BACKEND = 'CALL_BACKEND',
  ENDPOINT_LOG = 'ENDPOINT_LOG',
  INDEXDB_CACHE = 'INDEXDB_CACHE',
  INTEGRATION_LOG = 'INTEGRATION_LOG',
  GRAPH_LOG = 'GRAPH_LOG',
  EMAIL_LOG = 'EMAIL_LOG',
  LOGIN_LOG = 'LOGIN_LOG',
  INFRA_LOG = 'INFRA_LOG',
  CLIENT_LOG = 'CLIENT_LOG',
}

// Default log configuration
const defaultLogConfig: Record<LogType, boolean> = {
  [LogType.FORM_DATA]: false,
  [LogType.REQUEST_BODY]: true,
  [LogType.REQUEST_RESPONSE]: true,
  [LogType.AI_BODY_LOG]: true,
  [LogType.AI_RESPONSE_LOG]: true,
  [LogType.AI_MODEL_LOG]: false,
  [LogType.SCHEMA_LOADER]: true,
  [LogType.CALL_BACKEND]: true,
  [LogType.ENDPOINT_LOG]: true,
  [LogType.INDEXDB_CACHE]: true,
  [LogType.INTEGRATION_LOG]: true,
  [LogType.GRAPH_LOG]: true,
  [LogType.EMAIL_LOG]: true,
  [LogType.LOGIN_LOG]: true,
  [LogType.INFRA_LOG]: true,
  [LogType.CLIENT_LOG]: true,
};

/**
 * Check if logging is enabled via environment variable
 * For server: ENABLE_LOGGING=true
 * For client: NEXT_PUBLIC_ENABLE_LOGGING=true
 */
function isLoggingEnabled(): boolean {
  if (typeof process !== 'undefined') {
    // Server-side check
    if (process.env?.ENABLE_LOGGING === 'true') {
      return true;
    }
    
    // Client-side check (Next.js bundles process.env for client with NEXT_PUBLIC_ prefix)
    if (process.env?.NEXT_PUBLIC_ENABLE_LOGGING === 'true') {
      return true;
    }
  }
  
  return false;
}

// Load configuration
// Note: Logging is controlled by ENABLE_LOGGING=true (server) or NEXT_PUBLIC_ENABLE_LOGGING=true (client)
// See logging-custom.ts for the master switch
// If ENABLE_LOGGING is false, all log types are disabled regardless of defaults
// EXCEPT: ENDPOINT_LOG is independent and always respects its default value (for UX in error messages)
function loadLogConfig(): Record<LogType, boolean> {
  const config = { ...defaultLogConfig };
  
  // If logging is not enabled globally, disable all log types
  if (!isLoggingEnabled()) {
    // But keep ENDPOINT_LOG at its default value (independent of ENABLE_LOGGING)
    const endpointLogValue = config[LogType.ENDPOINT_LOG];
    const result = Object.values(LogType).reduce((acc, logType) => {
      acc[logType] = false;
      return acc;
    }, {} as Record<LogType, boolean>);
    // Restore ENDPOINT_LOG to its default value
    result[LogType.ENDPOINT_LOG] = endpointLogValue;
    return result;
  }
  
  // If logging is enabled, return the default configuration
  return config;
}

export const LOG_CONFIG = loadLogConfig();

