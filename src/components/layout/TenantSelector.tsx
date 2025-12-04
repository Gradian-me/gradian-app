'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/gradian-ui/form-builder/form-elements';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { useTenantStore } from '@/stores/tenant.store';

interface Tenant {
  id: string | number;
  name: string;
  title?: string;
  domain?: string;
  [key: string]: any;
}

interface TenantSelectorProps {
  className?: string;
  placeholder?: string;
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({
  className,
  placeholder = 'Select tenant',
}) => {
  const router = useRouter();
  const { selectedTenant, setSelectedTenant } = useTenantStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiRequest<Tenant[] | { data?: Tenant[]; items?: Tenant[] }>(
          '/api/data/tenants',
          { method: 'GET' }
        );

        if (response.success && response.data) {
          const data = Array.isArray(response.data)
            ? response.data
            : ((response.data as any)?.data || (response.data as any)?.items || []);
          setTenants(data);
        } else {
          setError(response.error || 'Failed to load tenants');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load tenants';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTenants();
  }, []);

  const options = useMemo(
    () => [
      { id: 'none', label: 'None (Use Domain)' },
      ...tenants.map((tenant) => ({
        id: String(tenant.id),
        label: tenant.title || tenant.name || String(tenant.id),
      })),
    ],
    [tenants]
  );

  const currentValue = selectedTenant ? String(selectedTenant.id) : 'none';

  const handleChange = async (value: string) => {
    if (value === 'none') {
      // Clear tenant selection - will use domain from window.location.hostname
      setSelectedTenant(null);
    } else {
      const tenant = tenants.find((t) => String(t.id) === value) || null;
      if (tenant) {
        // Ensure domain is included in the tenant object
        const fullTenant: Tenant = {
          ...tenant,
          domain: tenant.domain || '',
        };
        setSelectedTenant(fullTenant);
      } else {
        setSelectedTenant(null);
      }
    }
    
    // Wait to ensure Zustand persist middleware saves to localStorage
    // Zustand persist saves synchronously, but give it a moment to ensure it's written
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Manually ensure the state is saved to localStorage
    if (typeof window !== 'undefined') {
      const store = useTenantStore.getState();
      try {
        const stateToSave = {
          state: { selectedTenant: store.selectedTenant },
          version: 0
        };
        localStorage.setItem('tenant-store', JSON.stringify(stateToSave));
      } catch (error) {
        console.warn('Failed to manually save tenant to localStorage:', error);
      }
    }
    
    // Refresh all pages when tenant changes
    router.refresh();
    // Also reload the page to ensure all components get fresh data
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className={className}>
      <Select
        options={options}
        value={currentValue}
        onValueChange={handleChange}
        placeholder={placeholder}
        config={{ name: 'tenant', label: '' }}
        error={error || undefined}
      />
    </div>
  );
};

TenantSelector.displayName = 'TenantSelector';


