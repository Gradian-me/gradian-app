/**
 * AI General Utilities
 * Shared utilities and prompts used across all AI agent types
 */

import { getCurrentDateTime } from '@/gradian-ui/shared/utils/date-utils';

/**
 * General System Prompt
 * This prompt is automatically prepended to ALL agent types (chat, graph, image, video, orchestrator, etc.)
 * Provides current date/time context for time-related analytics
 * Returns a function so the date/time is always current when called
 * 
 * @returns General system prompt string with current date/time
 */
export function getGeneralSystemPrompt(): string {
  return `**Current Date Time**: ${getCurrentDateTime()}

You can use this current date/time for any time-related analytics, date calculations, or temporal references without needing to call external date services.

---

`;
}

