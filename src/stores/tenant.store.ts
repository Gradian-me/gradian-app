import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { sanitizeNestedData } from '@/gradian-ui/shared/utils/security.util';
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';

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
          // Sanitize tenant data before storing
          const sanitizedTenant = tenant ? sanitizeNestedData(tenant) : null;
          set({ selectedTenant: sanitizedTenant }, false, 'setSelectedTenant');
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
    getZustandDevToolsConfig<TenantState>('tenant-store')
  )
);


