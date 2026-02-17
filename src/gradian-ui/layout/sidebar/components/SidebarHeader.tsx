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
  isRtl = false,
}) => {
  const displaySubtitle = brand?.subtitle || 'Trust Your Decisions';

  // LTR: sidebar on left — collapsed = PanelLeftOpen (expand), expanded = PanelRightOpen (collapse).
  // RTL: sidebar on right — collapsed = PanelRightOpen (expand toward left), expanded = PanelLeftOpen (collapse toward right).
  // Mobile: LTR = PanelRightOpen (close slides left), RTL = PanelLeftOpen (close slides right).
  const toggleIcon =
    isMobile ? (
      isRtl ? <PanelLeftOpen className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />
    ) : isRtl ? (
      isCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />
    ) : (
      isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />
    );

  // No flex-row-reverse: with dir=rtl inherited from document, flex puts first child at start (right),
  // second at end (left), so the toggle stays on the content edge (left side of sidebar in RTL).
  return (
    <div
      className={cn(
        "flex items-center justify-between h-16 border-b border-gray-700 px-4 w-full gap-3",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isCollapsed && !isMobile ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-w-0 flex-1"
          />
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            <div className="flex flex-col items-start gap-1 w-full min-w-0">
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
        className="text-gray-100 hover:text-white hover:bg-gray-800 rounded-lg dark:text-violet-300 shrink-0"
      >
        {toggleIcon}
      </Button>
    </div>
  );
};

SidebarHeader.displayName = 'SidebarHeader';

