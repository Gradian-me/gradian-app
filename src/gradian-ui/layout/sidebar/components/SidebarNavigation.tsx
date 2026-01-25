'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarNavigationProps } from '../types';
import { isActiveNavigationItem, filterNavigationItems } from '../utils';
import { cn } from '../../../shared/utils';
import { SidebarNavigationDynamic } from './SidebarNavigationDynamic';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  items,
  isCollapsed,
  isMobile,
  activePath,
  onItemClick,
  className,
  navigationSchemas,
  searchQuery,
}) => {
  const pathname = usePathname();
  const currentPath = activePath || pathname;
  const shouldShowTooltip = isCollapsed && !isMobile;
  
  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    return filterNavigationItems(items, searchQuery || '');
  }, [items, searchQuery]);

  // Track previous items to detect actual changes (not just re-renders)
  const prevItemsKeyRef = useRef<string>('');
  const itemsKey = React.useMemo(() => {
    return filteredItems.map(item => item.id || item.name).join(',');
  }, [filteredItems]);
  
  // Only animate if items actually changed (new items added/removed)
  const shouldAnimate = prevItemsKeyRef.current !== itemsKey;
  React.useEffect(() => {
    prevItemsKeyRef.current = itemsKey;
  }, [itemsKey]);

  return (
    <TooltipProvider delayDuration={200}>
      <ScrollArea className={cn("h-full px-2", className)} scrollbarVariant="minimal">
        <nav className="space-y-3 pt-2 pb-6">
          {filteredItems.map((item, index) => {
            const isActive = isActiveNavigationItem(item, currentPath);
            const Icon = item.icon;
            
            const content = (
              <Link href={item.href} prefetch={false} onClick={() => onItemClick?.(item)}>
                <motion.div
                  key={`${item.id || item.name}-${shouldAnimate}`}
                  initial={shouldAnimate ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={shouldAnimate ? {
                    duration: 0.15,
                    delay: index * 0.04,
                    ease: [0.4, 0, 0.2, 1],
                  } : { duration: 0 }}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg transition-colors duration-150",
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          duration: 0.15,
                          ease: 'easeOut'
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
        searchQuery={searchQuery}
      />
    </ScrollArea>
    </TooltipProvider>
  );
};

SidebarNavigation.displayName = 'SidebarNavigation';

