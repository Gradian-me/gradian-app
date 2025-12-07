import { LogType, LOG_CONFIG } from '../constants/application-variables';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

const getLogFlag = (logType: LogType): boolean => {
  return LOG_CONFIG[logType] ?? false;
};

/**
 * Check if logging is enabled via environment variable
 * For server: ENABLE_LOGGING=true
 * For client: NEXT_PUBLIC_ENABLE_LOGGING=true
 */
const isLoggingEnabled = (): boolean => {
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
};

/**
 * Custom logging function that checks if logging is enabled for the given log type
 * Requires ENABLE_LOGGING=true (server) or NEXT_PUBLIC_ENABLE_LOGGING=true (client)
 * @param logType - The type of logging from LogType enum
 * @param level - The log level (log, info, warn, error, debug)
 * @param message - The message to log
 */
export const loggingCustom = (logType: LogType, level: LogLevel, message: string) => {
  // Check if logging is enabled via environment variable
  if (!isLoggingEnabled()) {
    return;
  }

  // Check if logging is enabled for this log type
  const isLogEnabled = getLogFlag(logType);
  if (!isLogEnabled) {
    return;
  }

  const prefix = `[${logType}]`;
  const formattedMessage = `${prefix} ${message}`;

  switch (level) {
    case 'log':
      console.log(formattedMessage);
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'error':
      console.error(formattedMessage);
      break;
    case 'debug':
      console.debug(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
};

