'use client';

import React, { useEffect, useState } from 'react';
import { SidebarNavigation } from './SidebarNavigation';
import { mapMenuItemsToNavigationItems, FALLBACK_HOME_MENU_ITEM } from '../utils';
import type { SidebarProps } from '../types';
import { SidebarSearchbox } from './SidebarSearchbox';
import { useCompanyStore } from '@/stores/company.store';
import { useMenuItemsStore } from '@/stores/menu-items.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useUserStore } from '@/stores/user.store';
import { SidebarNavigationDynamic } from './SidebarNavigationDynamic';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import type { NavigationItem } from '../types';

type SidebarNavigationMenuProps = Pick<
  SidebarProps,
  'isCollapsed' | 'isMobile' | 'navigationSchemas'
>;

/**
 * Merge menu items with home button, ensuring home is always first and no duplicates
 */
function mergeItemsWithHome(menuItems: NavigationItem[]): NavigationItem[] {
  // Filter out any existing home item from menuItems to avoid duplicates
  const otherItems = menuItems.filter(item => item.id !== FALLBACK_HOME_MENU_ITEM.id);
  // Always put home first
  return [FALLBACK_HOME_MENU_ITEM, ...otherItems];
}

export const SidebarNavigationMenu: React.FC<SidebarNavigationMenuProps> = ({
  isCollapsed,
  isMobile,
  navigationSchemas,
}) => {
  // Initialize with home button immediately
  const [items, setItems] = useState<NavigationItem[]>([FALLBACK_HOME_MENU_ITEM]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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
  // Get selectedTenant to check if tenant name is "local"
  const selectedTenant = useTenantStore((state) => state.selectedTenant);
  // Check if tenant name is "local" - if so, show all menu items
  // Use useMemo to ensure stable boolean value (always returns boolean, never undefined)
  const tenantName = selectedTenant?.name;
  const isLocalTenant = React.useMemo(() => {
    return Boolean(tenantName?.toLowerCase() === 'local');
  }, [tenantName]);
  // Get user to detect login state changes
  const user = useUserStore((state) => state.user);
  const userId = user?.id ?? null;
  
  // Get menu items store
  const menuItemsStore = useMenuItemsStore();
  
  // Track the last companyId and tenantId that were used to load items
  const lastLoadedCompanyIdRef = React.useRef<number | string | null>(null);
  const lastLoadedTenantIdRef = React.useRef<string | number | null | undefined>(undefined);
  const lastLoadedUserIdRef = React.useRef<string | number | null>(null);
  // Track if items have been loaded at least once
  const hasLoadedRef = React.useRef<boolean>(false);
  // Track current items to avoid stale closures
  const currentItemsRef = React.useRef<NavigationItem[]>([FALLBACK_HOME_MENU_ITEM]);

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
      // Home button is already shown, so we can wait
      return;
    }

    // Reset loaded state if tenantId changed (cache was cleared on tenant change)
    if (lastLoadedTenantIdRef.current !== undefined && lastLoadedTenantIdRef.current !== tenantId) {
      hasLoadedRef.current = false;
      lastLoadedCompanyIdRef.current = null;
    }

    // Reset loaded state if userId changed (user logged in/out)
    if (lastLoadedUserIdRef.current !== userId) {
      // If user just logged in (was null, now is not null), force reload
      if (userId !== null && lastLoadedUserIdRef.current === null) {
        hasLoadedRef.current = false;
        lastLoadedCompanyIdRef.current = null;
        lastLoadedTenantIdRef.current = undefined;
      }
      lastLoadedUserIdRef.current = userId;
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
          if (currentItems.length === 1 && currentItems[0].id === FALLBACK_HOME_MENU_ITEM.id) {
            const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant);
            const merged = mergeItemsWithHome(mapped);
            currentItemsRef.current = merged;
            return merged;
          }
          currentItemsRef.current = currentItems;
          return currentItems;
        });
        return; // Skip reload if we have cached items
      }
      // No cache - check if we have items in state using ref (avoids stale closure)
      if (currentItemsRef.current.length > 1) {
        // We have items in state (more than just home), we're good
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
          const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant);
          if (isMounted) {
            const merged = mergeItemsWithHome(mapped);
            setItems(merged);
            currentItemsRef.current = merged;
            lastLoadedCompanyIdRef.current = companyId;
            lastLoadedTenantIdRef.current = tenantId;
            lastLoadedUserIdRef.current = userId;
            hasLoadedRef.current = true;
          }
          return;
        }
      }

      // Cache miss or forced fetch - fetch from API
      try {
        // Use apiRequest which automatically includes tenantIds and companyIds
        // When tenant is "local", pass special callerName to skip tenant/company filtering
        const response = await apiRequest<any[]>('/api/data/menu-items', {
          disableCache: true,
          callerName: isLocalTenant ? 'SidebarNavigationMenuLocal' : 'SidebarNavigationMenu',
        });
        
        if (!response.success || !response.data) {
          if (isMounted) {
            // Preserve existing items if available, otherwise keep home button
            const cachedItems = menuItemsStore.getMenuItems(companyId);
            if (cachedItems && cachedItems.length > 0) {
              const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant);
              const merged = mergeItemsWithHome(mapped);
              setItems(merged);
              currentItemsRef.current = merged;
            } else {
              // No cached items - ensure home button is shown
              setItems([FALLBACK_HOME_MENU_ITEM]);
              currentItemsRef.current = [FALLBACK_HOME_MENU_ITEM];
            }
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

        const mapped = mapMenuItemsToNavigationItems(rawItems, companyId, isLocalTenant);
        if (isMounted) {
          const merged = mergeItemsWithHome(mapped);
          setItems(merged);
          currentItemsRef.current = merged;
          lastLoadedCompanyIdRef.current = companyId;
          lastLoadedTenantIdRef.current = tenantId;
          lastLoadedUserIdRef.current = userId;
          hasLoadedRef.current = true;
        }
      } catch (error) {
        // On error, preserve existing items if available, otherwise keep home button
        if (isMounted) {
          const cachedItems = menuItemsStore.getMenuItems(companyId);
          if (cachedItems && cachedItems.length > 0) {
            const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant);
            const merged = mergeItemsWithHome(mapped);
            setItems(merged);
            currentItemsRef.current = merged;
          } else {
            // No cached items - ensure home button is shown
            setItems([FALLBACK_HOME_MENU_ITEM]);
            currentItemsRef.current = [FALLBACK_HOME_MENU_ITEM];
          }
        }
      }
    }

    loadMenuItems();

    const handleMenuItemsCleared = () => {
      // Force refetch on clear events, but keep home button
      currentItemsRef.current = [FALLBACK_HOME_MENU_ITEM];
      setItems([FALLBACK_HOME_MENU_ITEM]);
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
  }, [companyId, tenantId, userId, isLocalTenant]); // Include userId and isLocalTenant to detect changes

  // Always render navigation - never show skeleton, home button is always available
  return (
    <>
      <SidebarSearchbox
        value={searchQuery}
        onChange={setSearchQuery}
        isCollapsed={isCollapsed}
        isMobile={isMobile ?? false}
      />
      <SidebarNavigation
        items={items}
        isCollapsed={isCollapsed}
        isMobile={isMobile ?? false}
        navigationSchemas={navigationSchemas}
        searchQuery={searchQuery}
      />
    </>
  );
};

SidebarNavigationMenu.displayName = 'SidebarNavigationMenu';


