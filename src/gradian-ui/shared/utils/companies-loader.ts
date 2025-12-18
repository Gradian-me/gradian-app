// Companies Loader Utility - SERVER SIDE ONLY
// Loads companies from repository directly with caching
// This file is server-only and can only be imported in server components

import 'server-only';

import { BaseRepository } from '@/gradian-ui/shared/domain/repositories/base.repository';
import { BaseEntity } from '@/gradian-ui/shared/domain/types/base.types';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

const COMPANIES_ROUTE_KEY = 'companies';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cache storage
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let cachedCompanies: CacheEntry<any[]> | null = null;
let fetchPromise: Promise<any[]> | null = null;
const CACHE_INSTANCE_ID = Math.random().toString(36).substring(7);

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (cachedCompanies === null) {
    return false;
  }

  const now = Date.now();
  const cacheAge = now - cachedCompanies.timestamp;
  
  return cacheAge < CACHE_TTL;
}

/**
 * Clear the companies cache (useful for testing or manual cache invalidation)
 */
export function clearCompaniesCache(): void {
  cachedCompanies = null;
  fetchPromise = null;
  loggingCustom(LogType.SCHEMA_LOADER, 'info', `🗑️ [${CACHE_INSTANCE_ID}] Cache cleared for companies`);
}

/**
 * Load all companies from repository directly (with caching)
 * @returns Array of company objects
 */
export async function loadAllCompanies(): Promise<any[]> {
  // Return cached data if available and valid
  if (isCacheValid() && cachedCompanies !== null) {
    const cacheAge = Date.now() - cachedCompanies.timestamp;
    loggingCustom(LogType.SCHEMA_LOADER, 'info', `✅ CACHE HIT [${CACHE_INSTANCE_ID}] - Returning cached companies (age: ${Math.round(cacheAge / 1000)}s)`);
    return cachedCompanies.data;
  }

  // If there's already a fetch in progress, wait for it instead of starting a new one
  if (fetchPromise) {
    loggingCustom(LogType.SCHEMA_LOADER, 'info', `⏳ [${CACHE_INSTANCE_ID}] Fetch already in progress for companies, waiting for existing request...`);
    return await fetchPromise;
  }
  
  loggingCustom(LogType.SCHEMA_LOADER, 'info', `🔄 CACHE MISS [${CACHE_INSTANCE_ID}] - Loading companies from repository...`);

  // Create a promise and store it to prevent concurrent fetches
  fetchPromise = (async () => {
    try {
      const startTime = Date.now();
      
      // Load directly from repository (bypasses API)
      const repository = new BaseRepository<BaseEntity>('companies');
      const companies = await repository.findAll();
      
      const fetchTime = Date.now() - startTime;

      // Update cache
      cachedCompanies = {
        data: companies,
        timestamp: Date.now(),
      };

      loggingCustom(LogType.SCHEMA_LOADER, 'info', `📥 [${CACHE_INSTANCE_ID}] LOADED from repository (${fetchTime}ms) - Cached ${companies.length} companies`);

      return companies;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggingCustom(LogType.SCHEMA_LOADER, 'error', `Error loading companies from repository: ${errorMessage}`);

      // If cache exists and load fails, return cached data as fallback
      if (cachedCompanies !== null) {
        loggingCustom(LogType.SCHEMA_LOADER, 'warn', 'Repository load failed for companies, using cached data');
        return cachedCompanies.data;
      }

      // No cache available, return empty array
      cachedCompanies = {
        data: [],
        timestamp: Date.now(),
      };
      return [];
    } finally {
      // Clear the promise cache after fetch completes (success or failure)
      fetchPromise = null;
    }
  })();

  return await fetchPromise;
}

/**
 * Get a single company by ID (uses cache if available)
 * @param companyId - The ID of the company to get
 * @returns The company or null if not found
 */
export async function loadCompanyById(companyId: string): Promise<any | null> {
  // First try to find in cache
  const companies = await loadAllCompanies();
  const company = companies.find((c: any) => c.id === companyId || String(c.id) === companyId);

  if (company) {
    return company;
  }
  
  // Fallback: if not in cache, try direct repository call
  try {
    const repository = new BaseRepository<BaseEntity>('companies');
    const companyEntity = await repository.findById(companyId);
    
    if (companyEntity) {
      // Update cache with this company if cache exists
      if (cachedCompanies !== null && Array.isArray(cachedCompanies.data)) {
        const exists = cachedCompanies.data.find((c: any) => c.id === companyId || String(c.id) === companyId);
        if (!exists) {
          cachedCompanies.data.push(companyEntity);
          cachedCompanies.timestamp = Date.now();
        }
      }
      return companyEntity;
    }
  } catch (error) {
    loggingCustom(LogType.SCHEMA_LOADER, 'error', `Error loading company ${companyId} from repository: ${error}`);
  }
  
  return null;
}

