'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { getCacheConfigByPath } from '@/gradian-ui/shared/configs/cache-config';
import {
  persistCompaniesToCache,
  readCompaniesFromCache,
  subscribeToCompaniesCache,
} from '@/gradian-ui/indexdb-manager';
import type { CompanyRecord } from '@/gradian-ui/indexdb-manager/types';
import { resolveLocalizedField } from '@/gradian-ui/shared/utils/localization';

interface Company {
  id: string | number;
  name: string;
  logo?: string;
  [key: string]: any;
}

/**
 * Hook to fetch companies with client-side caching using React Query
 * This deduplicates requests and shares cache across all components
 * Uses the QueryClient from QueryClientProvider context automatically
 */
export function useCompanies() {
  const cacheConfig = getCacheConfigByPath('/api/data/companies');
  const [cachedCompanies, setCachedCompanies] = useState<Company[] | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const hydrateFromCache = async () => {
      try {
        const result = await readCompaniesFromCache();
        if (!isMounted || !result.companies?.length) {
          return;
        }

        const allCompaniesOption: Company = { id: -1, name: 'All Companies' };
        setCachedCompanies([
          allCompaniesOption,
          ...result.companies.map(normalizeCompanyRecord),
        ]);
      } catch (error) {
        console.warn('[useCompanies] Failed to read companies cache', error);
      }
    };

    hydrateFromCache();
    const unsubscribe = subscribeToCompaniesCache(() => {
      hydrateFromCache();
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await apiRequest<CompanyRecord[]>('/api/data/companies');
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch companies');
      }

      const normalized = response.data.map(normalizeCompanyRecord);

      try {
        await persistCompaniesToCache(normalized);
      } catch (cacheError) {
        console.warn('[useCompanies] Failed to persist companies cache', cacheError);
      }
      
      const allCompaniesOption: Company = {
        id: -1,
        name: 'All Companies'
      };
      
      return [allCompaniesOption, ...normalized];
    },
    initialData: cachedCompanies,
    staleTime: cacheConfig.staleTime ?? 15 * 60 * 1000,
    gcTime: cacheConfig.gcTime ?? 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const companies = data ?? cachedCompanies ?? [];
  const hasCachedCompanies = Boolean(!data && cachedCompanies?.length);
  const isInitialLoading = isLoading && companies.length === 0;

  return {
    companies,
    isLoading: isInitialLoading,
    isHydratingFromCache: hasCachedCompanies,
    error,
    refetch,
  };
}

function normalizeCompanyRecord(company: CompanyRecord): Company {
  if (!company) {
    return { id: 'unknown', name: 'Untitled company' };
  }

  const trimmedName = deriveCompanyName(company);
  return {
    ...company,
    name: trimmedName || 'Untitled company',
  };
}

function deriveCompanyName(company?: CompanyRecord | null): string {
  if (!company) {
    return 'Untitled company';
  }

  const candidateValues = [
    company.name,
    (company as any)?.companyTitle,
    (company as any)?.label,
    (company as any)?.title,
    (company as any)?.companyName,
    (company as any)?.company_name,
    (company as any)?.displayName,
    (company as any)?.metadata?.name,
    (company as any)?.profile?.name,
  ];

  for (const value of candidateValues) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    const resolved = resolveLocalizedField(value, 'en', 'en');
    if (resolved && resolved.trim().length > 0) {
      return resolved.trim();
    }
  }

  if (company.abbreviation && typeof company.abbreviation === 'string') {
    return company.abbreviation.trim();
  }

  if (company.id !== undefined && company.id !== null) {
    const idString = String(company.id);
    if (idString.trim()) {
      return `Company ${idString.slice(-4)}`;
    }
  }

  return 'Untitled company';
}

