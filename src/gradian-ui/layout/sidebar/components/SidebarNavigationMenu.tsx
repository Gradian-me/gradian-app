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
    <ScrollArea className={cn("h-full px-4")} scrollbarVariant="dark">
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

  useEffect(() => {
    let isMounted = true;

    async function loadMenuItems() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/data/menu-items');
        if (!res.ok) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }
        const json = await res.json();
        const rawItems = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.results)
          ? json.results
          : [];

        const mapped = mapMenuItemsToNavigationItems(rawItems, companyId);
        if (isMounted) {
          setItems(mapped);
          setIsLoading(false);
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


