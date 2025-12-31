/**
 * AI Summarization Utilities
 * Handles prompt summarization using the professional-writing agent
 */

import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Summarize a prompt using the professional-writing agent with summarizer style
 * @param prompt - The original prompt text to summarize
 * @param signal - Optional AbortSignal for cancellation
 * @param timeout - Timeout in milliseconds (default: 60000)
 * @returns Summarized prompt, or original prompt if summarization fails
 */
export async function summarizePrompt(
  prompt: string,
  signal?: AbortSignal,
  timeout: number = 60000
): Promise<string> {
  if (!prompt || !prompt.trim()) {
    return prompt;
  }

  try {
    if (isDevelopment) {
      loggingCustom(LogType.AI_BODY_LOG, 'info', `Starting prompt summarization for prompt: ${prompt.substring(0, 100)}...`);
    }

    // Build user prompt for summarizer style
    // According to the professional-writing agent config, summarizer should:
    // "Deeply analyze the text to understand meaning, context, relationships, and key details.
    // Synthesize and completely rephrase all content into one or two flowing narrative paragraphs
    // that capture the essence, main ideas, and critical information."
    const userPrompt = `Please deeply analyze the following text to understand its meaning, context, relationships, and key details. Synthesize and completely rephrase all content into one or two flowing narrative paragraphs that capture the essence, main ideas, and critical information. Output MUST be plain text only - NO headings, sections, bullet points, markdown, or structured formatting. Create continuous, natural-flowing prose that reads as if written from scratch based on comprehensive understanding, not a condensed or reorganized version of the original:\n\n${prompt.trim()}`;

    // Create abort controller with timeout if signal not provided
    let abortController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let finalSignal = signal;

    if (!signal) {
      abortController = new AbortController();
      finalSignal = abortController.signal;
      timeoutId = setTimeout(() => {
        abortController?.abort();
      }, timeout);
    }

    try {
      // Call professional-writing agent API
      const response = await fetch('/api/ai-builder/professional-writing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt,
          body: {
            writingStyle: 'summarizer',
          },
        }),
        signal: finalSignal,
      });

      // Clear timeout if request completed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = null;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If not JSON, use the text as error message
        }
        const errorMessage = errorData?.error || errorText || `HTTP ${response.status}: ${response.statusText}`;
        
        if (isDevelopment) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `Summarization failed: ${errorMessage}`);
        }
        
        // Fallback to original prompt on error
        return prompt;
      }

      const data = await response.json();

      if (data.success && data.data?.response) {
        const summarizedText = data.data.response.trim();
        
        if (isDevelopment) {
          loggingCustom(LogType.AI_BODY_LOG, 'info', `Summarization successful. Original length: ${prompt.length}, Summarized length: ${summarizedText.length}`);
        }
        
        // Return summarized text if it's not empty
        if (summarizedText) {
          return summarizedText;
        }
      }

      // If no valid response, fallback to original
      if (isDevelopment) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', 'Summarization returned empty or invalid response, using original prompt');
      }
      return prompt;
    } catch (fetchError) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Handle abort errors gracefully
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        if (isDevelopment) {
          loggingCustom(LogType.CLIENT_LOG, 'info', 'Summarization was aborted');
        }
        return prompt;
      }

      // Handle other fetch errors
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error during summarization';
      if (isDevelopment) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Summarization fetch error: ${errorMessage}`);
      }
      return prompt;
    }
  } catch (error) {
    // Handle any other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during summarization';
    if (isDevelopment) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Summarization error: ${errorMessage}`);
    }
    // Always fallback to original prompt on any error
    return prompt;
  }
}

