'use client';

import React, { useEffect, useState } from 'react';
import { SidebarNavigation } from './SidebarNavigation';
import { mapMenuItemsToNavigationItems } from '../utils';
import type { SidebarProps } from '../types';
import { useCompanyStore } from '@/stores/company.store';

type SidebarNavigationMenuProps = Pick<
  SidebarProps,
  'isCollapsed' | 'isMobile' | 'navigationSchemas'
>;

export const SidebarNavigationMenu: React.FC<SidebarNavigationMenuProps> = ({
  isCollapsed,
  isMobile,
  navigationSchemas,
}) => {
  const [items, setItems] = useState<any[]>([]);
  // Subscribe to selectedCompany directly so we react to changes
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  // Compute companyId from selectedCompany
  const companyId = selectedCompany && selectedCompany.id !== -1 ? selectedCompany.id : null;

  useEffect(() => {
    let isMounted = true;

    async function loadMenuItems() {
      try {
        const res = await fetch('/api/data/menu-items');
        if (!res.ok) return;
        const json = await res.json();
        const rawItems = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.results)
          ? json.results
          : [];

        const mapped = mapMenuItemsToNavigationItems(rawItems, companyId);
        if (isMounted) {
          setItems(mapped);
        }
      } catch {
        // Silently ignore errors and leave items as-is
      }
    }

    loadMenuItems();

    return () => {
      isMounted = false;
    };
  }, [companyId, selectedCompany]);

  return (
    <SidebarNavigation
      items={items}
      isCollapsed={isCollapsed}
      isMobile={isMobile}
      navigationSchemas={navigationSchemas}
    />
  );
};

SidebarNavigationMenu.displayName = 'SidebarNavigationMenu';


