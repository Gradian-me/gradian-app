import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  setEncryptedSessionStorage,
  getEncryptedSessionStorage,
  removeEncryptedSessionStorage,
  onEncryptedSessionStorageChange,
  notifyEncryptedSessionStorageChange,
} from '@/gradian-ui/shared/utils/session-storage-encrypted';
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

const STORAGE_KEY = 'ai-response-store';
const MAX_RESPONSES_PER_AGENT = 5; // Keep only the last 5 responses per agent/format
const MAX_CONTENT_LENGTH = 500000; // ~500KB - skip storing very large content (like base64 images)

interface AiResponse {
  id: string; // datetime-based ID
  agentId: string;
  format: 'string' | 'json' | 'table';
  content: string;
  timestamp: string;
  tokenUsage?: any;
  duration?: number;
}

interface AiResponseState {
  responses: Record<string, AiResponse>; // key: agentId-format-datetime
  latestResponses: Record<string, string>; // key: agentId-format, value: datetime
  
  // Actions
  saveResponse: (agentId: string, format: 'string' | 'json' | 'table', content: string, tokenUsage?: any, duration?: number) => Promise<string>;
  getResponse: (agentId: string, format: 'string' | 'json' | 'table', datetime?: string) => AiResponse | null;
  getLatestResponse: (agentId: string, format: 'string' | 'json' | 'table') => AiResponse | null;
  updateResponse: (key: string, content: string) => Promise<void>;
  clearResponse: (agentId: string, format: 'string' | 'json' | 'table', datetime?: string) => Promise<void>;
  clearAllResponses: () => Promise<void>;
}

const generateStorageKey = (agentId: string, format: string, datetime: string): string => {
  return `ai-response-${agentId}-${format}-${datetime}`;
};

const generateLatestKey = (agentId: string, format: string): string => {
  return `ai-response-${agentId}-${format}-latest`;
};

export const useAiResponseStore = create<AiResponseState>()(
  devtools(
    (set, get) => ({
      responses: {},
      latestResponses: {},

      saveResponse: async (agentId, format, content, tokenUsage, duration) => {
        // Skip storing very large content (like base64 images) to prevent quota issues
        if (content.length > MAX_CONTENT_LENGTH) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Content too large (${content.length} bytes), skipping storage to prevent quota issues`);
          // Clear the latest response entry for this agent/format to prevent showing stale cached data
          const latestKey = generateLatestKey(agentId, format);
          const state = get();
          const newLatestResponses = { ...state.latestResponses };
          delete newLatestResponses[latestKey];
          set({ latestResponses: newLatestResponses }, false, 'clearLatestForLargeContent');
          
          // Persist the cleared state
          try {
            const currentState = get();
            await setEncryptedSessionStorage(STORAGE_KEY, {
              responses: currentState.responses,
              latestResponses: currentState.latestResponses,
            });
            notifyEncryptedSessionStorageChange(STORAGE_KEY, {
              responses: currentState.responses,
              latestResponses: currentState.latestResponses,
            });
          } catch (error: any) {
            // Silently fail if storage is full - we're already skipping storage
            loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Failed to persist cleared latest response: ${error instanceof Error ? error.message : String(error)}`);
          }
          
          // Don't update latestResponses when content is too large - return null to indicate no storage
          return null;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const key = generateStorageKey(agentId, format, timestamp);
        const latestKey = generateLatestKey(agentId, format);

        const response: AiResponse = {
          id: timestamp,
          agentId,
          format,
          content,
          timestamp,
          tokenUsage,
          duration,
        };

        // Clean up old responses for this agent/format before adding new one
        const state = get();
        const responsesForAgent = Object.entries(state.responses)
          .filter(([k]) => k.startsWith(`ai-response-${agentId}-${format}-`))
          .sort(([, a], [, b]) => {
            // Sort by timestamp descending (newest first)
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });

        // Remove oldest responses if we exceed the limit
        const responsesToKeep = responsesForAgent.slice(0, MAX_RESPONSES_PER_AGENT - 1);
        const responsesToRemove = responsesForAgent.slice(MAX_RESPONSES_PER_AGENT - 1);

        const newResponses = { ...state.responses };
        responsesToRemove.forEach(([k]) => {
          delete newResponses[k];
        });

        // Add new response
        newResponses[key] = response;

        set(
          {
            responses: newResponses,
            latestResponses: {
              ...state.latestResponses,
              [latestKey]: timestamp,
            },
          },
          false,
          'saveResponse'
        );

        // Persist to encrypted sessionStorage with retry on quota error
        try {
          const currentState = get();
          await setEncryptedSessionStorage(STORAGE_KEY, {
            responses: currentState.responses,
            latestResponses: currentState.latestResponses,
          });
          notifyEncryptedSessionStorageChange(STORAGE_KEY, {
            responses: currentState.responses,
            latestResponses: currentState.latestResponses,
          });
        } catch (error: any) {
          // Handle quota exceeded error by cleaning up more aggressively
          if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
            loggingCustom(LogType.CLIENT_LOG, 'warn', '[ai-response-store] Storage quota exceeded, cleaning up old responses...');
            
            // Clean up all but the latest response for each agent/format
            const cleanupState = get();
            const cleanedResponses: Record<string, AiResponse> = {};
            const cleanedLatestResponses: Record<string, string> = { ...cleanupState.latestResponses };

            // Group responses by agent/format and keep only the latest
            Object.entries(cleanupState.responses).forEach(([k, v]) => {
              const latestKeyForAgent = generateLatestKey(v.agentId, v.format);
              const latestTimestamp = cleanupState.latestResponses[latestKeyForAgent];
              
              // Only keep the latest response for each agent/format
              if (v.timestamp === latestTimestamp) {
                cleanedResponses[k] = v;
              }
            });

            // Add the new response
            cleanedResponses[key] = response;
            cleanedLatestResponses[latestKey] = timestamp;

            set(
              {
                responses: cleanedResponses,
                latestResponses: cleanedLatestResponses,
              },
              false,
              'saveResponse-cleanup'
            );

            // Retry saving after cleanup
            try {
              const retryState = get();
              await setEncryptedSessionStorage(STORAGE_KEY, {
                responses: retryState.responses,
                latestResponses: retryState.latestResponses,
              });
              notifyEncryptedSessionStorageChange(STORAGE_KEY, {
                responses: retryState.responses,
                latestResponses: retryState.latestResponses,
              });
            } catch (retryError) {
              loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Failed to persist after cleanup: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
            }
          } else {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Failed to persist to encrypted storage: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        return timestamp;
      },

        getResponse: (agentId, format, datetime) => {
          const state = get();
          if (datetime) {
            const key = generateStorageKey(agentId, format, datetime);
            return state.responses[key] || null;
          }
          // If no datetime, get latest
          return get().getLatestResponse(agentId, format);
        },

        getLatestResponse: (agentId, format) => {
          const state = get();
          const latestKey = generateLatestKey(agentId, format);
          const latestDatetime = state.latestResponses[latestKey];
          
          if (!latestDatetime) {
            return null;
          }

          const key = generateStorageKey(agentId, format, latestDatetime);
          return state.responses[key] || null;
        },

        updateResponse: async (key, content) => {
          // Skip storing very large content updates
          if (content.length > MAX_CONTENT_LENGTH) {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Content update too large (${content.length} bytes), skipping storage`);
            return;
          }

          set(
            (state) => {
              const response = state.responses[key];
              if (!response) return state;

              return {
                responses: {
                  ...state.responses,
                  [key]: {
                    ...response,
                    content,
                  },
                },
              };
            },
            false,
            'updateResponse'
          );

          // Persist to encrypted sessionStorage with quota error handling
          try {
            const state = get();
            await setEncryptedSessionStorage(STORAGE_KEY, {
              responses: state.responses,
              latestResponses: state.latestResponses,
            });
            notifyEncryptedSessionStorageChange(STORAGE_KEY, {
              responses: state.responses,
              latestResponses: state.latestResponses,
            });
          } catch (error: any) {
            if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
              loggingCustom(LogType.CLIENT_LOG, 'warn', '[ai-response-store] Storage quota exceeded during update, skipping update persistence');
            } else {
              loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Failed to persist update to encrypted storage: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        },

        clearResponse: async (agentId, format, datetime) => {
          set(
            (state) => {
              const newResponses = { ...state.responses };
              const newLatestResponses = { ...state.latestResponses };

              if (datetime) {
                const key = generateStorageKey(agentId, format, datetime);
                delete newResponses[key];
              } else {
                // Clear all responses for this agent/format
                const latestKey = generateLatestKey(agentId, format);
                const latestDatetime = state.latestResponses[latestKey];
                
                if (latestDatetime) {
                  const key = generateStorageKey(agentId, format, latestDatetime);
                  delete newResponses[key];
                  delete newLatestResponses[latestKey];
                }
              }

              return {
                responses: newResponses,
                latestResponses: newLatestResponses,
              };
            },
            false,
            'clearResponse'
          );

          // Persist to encrypted sessionStorage
          try {
            const state = get();
            await setEncryptedSessionStorage(STORAGE_KEY, {
              responses: state.responses,
              latestResponses: state.latestResponses,
            });
            notifyEncryptedSessionStorageChange(STORAGE_KEY, {
              responses: state.responses,
              latestResponses: state.latestResponses,
            });
          } catch (error) {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Failed to persist clear to encrypted storage: ${error instanceof Error ? error.message : String(error)}`);
          }
        },

        clearAllResponses: async () => {
          set(
            {
              responses: {},
              latestResponses: {},
            },
            false,
            'clearAllResponses'
          );

          // Persist to encrypted sessionStorage
          try {
            await setEncryptedSessionStorage(STORAGE_KEY, {
              responses: {},
              latestResponses: {},
            });
            notifyEncryptedSessionStorageChange(STORAGE_KEY, {
              responses: {},
              latestResponses: {},
            });
          } catch (error) {
            loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Failed to persist clearAll to encrypted storage: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
      }),
    getZustandDevToolsConfig<AiResponseState>('ai-response-store')
  )
);

// Load initial state from encrypted sessionStorage on mount
if (typeof window !== 'undefined') {
  getEncryptedSessionStorage<{ responses: Record<string, AiResponse>; latestResponses: Record<string, string> }>(STORAGE_KEY)
    .then((stored) => {
      if (stored) {
        useAiResponseStore.setState({
          responses: stored.responses || {},
          latestResponses: stored.latestResponses || {},
        });
      }
    })
    .catch((error) => {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `[ai-response-store] Failed to load initial state: ${error instanceof Error ? error.message : String(error)}`);
    });

  // Listen for changes from other tabs
  onEncryptedSessionStorageChange(STORAGE_KEY, (newValue: { responses: Record<string, AiResponse>; latestResponses: Record<string, string> }) => {
    if (newValue) {
      useAiResponseStore.setState({
        responses: newValue.responses || {},
        latestResponses: newValue.latestResponses || {},
      });
    }
  });
}

