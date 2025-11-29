/**
 * Type definitions for postMessage communication between embedded form and parent window
 */

export type FormEmbedMode = 'create' | 'edit';

export interface FormEmbedMessage {
  type: FormEmbedMessageType;
  payload?: any;
  timestamp: number;
  messageId?: string;
}

export type FormEmbedMessageType =
  | 'form-ready'
  | 'form-submitted'
  | 'form-closed'
  | 'form-error'
  | 'form-loading'
  | 'form-loaded';

export interface FormReadyMessage extends FormEmbedMessage {
  type: 'form-ready';
  payload: {
    schemaId: string;
    mode: FormEmbedMode;
    entityId?: string;
  };
}

export interface FormSubmittedMessage extends FormEmbedMessage {
  type: 'form-submitted';
  payload: {
    success: boolean;
    data?: Record<string, any>;
    entityId?: string;
    error?: string;
  };
}

export interface FormClosedMessage extends FormEmbedMessage {
  type: 'form-closed';
  payload: {
    reason: 'user' | 'success' | 'error';
  };
}

export interface FormErrorMessage extends FormEmbedMessage {
  type: 'form-error';
  payload: {
    error: string;
    statusCode?: number;
  };
}

export interface FormLoadingMessage extends FormEmbedMessage {
  type: 'form-loading';
  payload: {
    isLoading: boolean;
  };
}

export interface FormLoadedMessage extends FormEmbedMessage {
  type: 'form-loaded';
  payload: {
    schemaId: string;
    mode: FormEmbedMode;
  };
}

/**
 * Helper function to create a typed message
 */
export function createFormEmbedMessage<T extends FormEmbedMessage>(
  type: T['type'],
  payload?: T['payload']
): T {
  return {
    type,
    payload,
    timestamp: Date.now(),
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  } as T;
}

/**
 * Type guard to check if message is from our embed system
 */
export function isFormEmbedMessage(message: any): message is FormEmbedMessage {
  return (
    message &&
    typeof message === 'object' &&
    'type' in message &&
    'timestamp' in message &&
    typeof message.type === 'string' &&
    typeof message.timestamp === 'number'
  );
}

/**
 * Validate message origin (security check)
 */
export function validateMessageOrigin(
  event: MessageEvent,
  allowedOrigins?: string[]
): boolean {
  if (!allowedOrigins || allowedOrigins.length === 0) {
    // If no allowed origins specified, allow all (for development)
    // In production, this should be configured
    return true;
  }

  const origin = event.origin;
  return allowedOrigins.some((allowed) => {
    if (allowed === '*') return true;
    if (allowed.includes('*')) {
      // Support wildcard patterns like https://*.example.com
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return origin === allowed;
  });
}

