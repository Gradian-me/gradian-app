import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { sanitizeNestedData } from '@/gradian-ui/shared/utils/security.util';
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';

interface MenuItem {
  id: string;
  menuTitle?: string;
  menuUrl?: string;
  menuIcon?: string;
  companies?: Array<{ id: string | number; [key: string]: any }>;
  [key: string]: any;
}

interface MenuItemsState {
  menuItems: MenuItem[];
  lastFetched: number | null;
  companyId: string | number | null;
  setMenuItems: (items: MenuItem[], companyId: string | number | null) => void;
  clearMenuItems: () => void;
  getMenuItems: (companyId: string | number | null) => MenuItem[] | null;
  isStale: (maxAge?: number) => boolean; // Check if cache is stale (default: 5 minutes)
}

const DEFAULT_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useMenuItemsStore = create<MenuItemsState>()(
  devtools(
    persist(
      (set, get) => ({
        menuItems: [],
        lastFetched: null,
        companyId: null,

        setMenuItems: (items: MenuItem[], companyId: string | number | null) => {
          // Sanitize menu items data before storing
          const sanitizedItems = items.map(item => sanitizeNestedData(item));
          set(
            {
              menuItems: sanitizedItems,
              lastFetched: Date.now(),
              companyId,
            },
            false,
            'setMenuItems'
          );
        },

        clearMenuItems: () => {
          set(
            {
              menuItems: [],
              lastFetched: null,
              companyId: null,
            },
            false,
            'clearMenuItems'
          );
        },

        getMenuItems: (companyId: string | number | null) => {
          const state = get();
          // Return cached items only if:
          // 1. We have items cached
          // 2. The companyId matches (or both are null)
          // Note: we intentionally ignore staleness here to avoid unnecessary refetches.
          if (
            state.menuItems.length > 0 &&
            state.companyId === companyId
          ) {
            return state.menuItems;
          }
          return null;
        },

        isStale: (maxAge: number = DEFAULT_CACHE_MAX_AGE) => {
          const state = get();
          if (!state.lastFetched) {
            return true;
          }
          const age = Date.now() - state.lastFetched;
          return age > maxAge;
        },
      }),
      {
        name: 'menu-items-store',
      }
    ),
    getZustandDevToolsConfig<MenuItemsState>('menu-items-store')
  )
);

