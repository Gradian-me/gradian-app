/**
 * AI Builder Loading Indicator Component
 * Reusable loading indicator with VoicePoweredOrb and TextSwitcher
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoicePoweredOrb } from '@/components/ui/voice-powered-orb';
import { TextSwitcher } from '@/components/ui/text-switcher';
import type { AiAgent } from '../types';

interface AiBuilderLoadingIndicatorProps {
  isLoading: boolean;
  agent: AiAgent | null;
  className?: string;
}

export function AiBuilderLoadingIndicator({
  isLoading,
  agent,
  className = '',
}: AiBuilderLoadingIndicatorProps) {
  if (!isLoading || !agent) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="loading-orb"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`w-full h-96 relative rounded-xl overflow-hidden ${className}`}
      >
        <VoicePoweredOrb
          enableVoiceControl={false}
          className="rounded-xl overflow-hidden"
        />
        {agent.loadingTextSwitches && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4">
            <div className="max-w-[85%]">
              <TextSwitcher
                texts={agent.loadingTextSwitches}
                className="text-vilet-900 dark:text-white font-medium text-sm md:text-base px-4 py-2"
                switchInterval={3000}
                transitionDuration={0.5}
                shimmerDuration={1}
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

