'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarNavigationProps } from '../types';
import { isActiveNavigationItem } from '../utils';
import { cn } from '../../../shared/utils';
import { SidebarNavigationDynamic } from './SidebarNavigationDynamic';
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';

// Track if navigation items have been mounted before (persists across route changes)
let navigationItemsMounted = false;

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  items,
  isCollapsed,
  isMobile,
  activePath,
  onItemClick,
  className,
  navigationSchemas,
}) => {
  const pathname = usePathname();
  const currentPath = activePath || pathname;
  const hasMountedRef = useRef(navigationItemsMounted);
  const [hasMounted, setHasMounted] = React.useState(navigationItemsMounted);

  useEffect(() => {
    if (!hasMountedRef.current) {
      navigationItemsMounted = true;
      hasMountedRef.current = true;
      setHasMounted(true);
    }
  }, []);

  const shouldShowTooltip = isCollapsed && !isMobile;

  return (
    <TooltipProvider delayDuration={200}>
      <ScrollArea className={cn("h-full px-2", className)} scrollbarVariant="dark">
        <nav className="space-y-3 pt-2 pb-4">
          {items.map((item, index) => {
            const isActive = isActiveNavigationItem(item, currentPath);
            const Icon = item.icon;
            
            const content = (
              <Link href={item.href} prefetch={false} onClick={() => onItemClick?.(item)}>
                <motion.div
                  initial={!hasMounted ? { opacity: 0, y: 6, scale: 0.98 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.25,
                    delay: !hasMounted ? Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX) : 0,
                    ease: 'easeOut',
                  }}
                  whileHover={!isCollapsed || isMobile ? { scale: 1.02 } : undefined}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg transition-all duration-200",
                    isCollapsed && !isMobile ? "justify-center" : "space-x-3",
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <AnimatePresence mode="wait">
                    {(!isCollapsed || isMobile) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0, x: -8 }}
                        animate={{ opacity: 1, width: "auto", x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -8 }}
                        transition={{ 
                          duration: 0.2, 
                          ease: [0.4, 0, 0.2, 1],
                          opacity: { duration: 0.15 }
                        }}
                        className="text-xs font-medium overflow-hidden whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.badge && (!isCollapsed || isMobile) && (
                    <span className="ms-auto bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              </Link>
            );

            if (shouldShowTooltip) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    {content}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-900 text-white border-gray-700">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.name}>{content}</React.Fragment>;
          })}
        </nav>
      
      {/* Dynamic Schema Navigation */}
      <SidebarNavigationDynamic
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        initialSchemas={navigationSchemas}
      />
    </ScrollArea>
    </TooltipProvider>
  );
};

SidebarNavigation.displayName = 'SidebarNavigation';

