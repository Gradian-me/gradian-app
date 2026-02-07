'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguageStore } from '@/stores/language.store';
import { isRTL } from '../utils/translation-utils';

/** Returns the correct back navigation icon for the current language (ArrowRight in RTL, ArrowLeft in LTR). */
export function useBackIcon(): typeof ArrowLeft {
  const language = useLanguageStore((s) => s.language);
  return isRTL(language || 'en') ? ArrowRight : ArrowLeft;
}
