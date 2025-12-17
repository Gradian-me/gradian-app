'use client';

import React, { useEffect, useState } from 'react';
import { SidebarNavigation } from './SidebarNavigation';
import { mapMenuItemsToNavigationItems } from '../utils';
import type { SidebarProps } from '../types';
import { useCompanyStore } from '@/stores/company.store';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '../../../shared/utils';
import { SidebarNavigationDynamic } from './SidebarNavigationDynamic';
import { AnimatePresence } from 'framer-motion';
import { apiRequest } from '@/gradian-ui/shared/utils/api';

type SidebarNavigationMenuProps = Pick<
  SidebarProps,
  'isCollapsed' | 'isMobile' | 'navigationSchemas'
>;

// Skeleton component for sidebar navigation items
const SidebarNavigationSkeleton: React.FC<{ isCollapsed?: boolean; isMobile?: boolean }> = ({ 
  isCollapsed, 
  isMobile 
}) => {
  const skeletonItems = Array.from({ length: 3 }, (_, i) => i);
  
  return (
    <ScrollArea className={cn("h-full px-2")} scrollbarVariant="dark">
      <nav className="space-y-2 pt-2 pb-4">
        {skeletonItems.map((index) => (
          <div
            key={index}
            className="flex items-center space-x-3 px-3 py-2"
          >
            <Skeleton className="h-4 w-4 rounded" />
            {(!isCollapsed || isMobile) && (
              <Skeleton className="h-3 w-20" />
            )}
          </div>
        ))}
      </nav>
      
      {/* Dynamic Schema Navigation */}
      <SidebarNavigationDynamic
        isCollapsed={isCollapsed ?? false}
        isMobile={isMobile ?? false}
      />
    </ScrollArea>
  );
};

export const SidebarNavigationMenu: React.FC<SidebarNavigationMenuProps> = ({
  isCollapsed,
  isMobile,
  navigationSchemas,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Subscribe to selectedCompany directly so we react to changes
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  // Compute companyId from selectedCompany
  const companyId = selectedCompany && selectedCompany.id !== -1 ? selectedCompany.id : null;
  
  // Track the last companyId that was used to load items
  const lastLoadedCompanyIdRef = React.useRef<number | string | null>(null);
  // Track if items have been loaded at least once
  const hasLoadedRef = React.useRef<boolean>(false);

  useEffect(() => {
    // Only reload if companyId actually changed, or if we haven't loaded yet
    if (hasLoadedRef.current && lastLoadedCompanyIdRef.current === companyId) {
      return; // Skip reload if companyId hasn't changed
    }

    let isMounted = true;

    async function loadMenuItems() {
      setIsLoading(true);
      try {
        // Use apiRequest which automatically includes tenantIds and companyIds
        const response = await apiRequest<any[]>('/api/data/menu-items');
        
        if (!response.success || !response.data) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        const rawItems = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.results)
          ? (response.data as any).results
          : [];

        const mapped = mapMenuItemsToNavigationItems(rawItems, companyId);
        if (isMounted) {
          setItems(mapped);
          setIsLoading(false);
          lastLoadedCompanyIdRef.current = companyId;
          hasLoadedRef.current = true;
        }
      } catch {
        // Silently ignore errors and leave items as-is
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMenuItems();

    return () => {
      isMounted = false;
    };
  }, [companyId, selectedCompany]);

  if (isLoading) {
    return (
      <SidebarNavigationSkeleton 
        isCollapsed={isCollapsed} 
        isMobile={isMobile} 
      />
    );
  }

  return (
    <SidebarNavigation
      items={items}
      isCollapsed={isCollapsed}
      isMobile={isMobile ?? false}
      navigationSchemas={navigationSchemas}
    />
  );
};

SidebarNavigationMenu.displayName = 'SidebarNavigationMenu';


