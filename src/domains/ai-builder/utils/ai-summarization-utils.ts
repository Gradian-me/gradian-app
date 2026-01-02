/**
 * AI Summarization Utilities
 * Handles prompt summarization using the professional-writing agent
 */

import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Fetch organization RAG data non-blocking
 * Returns the data if available within timeout, otherwise returns empty string
 * @param timeout - Maximum time to wait in milliseconds (default: 2000ms)
 * @returns Organization RAG data in TOON format, or empty string if timeout
 */
async function fetchOrganizationRagNonBlocking(timeout: number = 2000): Promise<string> {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/organization-rag?format=toon`;

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeout);
    });

    // Create the fetch promise
    const fetchPromise = fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content-type to handle both JSON and text/plain (for TOON format)
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/plain')) {
        // Handle TOON format (text/plain)
        const text = await response.text();
        return text.trim();
      } else {
        // Handle JSON format
        const data = await response.json();
        // Extract data if wrapped in response object
        const extractedData = data.data || data;
        // Convert to string representation if needed
        return typeof extractedData === 'string' ? extractedData : JSON.stringify(extractedData);
      }
    });

    // Race between fetch and timeout - if timeout wins, return empty string
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    return result || '';
  } catch (error) {
    // On any error (including timeout), return empty string (non-blocking)
    if (isDevelopment) {
      loggingCustom(LogType.CLIENT_LOG, 'info', `Organization RAG fetch skipped: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return '';
  }
}

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

