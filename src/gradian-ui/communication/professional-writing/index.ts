/**
 * Professional Writing Domain
 * Main export file for the Professional Writing domain
 */

// Types
export type {
  WritingStyle,
  TranslationLanguage,
  ProfessionalWritingRequest,
  ProfessionalWritingResponse,
} from './types';

export { SUPPORTED_LANGUAGES } from './types';

// Hooks
export { useProfessionalWriting } from './hooks/useProfessionalWriting';

// Components
export { ProfessionalWritingModal } from './components/ProfessionalWritingModal';

