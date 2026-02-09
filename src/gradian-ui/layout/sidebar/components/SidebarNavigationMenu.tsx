'use client';

import React, { useEffect, useState } from 'react';
import { SidebarNavigation } from './SidebarNavigation';
import { mapMenuItemsToNavigationItems } from '../utils';
import type { SidebarProps } from '../types';
import { SidebarSearchbox } from './SidebarSearchbox';
import { useCompanyStore } from '@/stores/company.store';
import { useMenuItemsStore } from '@/stores/menu-items.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useUserStore } from '@/stores/user.store';
import { useLanguageStore } from '@/stores/language.store';
import { getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { SidebarNavigationDynamic } from './SidebarNavigationDynamic';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import type { NavigationItem } from '../types';

type SidebarNavigationMenuProps = Pick<
  SidebarProps,
  'isCollapsed' | 'isMobile' | 'navigationSchemas'
>;

export const SidebarNavigationMenu: React.FC<SidebarNavigationMenuProps> = ({
  isCollapsed,
  isMobile,
  navigationSchemas,
}) => {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();

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
  const currentItemsRef = React.useRef<NavigationItem[]>([]);

  useEffect(() => {
    // Wait for tenantId to be available before making API call (on non-localhost)
    // On localhost, tenantId can be undefined/null
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('localhost:')
    );
    
    if (!isLocalhost && !tenantId) {
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
        const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant);
        setItems(mapped);
        currentItemsRef.current = mapped;
        return;
      }
      if (currentItemsRef.current.length > 0) {
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
          const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant, language);
          if (isMounted) {
            setItems(mapped);
            currentItemsRef.current = mapped;
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
            const cachedItems = menuItemsStore.getMenuItems(companyId);
            if (cachedItems && cachedItems.length > 0) {
              const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant, language);
              setItems(mapped);
              currentItemsRef.current = mapped;
            } else {
              setItems([]);
              currentItemsRef.current = [];
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

        const mapped = mapMenuItemsToNavigationItems(rawItems, companyId, isLocalTenant, language);
        if (isMounted) {
          setItems(mapped);
          currentItemsRef.current = mapped;
          lastLoadedCompanyIdRef.current = companyId;
          lastLoadedTenantIdRef.current = tenantId;
          lastLoadedUserIdRef.current = userId;
          hasLoadedRef.current = true;
        }
      } catch (error) {
        if (isMounted) {
          const cachedItems = menuItemsStore.getMenuItems(companyId);
          if (cachedItems && cachedItems.length > 0) {
            const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant);
            setItems(mapped);
            currentItemsRef.current = mapped;
          } else {
            setItems([]);
            currentItemsRef.current = [];
          }
        }
      }
    }

    loadMenuItems();

    const handleMenuItemsCleared = () => {
      currentItemsRef.current = [];
      setItems([]);
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
  }, [companyId, tenantId, userId, isLocalTenant, language]); // Re-run when language changes so titles are re-mapped

  // When language changes, re-map cached menu items so titles update without refetch
  useEffect(() => {
    const cachedItems = useMenuItemsStore.getState().getMenuItems(companyId);
    if (!cachedItems || cachedItems.length === 0) return;
    const mapped = mapMenuItemsToNavigationItems(cachedItems, companyId, isLocalTenant, language);
    setItems(mapped);
    currentItemsRef.current = mapped;
  }, [language, companyId, isLocalTenant]);

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


