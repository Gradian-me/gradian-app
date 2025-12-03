import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Tenant {
  id: string | number;
  name: string;
  domain?: string;
  [key: string]: any;
}

interface TenantState {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
  clearSelectedTenant: () => void;
  getTenantId: () => string | number | null;
}

export const useTenantStore = create<TenantState>()(
  devtools(
    persist(
      (set, get) => ({
        selectedTenant: null,

        setSelectedTenant: (tenant: Tenant | null) => {
          set({ selectedTenant: tenant }, false, 'setSelectedTenant');
        },

        clearSelectedTenant: () => {
          set({ selectedTenant: null }, false, 'clearSelectedTenant');
        },

        getTenantId: () => {
          const tenant = get().selectedTenant;
          if (tenant && tenant.id !== -1) {
            return tenant.id;
          }
          return null;
        },
      }),
      {
        name: 'tenant-store',
      }
    ),
    {
      name: 'tenant-store',
    }
  )
);


