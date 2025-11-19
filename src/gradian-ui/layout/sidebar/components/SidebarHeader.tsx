'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRightOpen, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarHeaderProps } from '../types';
import { cn } from '../../../shared/utils';

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  brand,
  isCollapsed,
  isMobile,
  onToggle,
  className,
}) => {
  const displayTitle = brand?.title || 'Gradia App';
  const displaySubtitle = brand?.subtitle || 'Trust Your Decision';

  return (
    <div className={cn("flex items-center justify-between p-6 border-b border-gray-700", className)}>
      <AnimatePresence mode="wait">
        {(!isCollapsed || isMobile) && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">{displayTitle[0]}</span>
            </div>
            <div>
              <h1 className="font-bold text-xl text-white whitespace-nowrap truncate">{displayTitle}</h1>
              {displaySubtitle && (
                <p className="text-xs text-gray-400 whitespace-nowrap truncate">{displaySubtitle}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg dark:text-violet-300"
      >
        {isMobile ? (
          <PanelRightOpen className="h-5 w-5" />
        ) : (
          isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
};

SidebarHeader.displayName = 'SidebarHeader';

