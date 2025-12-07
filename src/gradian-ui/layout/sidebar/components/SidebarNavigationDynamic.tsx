'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useMemo, useEffect, useState } from 'react';
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
  const { schemas: allSchemas, isLoading, refetch } = useSchemas({
    initialData: initialSchemas,
    summary: true,
  });

  // Only render Accordion after client-side mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Persist accordion state to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCORDION_STATE_KEY, accordionValue === 'applications' ? 'open' : 'closed');
  }, [accordionValue]);

  // Listen for cache clear events and refetch schemas
  useEffect(() => {
    const handleCacheClear = () => {
      // Refetch schemas when cache is cleared
      refetch();
    };

    // Listen for custom cache clear event
    window.addEventListener('react-query-cache-clear', handleCacheClear);
    
    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'react-query-cache-cleared') {
        refetch();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('react-query-cache-clear', handleCacheClear);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refetch]);

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

  return (
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
            <AccordionTrigger className={cn(
              "px-3 py-2 text-gray-300 hover:text-white",
              "hover:bg-gray-800 rounded-lg transition-colors",
              "data-[state=open]:text-white"
            )}>
              <div className="flex items-center space-x-3 flex-1">
                <LayoutGrid className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {(!isCollapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs font-medium"
                    >
                      Applications
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </AccordionTrigger>
            <AccordionContent className="ps-3 pe-0 pb-0">
              <nav className="space-y-1 mt-1">
                {schemas.map((schema, index) => {
                  const active = isActive(schema.id);
                  return (
                    <Link key={schema.id} href={`/page/${schema.id}`}>
                      <motion.div
                        initial={{ opacity: 0, x:-1, y: 0}}
                        animate={{ opacity: 1, x:0, y: 0}}
                        transition={{
                          duration: 0.25,
                          delay: Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX),
                          ease: 'easeOut',
                        }}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200",
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
                        <AnimatePresence>
                          {(!isCollapsed || isMobile) && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.3 }}
                              className="text-xs font-medium"
                            >
                              {schema.plural_name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        // Placeholder during SSR to maintain layout
        <div className="w-full">
          <div className="px-3 py-2 text-gray-300">
            <div className="flex items-center space-x-3 flex-1">
              <LayoutGrid className="h-5 w-5 shrink-0" />
              {(!isCollapsed || isMobile) && (
                <span className="text-xs font-medium">Applications</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

SidebarNavigationDynamic.displayName = 'SidebarNavigationDynamic';

