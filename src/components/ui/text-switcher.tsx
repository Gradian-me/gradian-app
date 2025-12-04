'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextShimmerWave } from './text-shimmer-wave';
import { cn } from '@/lib/utils';

type TextSwitcherProps = {
  texts: string | string[];
  className?: string;
  switchInterval?: number;
  transitionDuration?: number;
  shimmerDuration?: number;
  as?: React.ElementType;
};

export function TextSwitcher({
  texts,
  className,
  switchInterval = 3000,
  transitionDuration = 0.5,
  shimmerDuration = 1,
  as: Component = 'p',
}: TextSwitcherProps) {
  // Normalize texts to array
  const textsArray = Array.isArray(texts) ? texts : texts ? [texts] : [];
  
  // If only one text, just display it without switching
  const shouldSwitch = textsArray.length > 1;
  
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!shouldSwitch) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % textsArray.length);
    }, switchInterval);

    return () => clearInterval(interval);
  }, [textsArray.length, switchInterval, shouldSwitch]);

  // If empty array, return null
  if (textsArray.length === 0) {
    return null;
  }

  const currentText = textsArray[currentIndex];

  return (
    <div className="relative inline-block">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: transitionDuration }}
          className="inline-block"
        >
          <TextShimmerWave
            as={Component}
            duration={shimmerDuration}
            className={className}
          >
            {currentText}
          </TextShimmerWave>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

