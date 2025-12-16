'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { cn } from '../../../shared/utils';
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';
import { useSchemas } from '@/gradian-ui/schema-manager/hooks/use-schemas';

interface SidebarNavigationDynamicProps {
  isCollapsed: boolean;
  isMobile: boolean;
  className?: string;
  initialSchemas?: FormSchema[];
}

const ACCORDION_STATE_KEY = 'gradian-sidebar-accordion-open';

export const SidebarNavigationDynamic: React.FC<SidebarNavigationDynamicProps> = ({
  isCollapsed,
  isMobile,
  className,
  initialSchemas,
}) => {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  // Persist accordion state across route changes
  const [accordionValue, setAccordionValue] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined; // SSR default
    const stored = localStorage.getItem(ACCORDION_STATE_KEY);
    return stored === 'open' ? 'applications' : undefined;
  });
  
  // Track previous pathname to detect route changes within chat
  const prevPathnameRef = useRef<string | null>(null);
  const isRouteChangeWithinChat = React.useMemo(() => {
    const prev = prevPathnameRef.current;
    const current = pathname || null;
    const wasChatRoute = prev?.startsWith('/chat');
    const isChatRoute = current?.startsWith('/chat');
    return wasChatRoute && isChatRoute && prev !== current;
  }, [pathname]);
  
  // Update pathname ref after render
  React.useEffect(() => {
    prevPathnameRef.current = pathname || null;
  }, [pathname]);
  
  const { schemas: allSchemas, isLoading, refetch } = useSchemas({
    initialData: initialSchemas,
    summary: true,
  });
  
  // Prevent refetch when switching between chat routes (use cached data)
  const shouldRefetchRef = useRef(true);
  React.useEffect(() => {
    if (isRouteChangeWithinChat) {
      shouldRefetchRef.current = false;
    } else {
      shouldRefetchRef.current = true;
    }
  }, [isRouteChangeWithinChat]);

  // Only render Accordion after client-side mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Persist accordion state to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCORDION_STATE_KEY, accordionValue === 'applications' ? 'open' : 'closed');
  }, [accordionValue]);

  // Close accordion when sidebar is collapsed
  useEffect(() => {
    if (isCollapsed && !isMobile && accordionValue === 'applications') {
      setAccordionValue(undefined);
    }
  }, [isCollapsed, isMobile, accordionValue]);

  // Listen for cache clear events and refetch schemas
  // Only refetch if not switching between chat routes
  useEffect(() => {
    const handleCacheClear = () => {
      // Only refetch if we're not switching between chat routes
      // When switching chats, use cached data instead
      if (!isRouteChangeWithinChat) {
        refetch();
      }
    };

    // Listen for custom cache clear event
    window.addEventListener('react-query-cache-clear', handleCacheClear);
    
    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'react-query-cache-cleared' && !isRouteChangeWithinChat) {
        refetch();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('react-query-cache-clear', handleCacheClear);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refetch, isRouteChangeWithinChat]);

  // Filter schemas that have showInNavigation enabled
  const schemas = useMemo(() => {
    return allSchemas.filter((schema: FormSchema) => 
      schema.showInNavigation === true
    );
  }, [allSchemas]);

  if (isLoading || schemas.length === 0) {
    return null;
  }

  const isActive = (schemaId: string) => {
    return pathname.includes(`/page/${schemaId}`);
  };

  const shouldShowTooltip = isCollapsed && !isMobile;

  const accordionTrigger = (
    <AccordionTrigger className={cn(
      "px-3 py-2 text-gray-300 hover:text-white",
      "hover:bg-gray-800 rounded-lg transition-colors",
      "data-[state=open]:text-white"
    )}>
      <div className={cn(
        "flex items-center flex-1",
        isCollapsed && !isMobile ? "justify-center" : "space-x-3"
      )}>
        <LayoutGrid className="h-5 w-5 shrink-0" />
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
              Applications
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </AccordionTrigger>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("w-full px-0 mt-3", className)}>
        <Separator className="my-4 bg-gray-700" />
        
        {isMounted ? (
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={accordionValue}
            onValueChange={setAccordionValue}
          >
            <AccordionItem value="applications" className="border-none">
              {shouldShowTooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {accordionTrigger}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-900 text-white border-gray-700">
                    <p>Applications</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                accordionTrigger
              )}
            <AccordionContent className={cn(
              "pe-0 pb-0",
              isCollapsed && !isMobile ? "ps-0" : "ps-3"
            )}>
              <nav className="space-y-1 mt-1">
                {schemas.map((schema, index) => {
                  const active = isActive(schema.id);
                  const schemaItem = (
                    <Link href={`/page/${schema.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x:-1, y: 0}}
                        animate={{ opacity: 1, x:0, y: 0}}
                        transition={{
                          duration: 0.25,
                          delay: Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX),
                          ease: 'easeOut',
                        }}
                        whileHover={!isCollapsed || isMobile ? { scale: 1.02 } : undefined}
                        className={cn(
                          "flex items-center py-2 rounded-lg transition-all duration-200",
                          isCollapsed && !isMobile ? "justify-center px-0" : "space-x-3 px-3",
                          active
                            ? "bg-gray-800 text-white"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                        )}
                      >
                        {schema.icon ? (
                          <IconRenderer 
                            iconName={schema.icon} 
                            className="h-5 w-5 shrink-0" 
                          />
                        ) : (
                          <div className="h-5 w-5 shrink-0 rounded bg-gray-700" />
                        )}
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
                              {schema.plural_name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  );

                  if (shouldShowTooltip) {
                    return (
                      <Tooltip key={schema.id}>
                        <TooltipTrigger asChild>
                          {schemaItem}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-gray-900 text-white border-gray-700">
                          <p>{schema.plural_name}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <React.Fragment key={schema.id}>{schemaItem}</React.Fragment>;
                })}
              </nav>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        // Placeholder during SSR to maintain layout
        <div className="w-full">
          <div className="px-3 py-2 text-gray-300">
            <div className={cn(
              "flex items-center flex-1",
              isCollapsed && !isMobile ? "justify-center" : "space-x-3"
            )}>
              <LayoutGrid className="h-5 w-5 shrink-0" />
              {(!isCollapsed || isMobile) && (
                <span className="text-xs font-medium">Applications</span>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
};

SidebarNavigationDynamic.displayName = 'SidebarNavigationDynamic';

