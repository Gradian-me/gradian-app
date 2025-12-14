/**
 * AI Builder Security Utilities
 * Centralized security functions for input validation, sanitization, and SSRF protection
 */

// Security constants
const MAX_PROMPT_LENGTH = 100000; // 100KB max prompt length
const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB max JSON size
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB max file size
const ALLOWED_MIME_PREFIXES = ['audio/', 'video/'];
const VALID_IMAGE_SIZES = ['1024x1024', '1024x1792', '1792x1024'] as const;
const VALID_OUTPUT_FORMATS = ['url', 'png'] as const;

/**
 * Sanitize user prompt to prevent injection attacks
 */
export function sanitizePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    return '';
  }

  // Limit length
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return prompt.substring(0, MAX_PROMPT_LENGTH);
  }

  // Remove null bytes and control characters (except newlines and tabs)
  return prompt
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars except \n, \t
}

/**
 * Validate and sanitize agent ID
 */
export function validateAgentId(agentId: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!agentId || typeof agentId !== 'string') {
    return { valid: false, error: 'Agent ID is required' };
  }

  // Sanitize: only allow alphanumeric, hyphens, underscores
  const sanitized = agentId.replace(/[^a-zA-Z0-9_-]/g, '');
  
  if (sanitized.length === 0 || sanitized.length > 100) {
    return { valid: false, error: 'Invalid agent ID format' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate URL to prevent SSRF attacks
 * Only allows same-origin relative paths or validated external URLs
 */
export function validateUrl(url: string, allowedOrigins?: string[]): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Allow relative paths (same-origin)
  if (url.startsWith('/')) {
    // Validate relative path doesn't contain dangerous patterns
    if (url.includes('..') || url.includes('//')) {
      return { valid: false, error: 'Invalid relative path' };
    }
    return { valid: true };
  }

  // For absolute URLs, validate origin
  try {
    const parsed = new URL(url);
    
    // Block dangerous protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // If allowedOrigins provided, check against them
    if (allowedOrigins && allowedOrigins.length > 0) {
      const isAllowed = allowedOrigins.some(origin => {
        try {
          const allowedUrl = new URL(origin);
          return parsed.origin === allowedUrl.origin;
        } catch {
          return false;
        }
      });
      
      if (!isAllowed) {
        return { valid: false, error: 'URL origin not in allowed list' };
      }
    }

    // Block localhost and private IP ranges (SSRF protection)
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.startsWith('169.254.') // Link-local
    ) {
      return { valid: false, error: 'Local and private network addresses are not allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate file for upload
 */
export function validateFile(file: File | Blob): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }

  // Check file size
  if (file instanceof File && file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum allowed size is ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB`,
    };
  }

  // Check MIME type for voice files
  if (file instanceof File && file.type) {
    const isValidMime = ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix));
    if (!isValidMime) {
      return { valid: false, error: 'Unsupported file type. Please upload an audio or video file.' };
    }
  }

  return { valid: true };
}

/**
 * Validate image size parameter
 */
export function validateImageSize(size: string): { valid: boolean; error?: string } {
  if (!size || typeof size !== 'string') {
    return { valid: false, error: 'Size is required' };
  }

  if (!VALID_IMAGE_SIZES.includes(size as any)) {
    return {
      valid: false,
      error: `Invalid size. Must be one of: ${VALID_IMAGE_SIZES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate output format parameter
 */
export function validateOutputFormat(format: string): { valid: boolean; error?: string } {
  if (!format || typeof format !== 'string') {
    return { valid: false, error: 'Output format is required' };
  }

  if (!VALID_OUTPUT_FORMATS.includes(format as any)) {
    return {
      valid: false,
      error: `Output format must be either "url" or "png". Received: ${format}`,
    };
  }

  return { valid: true };
}

/**
 * Safely parse JSON with size limits
 */
export function safeJsonParse<T = any>(jsonString: string, maxSize: number = MAX_JSON_SIZE): {
  success: boolean;
  data?: T;
  error?: string;
} {
  if (!jsonString || typeof jsonString !== 'string') {
    return { success: false, error: 'Invalid JSON string' };
  }

  // Check size before parsing
  const sizeInBytes = new Blob([jsonString]).size;
  if (sizeInBytes > maxSize) {
    return {
      success: false,
      error: `JSON size exceeds maximum allowed size of ${Math.floor(maxSize / (1024 * 1024))}MB`,
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON format',
    };
  }
}

/**
 * Sanitize error message to prevent information disclosure
 */
export function sanitizeErrorMessage(error: unknown, isDevelopment: boolean = false): string {
  if (isDevelopment) {
    // In development, show more details
    return error instanceof Error ? error.message : String(error);
  }

  // In production, return generic messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Map specific errors to generic messages
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('timeout')) {
      return 'Request timeout. The service took too long to respond. Please try again.';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Authentication failed. Please check your credentials.';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied. You do not have permission to perform this action.';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'Resource not found.';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'Rate limit exceeded. Please try again later.';
    }
    if (message.includes('server error') || message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    
    // Generic fallback
    return 'An error occurred. Please try again.';
  }

  return 'An unknown error occurred.';
}

/**
 * Get API key from environment with validation
 */
export function getApiKey(): { key: string | null; error?: string } {
  const apiKey = process.env.LLM_API_KEY || process.env.AVALAI_API_KEY;
  
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return { key: null, error: 'LLM_API_KEY is not configured' };
  }

  // Basic validation: API keys should not be too short
  if (apiKey.length < 10) {
    return { key: null, error: 'Invalid API key format' };
  }

  return { key: apiKey };
}

// Export constants for use in other modules
export const SECURITY_CONSTANTS = {
  MAX_PROMPT_LENGTH,
  MAX_JSON_SIZE,
  MAX_FILE_SIZE,
  ALLOWED_MIME_PREFIXES,
  VALID_IMAGE_SIZES,
  VALID_OUTPUT_FORMATS,
} as const;

