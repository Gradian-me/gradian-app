/**
 * AI Builder Common Utilities
 * Shared functions used across multiple AI agent types
 */

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
 */
export async function parseErrorResponse(response: Response): Promise<string> {
  let errorMessage = `Request failed: ${response.statusText}`;
  
  try {
    const errorText = await response.text();
    
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
      // If not JSON, use text as error message
      if (errorText) {
        errorMessage = errorText;
      }
    }
  } catch {
    // If we can't read the response, use status text
    errorMessage = response.statusText || 'Unknown error';
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

  if (!agent.agentType || !['chat', 'voice-transcription', 'image-generation'].includes(agent.agentType)) {
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

