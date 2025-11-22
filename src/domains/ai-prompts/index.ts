/**
 * AI Prompts Domain
 * Main export file for the AI Prompts domain
 * 
 * Note: Server-only utilities (prompts-storage.util) are not exported here
 * to prevent client components from importing them. Import them directly
 * from the utils file in server components/API routes.
 */

// Types
export type {
  AiPrompt,
  CreateAiPromptRequest,
  AiPromptFilters,
} from './types';

// Hooks
export { useAiPrompts } from './hooks/useAiPrompts';

// Components
export { AiPromptHistory } from './components/AiPromptHistory';
export { ModifiedPromptsList } from './components/ModifiedPromptsList';
export { ModifiedPromptViewer } from './components/ModifiedPromptViewer';

