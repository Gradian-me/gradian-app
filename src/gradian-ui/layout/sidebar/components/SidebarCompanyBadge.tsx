'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SidebarCompanyBadgeProps } from '../types';
import { cn } from '../../../shared/utils';
import { resolveLocalizedField } from '../../../shared/utils/localization';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage } from '../../../shared/utils/translation-utils';

export const SidebarCompanyBadge: React.FC<SidebarCompanyBadgeProps> = ({
  company,
  isCollapsed,
  isMobile,
  className,
}) => {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();

  if (!company) return null;

  const displayName = resolveLocalizedField(company.name, language, defaultLang) || 'Company';
  const abbreviation = company.abbreviation || 
    displayName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

  return (
    <div className={cn("p-6", className)}>
      <AnimatePresence mode="wait">
        {(!isCollapsed || isMobile) ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Button className="w-full bg-gray-800 hover:bg-gray-700 text-white">
              {displayName}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex justify-center"
          >
            <Button size="icon" className="bg-gray-800 hover:bg-gray-700 text-white">
              <span className="text-sm font-bold">{abbreviation}</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

SidebarCompanyBadge.displayName = 'SidebarCompanyBadge';

