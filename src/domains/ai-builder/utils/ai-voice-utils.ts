/**
 * AI Voice Utilities
 * Handles voice transcription requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { getApiUrlForAgentType } from './ai-agent-url';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB limit to avoid abuse
const ALLOWED_MIME_PREFIXES = ['audio/', 'video/']; // whisper-like endpoints often accept audio/video containers

/**
 * Process voice transcription request
 */
export async function processVoiceRequest(
  agent: any,
  requestData: AgentRequestData
): Promise<AgentResponse> {
  try {
    // Get API key from environment
    const apiKey = process.env.LLM_API_KEY || process.env.AVALAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'LLM_API_KEY is not configured',
      };
    }

    // Extract file from request data
    const file = requestData.file as File | Blob | undefined;
    if (!file) {
      return {
        success: false,
        error: 'No audio file provided',
      };
    }

    // Validate file size
    if (typeof (file as File).size === 'number' && (file as File).size > MAX_UPLOAD_BYTES) {
      return {
        success: false,
        error: `File too large. Max allowed is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`,
      };
    }

    // Validate file type
    const fileType = (file as File).type || '';
    if (fileType && !ALLOWED_MIME_PREFIXES.some((prefix) => fileType.startsWith(prefix))) {
      return {
        success: false,
        error: 'Unsupported file type. Please upload an audio file.',
      };
    }

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

    // Add language parameter if provided
    if (requestData.language) {
      transcriptionFormData.append('language', requestData.language);
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
      LogType.REQUEST_BODY,
      'info',
      `Voice Transcription Request to ${transcribeUrl}: ${JSON.stringify(requestBodyInfo, null, 2)}`
    );

    // Track timing
    const startTime = Date.now();

    // Call the transcription API
    const response = await fetch(transcribeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: transcriptionFormData,
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      let errorMessage = 'Transcription failed';
      try {
        const errorData = await response.json();
        // Extract error message from API response
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData?.error) {
          errorMessage =
            typeof errorData.error === 'string'
              ? errorData.error
              : JSON.stringify(errorData.error);
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } catch {
        // If JSON parsing fails, try to get text
        const errorText = await response.text();
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
      }
      return {
        success: false,
        error: errorMessage,
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
        return {
          success: true,
          data: {
            transcription: finalTranscription,
            timing: {
              responseTime,
              duration: responseTime,
            },
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
      const result = await response.json();

      // Check if we got verbose_json format (has task, language, duration fields)
      const isVerboseJson = result.task !== undefined && result.language !== undefined && result.duration !== undefined;

      // Extract text from response
      const transcription = result.text || result.transcription || JSON.stringify(result);

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
          timing: {
            responseTime,
            duration: responseTime,
          },
        },
      };
    }
  } catch (error) {
    console.error('Error in voice transcription request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

