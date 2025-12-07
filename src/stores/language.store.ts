import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';

type Language = string; // e.g., 'en', 'fr', 'es', etc.

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  getLanguage: () => Language;
}

export const useLanguageStore = create<LanguageState>()(
  devtools(
    persist(
      (set, get) => ({
        language: 'en', // Default to English
        
        setLanguage: (language: Language) => {
          set({ language }, false, 'setLanguage');
        },
        
        getLanguage: () => {
          return get().language || 'en';
        },
      }),
      {
        name: 'language-store',
      }
    ),
    getZustandDevToolsConfig<LanguageState>('language-store')
  )
);

