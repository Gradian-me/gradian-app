'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRightOpen, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarHeaderProps } from '../types';
import { cn } from '../../../shared/utils';
import { Logo } from '../../logo/components/Logo';

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  brand,
  isCollapsed,
  isMobile,
  onToggle,
  className,
}) => {
  const displaySubtitle = brand?.subtitle || 'Trust Your Decisions';

  return (
    <div className={cn("flex items-center justify-center p-2 border-b border-gray-700", className)}>
      <AnimatePresence mode="wait">
        {isCollapsed && !isMobile ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >

          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center space-x-3 w-full"
          >
            <div className="flex flex-col items-start space-x-3 w-full">
              <Logo
                variant="white"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
              {displaySubtitle && (
                <div className="w-full text-start">
                  <p className="text-xs text-gray-400 whitespace-nowrap truncate">{displaySubtitle}</p>
                </div>
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
    </div >
  );
};

SidebarHeader.displayName = 'SidebarHeader';

