import type { ApiResponse } from '@/gradian-ui/shared/types/common';
import { getIndexedDbCacheKeys } from '@/gradian-ui/shared/configs/cache-config';
import {
  readCompaniesFromCache,
  persistCompaniesToCache,
} from './companies-cache';
import type { CompanyRecord } from './types';

export interface CacheStrategyContext {
  endpoint: string;
  originalEndpoint: string;
  params?: Record<string, any>;
}

export interface CacheStrategyPreResult<T = unknown> {
  hit: boolean;
  data?: T;
  overrideEndpoint?: string;
  overrideParams?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IndexedDbCacheStrategy<T = unknown> {
  preRequest(
    context: CacheStrategyContext
  ): Promise<CacheStrategyPreResult<T> | null>;
  postRequest(
    context: CacheStrategyContext,
    response: ApiResponse<T>,
    preResult?: CacheStrategyPreResult<T> | null
  ): Promise<ApiResponse<T>>;
}

const companiesCacheStrategy: IndexedDbCacheStrategy<CompanyRecord[]> = {
  async preRequest() {
    const cacheResult = await readCompaniesFromCache();
    if (cacheResult.hit) {
      return {
        hit: true,
        data: cacheResult.companies,
      };
    }

    return {
      hit: false,
    };
  },

  async postRequest(_context, response) {
    if (!response.success || !response.data) {
      return response;
    }

    const companies = response.data as unknown as CompanyRecord[];
    if (Array.isArray(companies)) {
      await persistCompaniesToCache(companies);
    }

    return response;
  },
};

const strategyImplementations: Record<string, IndexedDbCacheStrategy<any>> = {
  companies: companiesCacheStrategy,
};

const indexedDbStrategies = getIndexedDbCacheKeys().reduce<Record<string, IndexedDbCacheStrategy<any>>>(
  (acc, key) => {
    const strategy = strategyImplementations[key];
    if (strategy) {
      acc[key] = strategy;
    }
    return acc;
  },
  {}
);

export function getIndexedDbCacheStrategy(key?: string | null): IndexedDbCacheStrategy<any> | null {
  if (!key) {
    return null;
  }
  return indexedDbStrategies[key] || null;
}


