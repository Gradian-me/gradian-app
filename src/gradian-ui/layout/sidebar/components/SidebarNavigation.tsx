'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SidebarNavigationProps } from '../types';
import { isActiveNavigationItem, filterNavigationItems, FALLBACK_HOME_MENU_ITEM } from '../utils';
import { cn } from '../../../shared/utils';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { SIDEBAR_HIGHLIGHT_CLASS } from '../utils';
import { SidebarNavigationDynamic } from './SidebarNavigationDynamic';
import { Menu } from 'lucide-react';
import { useLanguageStore } from '@/stores/language.store';
import { isRTL, getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

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
  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();
  const tooltipSide = isRTL(language) ? 'left' : 'right';
  const homeLabel = getT(TRANSLATION_KEYS.SIDEBAR_HOME, language, defaultLang);
  const menuLabel = getT(TRANSLATION_KEYS.SIDEBAR_MENU, language, defaultLang);
  
  const filteredItems = React.useMemo(() => {
    return filterNavigationItems(items, searchQuery || '');
  }, [items, searchQuery]);

  const prevItemsKeyRef = useRef<string>('');
  const itemsKey = React.useMemo(() => {
    return filteredItems.map(item => item.id || item.name).join(',');
  }, [filteredItems]);
  React.useEffect(() => {
    prevItemsKeyRef.current = itemsKey;
  }, [itemsKey]);

  const [menuAccordionValue, setMenuAccordionValue] = React.useState<string | undefined>('menu-items');
  React.useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 0 && filteredItems.length > 0) {
      setMenuAccordionValue('menu-items');
    } else if (!searchQuery || searchQuery.trim().length === 0) {
      setMenuAccordionValue('menu-items');
    }
  }, [searchQuery, filteredItems.length]);

  const hasMenuItems = items.length > 0;
  const homeActive = isActiveNavigationItem(FALLBACK_HOME_MENU_ITEM, currentPath);
  const HomeIcon = FALLBACK_HOME_MENU_ITEM.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <ScrollArea
        className={cn("h-full px-2", className)}
        scrollbarVariant="minimal"
        dir={isRTL(language) ? 'rtl' : undefined}
      >
        <div className="space-y-1 pt-2 pb-4">
          {/* Home link - always shown, outside Menu */}
          <div className="space-y-1">
            {shouldShowTooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/" prefetch={false} className="block">
                    <div
                      className={cn(
                        "flex items-center py-2 min-h-8 rounded-lg transition-colors duration-150",
                        isCollapsed && !isMobile ? "justify-center px-0" : "gap-3 px-3",
                        homeActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <HomeIcon className="h-5 w-5 shrink-0" />
                      {(!isCollapsed || isMobile) && (
                        <span className="text-xs font-medium overflow-hidden whitespace-nowrap leading-relaxed">
                          {homeLabel}
                        </span>
                      )}
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side={tooltipSide} className="bg-gray-900 text-white border-gray-700">
                  <p className="leading-relaxed">{homeLabel}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link href="/" prefetch={false} className="block">
                <div
                  className={cn(
                    "flex items-center py-2 min-h-8 rounded-lg transition-colors duration-150",
                    isCollapsed && !isMobile ? "justify-center px-0" : "gap-3 px-3",
                    homeActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <HomeIcon className="h-5 w-5 shrink-0" />
                  {(!isCollapsed || isMobile) && (
                    <span className="text-xs font-medium overflow-hidden whitespace-nowrap leading-relaxed">
                      {homeLabel}
                    </span>
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* Menu accordion - only when there are other menu items */}
          {hasMenuItems && (
            <Accordion type="single" collapsible value={menuAccordionValue} onValueChange={setMenuAccordionValue} className="w-full">
              <AccordionItem value="menu-items" className="border-none">
                <AccordionTrigger
                  className={cn(
                    "px-3 py-2 min-h-9 hover:no-underline rounded-lg transition-colors",
                    "text-gray-300 hover:text-white hover:bg-gray-800/50",
                    "data-[state=open]:text-white data-[state=open]:bg-gray-800/70",
                    "border-s-2 border-s-transparent data-[state=open]:border-s-violet-500"
                  )}
                >
                  <div className={cn(
                    "flex items-center flex-1 min-h-[1.5em]",
                    isCollapsed && !isMobile ? "justify-center" : "gap-2"
                  )}>
                    <Menu className="h-4 w-4 shrink-0" />
                    <AnimatePresence mode="wait">
                      {(!isCollapsed || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ 
                            duration: 0.15,
                            ease: 'easeOut'
                          }}
                          className="text-[11px] font-semibold uppercase tracking-wider truncate leading-relaxed"
                        >
                          {menuLabel}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pe-0 pb-0 pt-0">
                  <AnimatePresence mode="wait">
                    {menuAccordionValue === 'menu-items' && (
                      <motion.nav
                        key="menu-items-nav"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-1 mt-1 border-s-2 border-s-violet-500/30 me-2 pe-1"
                      >
                        {filteredItems.map((item, index) => {
                          const isActive = isActiveNavigationItem(item, currentPath);
                          const Icon = item.icon;
                          
                          const content = (
                            <Link key={item.name} href={item.href} prefetch={false} onClick={() => onItemClick?.(item)}>
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  duration: 0.35,
                                  delay: index * 0.03,
                                  ease: "easeIn",
                                }}
                            className={cn(
                              "flex items-center py-2 min-h-8 rounded-lg transition-colors duration-150",
                              isCollapsed && !isMobile ? "justify-center px-0" : "gap-3 px-3",
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
                                  className="text-xs font-medium overflow-hidden whitespace-nowrap leading-relaxed"
                                >
                                  {searchQuery?.trim()
                                    ? renderHighlightedText(item.name ?? '', searchQuery.trim(), SIDEBAR_HIGHLIGHT_CLASS)
                                    : (item.name ?? '')}
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
                            <TooltipContent side={tooltipSide} className="bg-gray-900 text-white border-gray-700">
                              <p className="leading-relaxed">{item.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                          return <React.Fragment key={item.name}>{content}</React.Fragment>;
                        })}
                      </motion.nav>
                    )}
                  </AnimatePresence>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
      
          {/* Dynamic Schema Navigation */}
          <SidebarNavigationDynamic
            isCollapsed={isCollapsed}
            isMobile={isMobile}
            initialSchemas={navigationSchemas}
            searchQuery={searchQuery}
          />
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
};

SidebarNavigation.displayName = 'SidebarNavigation';

