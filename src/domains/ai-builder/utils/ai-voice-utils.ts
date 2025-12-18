/**
 * AI Voice Utilities
 * Handles voice transcription requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { getApiUrlForAgentType } from './ai-agent-url';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  getApiKey,
  sanitizeErrorMessage,
  safeJsonParse,
  validateFile,
  SECURITY_CONSTANTS,
} from './ai-security-utils';
import {
  createAbortController,
  parseErrorResponse,
  buildTimingInfo,
  validateAgentConfig,
  normalizeLanguageCode,
} from './ai-common-utils';

/**
 * Process voice transcription request
 */
export async function processVoiceRequest(
  agent: any,
  requestData: AgentRequestData
): Promise<AgentResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    // Security: Validate agent configuration
    const agentValidation = validateAgentConfig(agent);
    if (!agentValidation.valid) {
      return {
        success: false,
        error: agentValidation.error || 'Invalid agent configuration',
      };
    }

    // Security: Get API key with validation
    const apiKeyResult = getApiKey();
    if (!apiKeyResult.key) {
      return {
        success: false,
        error: apiKeyResult.error || 'LLM_API_KEY is not configured',
      };
    }
    const apiKey = apiKeyResult.key;

    // Extract file from request data
    const file = requestData.file as File | Blob | undefined;
    if (!file) {
      return {
        success: false,
        error: 'No audio file provided',
      };
    }

    // Security: Validate file using shared utility
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.error || 'Invalid file',
      };
    }

    // Get file type for logging
    const fileType = (file as File).type || '';

    // Get model and settings from agent config
    const model = agent.model || 'gpt-4o-mini-transcribe';
    const description = agent.description || 'Transcribe audio recordings to text using advanced speech recognition';
    const responseFormat = agent.responseFormat || 'verbose_json';

    // Get API URL based on agent type
    const transcribeUrl = getApiUrlForAgentType('voice-transcription');

    // Create FormData for the transcription API
    const transcriptionFormData = new FormData();
    transcriptionFormData.append('file', file);
    transcriptionFormData.append('model', model);
    transcriptionFormData.append('stream', 'false');

    // Add description as prompt if the API supports it
    if (description) {
      transcriptionFormData.append('prompt', description);
    }

    if (responseFormat) {
      transcriptionFormData.append('response_format', responseFormat);
    }

    // Security: Normalize and validate language parameter if provided
    if (requestData.language) {
      const normalizedLanguage = normalizeLanguageCode(requestData.language);
      transcriptionFormData.append('language', normalizedLanguage);
    }

    // Build request body info for logging (exclude file blob)
    const requestBodyInfo: Record<string, any> = {
      model,
      stream: 'false',
    };
    if (description) {
      requestBodyInfo.prompt = description;
    }
    if (responseFormat) {
      requestBodyInfo.response_format = responseFormat;
    }
    if (requestData.language) {
      requestBodyInfo.language = requestData.language;
    }
    requestBodyInfo.file = `[File: ${(file as File).name || 'blob'}, size: ${(file as File).size || 'unknown'} bytes, type: ${fileType}]`;

    // Log request body (without the actual file blob)
    loggingCustom(
      LogType.AI_BODY_LOG,
      'info',
      `Voice Transcription Request to ${transcribeUrl}: ${JSON.stringify(requestBodyInfo, null, 2)}`
    );

    // Track timing
    const startTime = Date.now();

    // Performance: Create AbortController with timeout (120 seconds for voice transcription)
    const { controller, timeoutId } = createAbortController(120000);

    try {
      // Call the transcription API
      const response = await fetch(transcribeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: transcriptionFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Security: Use shared error parsing utility
        const errorMessage = await parseErrorResponse(response);
        
        if (isDevelopment) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Voice transcription API error: ${errorMessage}`);
        }

        return {
          success: false,
          error: sanitizeErrorMessage(errorMessage, isDevelopment),
        };
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type') || '';
      const isStreaming = contentType.includes('text/event-stream') || contentType.includes('stream');

    if (isStreaming) {
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let transcription = '';
      let buffer = '';

      if (!reader) {
        return {
          success: false,
          error: 'No response body available',
        };
      }

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // Decode the chunk
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            // Skip empty lines and comments
            if (!line.trim() || line.startsWith(':')) continue;

            // Parse SSE format: "data: {...}"
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6); // Remove "data: " prefix

              // Handle [DONE] marker
              if (dataStr.trim() === '[DONE]') {
                continue;
              }

              try {
                const data = JSON.parse(dataStr);

                // Extract text from different possible formats
                if (data.text) {
                  transcription += data.text;
                } else if (data.transcription) {
                  transcription += data.transcription;
                } else if (data.choices?.[0]?.delta?.text) {
                  transcription += data.choices[0].delta.text;
                } else if (data.choices?.[0]?.text) {
                  transcription += data.choices[0].text;
                }
              } catch (parseError) {
                // If JSON parsing fails, try to extract text directly
                if (dataStr.trim() && !dataStr.includes('{')) {
                  transcription += dataStr;
                }
              }
            } else if (line.trim() && !line.startsWith('event:') && !line.startsWith('id:')) {
              // Handle non-SSE format streaming (plain text chunks)
              transcription += line;
            }
          }
        }

        // Decode any remaining buffer
        if (buffer) {
          buffer += decoder.decode();
          try {
            const data = JSON.parse(buffer);
            if (data.text) transcription += data.text;
            else if (data.transcription) transcription += data.transcription;
          } catch {
            transcription += buffer;
          }
        }

        const finalTranscription = transcription.trim();
        
        // Performance: Use shared timing utility
        const timing = buildTimingInfo(startTime);
        
        return {
          success: true,
          data: {
            transcription: finalTranscription,
            timing,
          },
        };
      } catch (streamError) {
        const errorMsg = streamError instanceof Error ? streamError.message : 'Failed to process stream';
        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        reader.releaseLock();
      }
    } else {
      // Handle non-streaming response
      // Security: Use safe JSON parsing
      const responseText = await response.text();
      const parseResult = safeJsonParse(responseText);
      
      if (!parseResult.success || !parseResult.data) {
        return {
          success: false,
          error: parseResult.error || 'Invalid response format from transcription service',
        };
      }

      const result = parseResult.data;

      // Check if we got verbose_json format (has task, language, duration fields)
      const isVerboseJson = result.task !== undefined && result.language !== undefined && result.duration !== undefined;

      // Extract text from response
      const transcription = result.text || result.transcription || JSON.stringify(result);

      // Performance: Use shared timing utility
      const timing = buildTimingInfo(startTime);

      // Return response with metadata if verbose_json format was received
      return {
        success: true,
        data: {
          transcription,
          // Include usage and cost information if available
          ...(result.usage && { usage: result.usage }),
          ...(result.estimated_cost && { estimated_cost: result.estimated_cost }),
          // Include additional metadata if verbose_json format was received
          ...(isVerboseJson && {
            metadata: {
              task: result.task,
              language: result.language,
              duration: result.duration,
              segments: result.segments,
              words: result.words,
            },
          }),
          timing,
        },
      };
    }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        if (isDevelopment) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Request timeout in voice transcription API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        }
        return {
          success: false,
          error: sanitizeErrorMessage('Request timeout', isDevelopment),
        };
      }

      throw fetchError;
    }
  } catch (error) {
    if (isDevelopment) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error in voice transcription request: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      success: false,
      error: sanitizeErrorMessage(error, isDevelopment),
    };
  }
}

