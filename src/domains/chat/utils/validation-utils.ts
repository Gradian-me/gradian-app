/**
 * Chat Validation Utilities
 * Provides input validation and sanitization for chat operations
 */

/**
 * Maximum message content length (10,000 characters)
 */
export const MAX_MESSAGE_LENGTH = 20000;

/**
 * Maximum chat title length (200 characters)
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * Maximum request body size (1MB)
 */
export const MAX_REQUEST_BODY_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Allowed agent types
 */
export const ALLOWED_AGENT_TYPES = [
  'chat',
  'orchestrator',
  'image-generation',
  'voice-transcription',
  'video-generation',
  'search'
] as const;

/**
 * Allowed message roles
 */
export const ALLOWED_ROLES = ['user', 'assistant', 'system'] as const;

/**
 * Validate message content
 */
export function validateMessageContent(content: string): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Content is required and must be a string' };
  }

  if (content.trim().length === 0) {
    return { valid: false, error: 'Content cannot be empty' };
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate chat title
 */
export function validateChatTitle(title: string | undefined): { valid: boolean; error?: string } {
  if (title === undefined || title === null) {
    return { valid: true }; // Title is optional
  }

  if (typeof title !== 'string') {
    return { valid: false, error: 'Title must be a string' };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: `Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate agent type
 */
export function validateAgentType(agentType: string | undefined): { valid: boolean; error?: string } {
  if (agentType === undefined || agentType === null) {
    return { valid: true }; // Agent type is optional
  }

  if (typeof agentType !== 'string') {
    return { valid: false, error: 'Agent type must be a string' };
  }

  if (!ALLOWED_AGENT_TYPES.includes(agentType as any)) {
    return {
      valid: false,
      error: `Invalid agent type. Allowed types: ${ALLOWED_AGENT_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate message role
 */
export function validateMessageRole(role: string): { valid: boolean; error?: string } {
  if (!role || typeof role !== 'string') {
    return { valid: false, error: 'Role is required and must be a string' };
  }

  if (!ALLOWED_ROLES.includes(role as any)) {
    return {
      valid: false,
      error: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate chat ID format (ULID)
 */
export function validateChatId(chatId: string): { valid: boolean; error?: string } {
  if (!chatId || typeof chatId !== 'string') {
    return { valid: false, error: 'Chat ID is required and must be a string' };
  }

  // ULID format: 26 characters, alphanumeric
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(chatId)) {
    return { valid: false, error: 'Invalid chat ID format' };
  }

  return { valid: true };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate request body size
 */
export function validateRequestBodySize(bodySize: number): { valid: boolean; error?: string } {
  if (bodySize > MAX_REQUEST_BODY_SIZE) {
    return {
      valid: false,
      error: `Request body exceeds maximum size of ${MAX_REQUEST_BODY_SIZE} bytes`,
    };
  }

  return { valid: true };
}

