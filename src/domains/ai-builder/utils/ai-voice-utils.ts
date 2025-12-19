/**
 * AI Voice Utilities
 * Handles voice transcription requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  sanitizeErrorMessage,
  validateFile,
  SECURITY_CONSTANTS,
} from './ai-security-utils';
import {
  buildTimingInfo,
  validateAgentConfig,
  normalizeLanguageCode,
} from './ai-common-utils';
import { callVoiceApi } from './ai-api-caller';

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

    // Get model and settings from agent config
    const model = agent.model || 'gpt-4o-mini-transcribe';

    // Security: Normalize and validate language parameter if provided
    const normalizedLanguage = requestData.language
      ? normalizeLanguageCode(requestData.language)
      : undefined;

    // Track timing
    const startTime = Date.now();

    // Call voice API using centralized utility
    const apiResult = await callVoiceApi({
      agent,
      file: file as File,
      language: normalizedLanguage,
      model,
    });

    if (!apiResult.success) {
      return {
        success: false,
        error: apiResult.error || 'Voice transcription failed',
      };
    }

    const result = apiResult.data;

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

