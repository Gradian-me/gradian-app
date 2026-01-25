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
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';
import { useSchemas } from '@/gradian-ui/schema-manager/hooks/use-schemas';
import { useTenantStore } from '@/stores/tenant.store';
import { filterFormSchemas } from '../utils';

interface SidebarNavigationDynamicProps {
  isCollapsed: boolean;
  isMobile: boolean;
  className?: string;
  initialSchemas?: FormSchema[];
  searchQuery?: string;
}

const ACCORDION_STATE_KEY = 'gradian-sidebar-accordion-open';

export const SidebarNavigationDynamic: React.FC<SidebarNavigationDynamicProps> = ({
  isCollapsed,
  isMobile,
  className,
  initialSchemas,
  searchQuery,
}) => {
  const pathname = usePathname();
  const tenantId = useTenantStore((state) => state.getTenantId());
  const selectedTenant = useTenantStore((state) => state.selectedTenant);
  // Check if tenant name is "local" - if so, don't filter by tenantIds in API call
  const isLocalTenant = React.useMemo(() => {
    return Boolean(selectedTenant?.name?.toLowerCase() === 'local');
  }, [selectedTenant?.name]);
  const [isMounted, setIsMounted] = useState(false);
  // Persist accordion state across route changes
  const [accordionValue, setAccordionValue] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined; // SSR default
    const stored = localStorage.getItem(ACCORDION_STATE_KEY);
    return stored === 'open' ? 'applications' : undefined;
  });
  
  // Track previous pathname to detect route changes within chat
  // Use state instead of ref to avoid accessing refs during render
  const [prevPathname, setPrevPathname] = React.useState<string | null>(null);
  const prevIsCollapsedRef = useRef<boolean>(isCollapsed);
  const isRouteChangeWithinChat = React.useMemo(() => {
    const prev = prevPathname;
    const current = pathname || null;
    const wasChatRoute = prev?.startsWith('/chat');
    const isChatRoute = current?.startsWith('/chat');
    return wasChatRoute && isChatRoute && prev !== current;
  }, [pathname, prevPathname]);
  
  // Update pathname state after render
  React.useEffect(() => {
    setPrevPathname(pathname || null);
  }, [pathname]);

  // When sidebar is opened (transition from collapsed -> expanded), auto-open Applications accordion
  useEffect(() => {
    const prev = prevIsCollapsedRef.current;
    if (prev && !isCollapsed) {
      setAccordionValue('applications');
    }
    prevIsCollapsedRef.current = isCollapsed;
  }, [isCollapsed]);
  
  const { schemas: allSchemas, isLoading, refetch } = useSchemas({
    initialData: initialSchemas,
    summary: true,
    // Don't pass tenantIds for "local" tenant to avoid filtering by relatedTenants
    tenantIds: isLocalTenant ? undefined : (tenantId ? String(tenantId) : undefined),
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
  // If tenant name is "local", show all schemas (already filtered by API when not local)
  // Then apply search filter if provided
  const schemas = useMemo(() => {
    let filtered = isLocalTenant
      ? allSchemas // For local tenant, show all schemas (API already returned all)
      : allSchemas.filter((schema: FormSchema) => 
          schema.showInNavigation === true
        );
    
    // Apply search filter if provided
    if (searchQuery) {
      filtered = filterFormSchemas(filtered, searchQuery);
    }
    
    return filtered;
  }, [allSchemas, isLocalTenant, searchQuery]);

  // Track previous schemas to detect actual changes (not just re-renders)
  const prevSchemasKeyRef = useRef<string>('');
  const prevAccordionOpenRef = useRef<boolean>(false);
  const schemasKey = React.useMemo(() => {
    return schemas.map(schema => schema.id).join(',');
  }, [schemas]);
  
  // Only animate if schemas actually changed (new schemas added/removed)
  // or when accordion first opens
  const isAccordionOpen = accordionValue === 'applications';
  const isAccordionJustOpened = isAccordionOpen && !prevAccordionOpenRef.current;
  const shouldAnimate = prevSchemasKeyRef.current !== schemasKey || isAccordionJustOpened;
  
  React.useEffect(() => {
    if (prevSchemasKeyRef.current !== schemasKey) {
      prevSchemasKeyRef.current = schemasKey;
    }
    prevAccordionOpenRef.current = isAccordionOpen;
  }, [schemasKey, isAccordionOpen]);

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
      <div className={cn("w-full px-0 mt-3 mb-4", className)}>
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
              <nav className="space-y-1 mt-1 mb-2">
                {schemas.map((schema, index) => {
                  const active = isActive(schema.id);
                  const schemaItem = (
                    <Link key={schema.id} href={`/page/${schema.id}`} prefetch={false}>
                      <motion.div
                        initial={shouldAnimate ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        transition={shouldAnimate ? {
                          duration: 0.15,
                          delay: index * 0.04,
                          ease: [0.4, 0, 0.2, 1],
                        } : { duration: 0 }}
                        className={cn(
                          "flex items-center py-2 rounded-lg transition-colors duration-150",
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
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ 
                                duration: 0.15,
                                ease: 'easeOut'
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

