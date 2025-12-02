'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  useEffect(() => {
    if (!hasMountedRef.current) {
      navigationItemsMounted = true;
      hasMountedRef.current = true;
    }
  }, []);

  return (
    <ScrollArea className={cn("h-full px-4", className)} scrollbarVariant="dark">
      <nav className="space-y-3 pt-2 pb-4">
        {items.map((item, index) => {
          const isActive = isActiveNavigationItem(item, currentPath);
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href} onClick={() => onItemClick?.(item)}>
              <motion.div
                initial={!hasMountedRef.current ? { opacity: 0, y: 6, scale: 0.98 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.25,
                  delay: !hasMountedRef.current ? Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX) : 0,
                  ease: 'easeOut',
                }}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {(!isCollapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="text-xs font-medium"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && (!isCollapsed || isMobile) && (
                  <span className="ml-auto bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>
      
      {/* Dynamic Schema Navigation */}
      <SidebarNavigationDynamic
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        initialSchemas={navigationSchemas}
      />
    </ScrollArea>
  );
};

SidebarNavigation.displayName = 'SidebarNavigation';

