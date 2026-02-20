/**
 * AI Builder Common Utilities
 * Shared functions used across multiple AI agent types
 * Client-safe: no Node.js modules (fs, path) - safe to import from client components
 */

/**
 * Whether this agent should use streaming responses.
 * Chat agents with requiredOutputFormat "string" stream by default unless stream: false.
 */
export function isStreamingAgent(agent: {
  agentType?: string;
  requiredOutputFormat?: string;
  stream?: boolean;
} | null | undefined): boolean {
  if (!agent) return false;
  const isChat = agent.agentType === 'chat' || !agent.agentType;
  const isString = agent.requiredOutputFormat === 'string';
  if (!isChat || !isString) return false;
  return agent.stream !== false;
}

/**
 * Format field name from camelCase to Title Case
 * DRY: Single implementation used across multiple files
 */
export function formatFieldName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // If it already looks like a formatted label (has spaces or capitals), use it as is
  if (name.includes(' ') || (name[0] && name[0] === name[0].toUpperCase())) {
    return name;
  }

  // Convert camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Create AbortController with timeout
 * DRY: Centralized timeout handling
 */
export function createAbortController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Parse error response from API
 * DRY: Centralized error parsing
 * Handles JSON errors, HTML error pages (e.g., Cloudflare), and plain text errors
 */
export async function parseErrorResponse(response: Response): Promise<string> {
  const status = response.status;
  const statusText = response.statusText || 'Unknown error';
  
  // Provide user-friendly messages for common HTTP errors
  const httpErrorMessages: Record<number, string> = {
    502: 'Bad Gateway - The AI service is temporarily unavailable. Please try again in a few minutes.',
    503: 'Service Unavailable - The AI service is currently overloaded. Please try again later.',
    504: 'Gateway Timeout - The AI service took too long to respond. Please try again or simplify your request.',
    500: 'Internal Server Error - The AI service encountered an error. Please try again.',
    429: 'Too Many Requests - Rate limit exceeded. Please wait before trying again.',
  };

  // If we have a predefined message for this status, use it
  if (httpErrorMessages[status]) {
    return httpErrorMessages[status];
  }

  let errorMessage = `Request failed: ${statusText} (${status})`;
  
  try {
    const errorText = await response.text();
    
    // Check if response is HTML (common for Cloudflare/gateway errors)
    if (errorText.trim().startsWith('<!DOCTYPE') || errorText.trim().startsWith('<html')) {
      // Try to extract meaningful error from HTML
      const titleMatch = errorText.match(/<title[^>]*>([^<]+)<\/title>/i);
      const h1Match = errorText.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const errorCodeMatch = errorText.match(/(\d{3}):\s*([^<\n]+)/i);
      
      if (errorCodeMatch) {
        // Extract error code and message (e.g., "502: Bad gateway")
        const [, code, message] = errorCodeMatch;
        errorMessage = `${code}: ${message.trim()}`;
      } else if (titleMatch) {
        const title = titleMatch[1];
        const codeMatch = title.match(/(\d{3}):\s*([^|]+)/i);
        if (codeMatch) {
          errorMessage = `${codeMatch[1]}: ${codeMatch[2].trim()}`;
        } else {
          errorMessage = title;
        }
      } else if (h1Match) {
        // Extract from h1 tag
        errorMessage = h1Match[1].trim();
      } else {
        // Fallback: use HTTP status message
        errorMessage = httpErrorMessages[status] || `HTTP ${status}: ${statusText}`;
      }
      
      return errorMessage;
    }
    
    // Try to parse as JSON
    try {
      const errorData = JSON.parse(errorText);
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData?.error === 'string') {
        errorMessage = errorData.error;
      }
    } catch {
      // If not JSON and not HTML, check if it's a reasonable text error
      if (errorText && errorText.length < 500) {
        // Use text if it's short (likely a meaningful error message)
        errorMessage = errorText.trim();
      } else if (errorText.length >= 500) {
        // For long text, use HTTP status message
        errorMessage = httpErrorMessages[status] || `HTTP ${status}: ${statusText}`;
      }
    }
  } catch {
    // If we can't read the response, use status-based message or status text
    errorMessage = httpErrorMessages[status] || statusText || 'Unknown error';
  }

  return errorMessage;
}

/**
 * Build request timing information
 * DRY: Centralized timing calculation
 */
export function buildTimingInfo(startTime: number): {
  responseTime: number;
  duration: number;
} {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Response time is typically the same as duration for non-streaming requests
  // For streaming, this would be calculated differently
  return {
    responseTime: duration,
    duration,
  };
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(agent: any): { valid: boolean; error?: string } {
  if (!agent || typeof agent !== 'object') {
    return { valid: false, error: 'Agent configuration is required' };
  }

  if (!agent.id || typeof agent.id !== 'string') {
    return { valid: false, error: 'Agent ID is required' };
  }

  if (!agent.agentType || !['chat', 'voice-transcription', 'image-generation', 'video-generation', 'graph-generation', 'orchestrator', 'search'].includes(agent.agentType)) {
    return { valid: false, error: 'Invalid agent type' };
  }

  if (agent.agentType === 'chat' && !agent.model) {
    return { valid: false, error: 'Model is required for chat agents' };
  }

  return { valid: true };
}

/**
 * Normalize language code
 */
export function normalizeLanguageCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return 'en';
  }

  // Convert to lowercase and take first 2 characters
  return code.toLowerCase().substring(0, 2);
}

