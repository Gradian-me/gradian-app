/**
 * Professional Writing Domain Types
 */

export type WritingStyle = 'professional' | 'casual' | 'translate' | 'extended' | 'solution-advisor';

export interface TranslationLanguage {
  code: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: TranslationLanguage[] = [
  { code: 'ar', label: 'Arabic' },
  { code: 'cs', label: 'Czech' },
  { code: 'da', label: 'Danish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'en', label: 'English' },
  { code: 'fa', label: 'Persian' },
  { code: 'fi', label: 'Finnish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'no', label: 'Norwegian' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Spanish' },
  { code: 'sv', label: 'Swedish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'zh', label: 'Chinese (Simplified)' },
].sort((a, b) => a.label.localeCompare(b.label));

export interface ProfessionalWritingRequest {
  text: string;
  style: WritingStyle;
  targetLanguage?: string; // Language code, required when style is 'translate'
}

export interface ProfessionalWritingResponse {
  enhancedText: string;
  tokenUsage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    pricing?: {
      input_price_per_1m: number;
      output_price_per_1m: number;
      input_cost: number;
      output_cost: number;
      total_cost: number;
      model_id: string;
    } | null;
  } | null;
}

