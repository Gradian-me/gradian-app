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
  tenants: Tenant[];
  setTenants: (tenants: Tenant[]) => void;
  clearTenants: () => void;
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
  clearSelectedTenant: () => void;
  getTenantId: () => string | number | null;
}

export const useTenantStore = create<TenantState>()(
  devtools(
    persist(
      (set, get) => ({
        tenants: [],

        setTenants: (tenants: Tenant[]) => {
          const sanitizedTenants = Array.isArray(tenants)
            ? (sanitizeNestedData(tenants) as Tenant[])
            : [];
          set({ tenants: sanitizedTenants }, false, 'setTenants');
        },

        clearTenants: () => {
          set({ tenants: [] }, false, 'clearTenants');
        },

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


