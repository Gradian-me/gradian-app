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

const STORAGE_KEY = 'ai-response-store';

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

        set(
          (state) => ({
            responses: {
              ...state.responses,
              [key]: response,
            },
            latestResponses: {
              ...state.latestResponses,
              [latestKey]: timestamp,
            },
          }),
          false,
          'saveResponse'
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
          console.warn('[ai-response-store] Failed to persist to encrypted storage:', error);
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
            console.warn('[ai-response-store] Failed to persist update to encrypted storage:', error);
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
            console.warn('[ai-response-store] Failed to persist clear to encrypted storage:', error);
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
            console.warn('[ai-response-store] Failed to persist clearAll to encrypted storage:', error);
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
      console.warn('[ai-response-store] Failed to load initial state:', error);
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

