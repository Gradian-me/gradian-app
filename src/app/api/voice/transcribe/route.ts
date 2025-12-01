import { NextRequest, NextResponse } from 'next/server';
import { loadApplicationVariables } from '@/gradian-ui/shared/utils/application-variables-loader';
import fs from 'fs';
import path from 'path';

/**
 * Load AI agents from JSON file
 */
function loadAiAgents(): any[] {
  const dataPath = path.join(process.cwd(), 'data', 'ai-agents.json');
  
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  
  const fileContents = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(fileContents);
}

/**
 * POST - Transcribe audio file
 * Body: FormData with audio file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.LLM_API_KEY || process.env.AVALAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Load voice-transcription agent configuration
    const agents = loadAiAgents();
    const voiceTranscriptionAgent = agents.find((agent: any) => agent.id === 'voice-transcription');
    
    // Use model from agent config or fallback to default
    const model = voiceTranscriptionAgent?.model || 'gpt-4o-mini-transcribe';
    const description = voiceTranscriptionAgent?.description || 'Transcribe audio recordings to text using advanced speech recognition';
    const response_format = voiceTranscriptionAgent?.response_format || 'verbose_json';
    // Get transcription URL from application variables
    const vars = await loadApplicationVariables();
    const transcribeUrl = vars.AI_CONFIG?.LLM_TRANSCRIBE_URL || 'https://api.avalai.ir/v1/audio/transcriptions';

    // Create FormData for the transcription API
    const transcriptionFormData = new FormData();
    transcriptionFormData.append('file', file);
    transcriptionFormData.append('model', model);
    transcriptionFormData.append('stream', 'false');
    
    // Add description as prompt if the API supports it
    if (description) {
      transcriptionFormData.append('prompt', description);
    }

    if (response_format) {
      transcriptionFormData.append('response_format', response_format);
      console.log('Setting response_format to:', response_format);
    }
    
    // Add language parameter if provided
    if (language) {
      transcriptionFormData.append('language', language);
    }

    // Call the transcription API
    const response = await fetch(transcribeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: transcriptionFormData,
    });

    if (!response.ok) {
      let errorMessage = 'Transcription failed';
      try {
        const errorData = await response.json();
        // Extract error message from API response
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData?.error) {
          errorMessage = typeof errorData.error === 'string' 
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
      console.error('Transcription API error:', errorMessage);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      );
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
        return NextResponse.json(
          { success: false, error: 'No response body available' },
          { status: 500 }
        );
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

        return NextResponse.json({
          success: true,
          transcription: transcription.trim(),
        });
      } catch (streamError) {
        console.error('Stream processing error:', streamError);
        return NextResponse.json(
          { 
            success: false, 
            error: streamError instanceof Error ? streamError.message : 'Failed to process stream' 
          },
          { status: 500 }
        );
      } finally {
        reader.releaseLock();
      }
    } else {
      // Handle non-streaming response
      const result = await response.json();
      
      // Log the response structure for debugging
      console.log('Requested response_format:', response_format);
      console.log('Response structure:', {
        hasText: !!result.text,
        hasTask: !!result.task,
        hasLanguage: !!result.language,
        hasDuration: !!result.duration,
        hasSegments: !!result.segments,
        keys: Object.keys(result)
      });
      
      // Check if we got verbose_json format (has task, language, duration fields)
      const isVerboseJson = result.task !== undefined && result.language !== undefined && result.duration !== undefined;
      
      if (response_format === 'verbose_json' && !isVerboseJson) {
        console.warn('Requested verbose_json but received standard json format. API may not support verbose_json.');
      }
      
      // Extract text from response
      // For verbose_json: { task, language, duration, text, segments?, words? }
      // For json: { text: "..." }
      const transcription = result.text || result.transcription || JSON.stringify(result);

      // Return response with metadata if verbose_json format was received
      return NextResponse.json({
        success: true,
        transcription,
        // Include additional metadata if verbose_json format was received
        ...(isVerboseJson && {
          metadata: {
            task: result.task,
            language: result.language,
            duration: result.duration,
            segments: result.segments,
            words: result.words,
          }
        })
      });
    }
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

