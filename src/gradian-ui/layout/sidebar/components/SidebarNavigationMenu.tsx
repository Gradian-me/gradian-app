'use client';

import React, { useEffect, useState } from 'react';
import { SidebarNavigation } from './SidebarNavigation';
import { mapMenuItemsToNavigationItems } from '../utils';
import type { SidebarProps } from '../types';
import { useCompanyStore } from '@/stores/company.store';
import { useMenuItemsStore } from '@/stores/menu-items.store';
import { useTenantStore } from '@/stores/tenant.store';
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
  
  // Initialize currentItemsRef with items state
  React.useEffect(() => {
    currentItemsRef.current = items;
  }, [items]);
  // Subscribe to selectedCompany directly so we react to changes
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  // Compute companyId from selectedCompany
  const companyId = selectedCompany && selectedCompany.id !== -1 ? selectedCompany.id : null;
  // Get tenantId to ensure it's available before making API calls
  const tenantId = useTenantStore((state) => state.getTenantId());
  
  // Get menu items store
  const menuItemsStore = useMenuItemsStore();
  
  // Track the last companyId and tenantId that were used to load items
  const lastLoadedCompanyIdRef = React.useRef<number | string | null>(null);
  const lastLoadedTenantIdRef = React.useRef<string | number | null | undefined>(undefined);
  // Track if items have been loaded at least once
  const hasLoadedRef = React.useRef<boolean>(false);
  // Track current items to avoid stale closures
  const currentItemsRef = React.useRef<any[]>([]);

  useEffect(() => {
    // Wait for tenantId to be available before making API call (on non-localhost)
    // On localhost, tenantId can be undefined/null
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('localhost:')
    );
    
    if (!isLocalhost && !tenantId) {
      // On non-localhost, wait for tenantId to be available
      // Keep showing skeleton until tenantId is available
      return;
    }

    // Reset loaded state if tenantId changed (cache was cleared on tenant change)
    if (lastLoadedTenantIdRef.current !== undefined && lastLoadedTenantIdRef.current !== tenantId) {
      hasLoadedRef.current = false;
      lastLoadedCompanyIdRef.current = null;
    }

    // Only reload if companyId or tenantId changed, or if we haven't loaded yet
    const needsReload = !hasLoadedRef.current || 
                       lastLoadedCompanyIdRef.current !== companyId ||
                       lastLoadedTenantIdRef.current !== tenantId;

    if (!needsReload) {
      // CompanyId and tenantId haven't changed - ensure we have items displayed
      // Check cache in case items were cleared somehow
      const cachedItems = menuItemsStore.getMenuItems(companyId);
      if (cachedItems && cachedItems.length > 0) {
        // Ensure items are set from cache (in case state was lost)
        setItems((currentItems) => {
          if (currentItems.length === 0) {
            const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId);
            currentItemsRef.current = mapped;
            return mapped;
          }
          currentItemsRef.current = currentItems;
          return currentItems;
        });
        setIsLoading(false);
        return; // Skip reload if we have cached items
      }
      // No cache - check if we have items in state using ref (avoids stale closure)
      if (currentItemsRef.current.length > 0) {
        // We have items in state, we're good
        setIsLoading(false);
        return;
      }
      // No cache and no items - force reload by resetting hasLoadedRef
      hasLoadedRef.current = false;
      // Fall through to load items
    }

    let isMounted = true;

    async function loadMenuItems(forceFetch: boolean = false) {
      // Check cache first unless explicitly forced
      if (!forceFetch) {
        const cachedItems = menuItemsStore.getMenuItems(companyId);
        if (cachedItems && cachedItems.length > 0) {
          // Use cached items
          const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId);
          if (isMounted) {
            setItems(mapped);
            currentItemsRef.current = mapped;
            setIsLoading(false);
            lastLoadedCompanyIdRef.current = companyId;
            lastLoadedTenantIdRef.current = tenantId;
            hasLoadedRef.current = true;
          }
          return;
        }
      }

      // Cache miss or forced fetch - fetch from API
      // Always set loading when fetching (items will be preserved if they exist)
      setIsLoading(true);
      try {
        // Use apiRequest which automatically includes tenantIds and companyIds
        const response = await apiRequest<any[]>('/api/data/menu-items', {
          disableCache: true,
        });
        
        if (!response.success || !response.data) {
          if (isMounted) {
            // Preserve existing items if available, otherwise show empty
            const cachedItems = menuItemsStore.getMenuItems(companyId);
            if (cachedItems && cachedItems.length > 0) {
              const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId);
              setItems(mapped);
              currentItemsRef.current = mapped;
            } else if (currentItemsRef.current.length === 0) {
              // Only set empty if we don't have items already
              setItems([]);
              currentItemsRef.current = [];
            }
            setIsLoading(false);
          }
          return;
        }

        const rawItems = Array.isArray(response.data)
          ? response.data
          : Array.isArray((response.data as any)?.results)
          ? (response.data as any).results
          : [];

        // Store in cache
        menuItemsStore.setMenuItems(rawItems, companyId);

        const mapped = mapMenuItemsToNavigationItems(rawItems, companyId);
        if (isMounted) {
          setItems(mapped);
          currentItemsRef.current = mapped;
          setIsLoading(false);
          lastLoadedCompanyIdRef.current = companyId;
          lastLoadedTenantIdRef.current = tenantId;
          hasLoadedRef.current = true;
        }
      } catch (error) {
        // On error, preserve existing items if available
        if (isMounted) {
          const cachedItems = menuItemsStore.getMenuItems(companyId);
          if (cachedItems && cachedItems.length > 0) {
            const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId);
            setItems(mapped);
            currentItemsRef.current = mapped;
          } else if (currentItemsRef.current.length === 0) {
            // Only set empty if we don't have items already
            setItems([]);
            currentItemsRef.current = [];
          }
          setIsLoading(false);
        }
      }
    }

    loadMenuItems();

    const handleMenuItemsCleared = () => {
      // Force refetch on clear events
      currentItemsRef.current = [];
      setItems([]);
      setIsLoading(true);
      void loadMenuItems(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('menu-items-cleared', handleMenuItemsCleared);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('menu-items-cleared', handleMenuItemsCleared);
      }
    };
  }, [companyId, tenantId]); // Only depend on primitive values, not objects or store instances

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


