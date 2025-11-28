import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { AppVersion, VersionFilters, ViewMode, Priority } from '../types';

export interface UseVersionsReturn {
  versions: AppVersion[];
  loading: boolean;
  error: string | null;
  filters: VersionFilters;
  viewMode: ViewMode;
  setFilters: (filters: Partial<VersionFilters>) => void;
  setViewMode: (mode: ViewMode) => void;
  refreshVersions: () => Promise<void>;
  createVersion: (changes: AppVersion['changes'], priority: 'LOW' | 'Medium' | 'High') => Promise<AppVersion | null>;
}

export const useVersions = (): UseVersionsReturn => {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<VersionFilters>({
    search: '',
    changeType: 'all',
    priority: 'all',
    domain: 'all',
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const refreshVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.changeType && filters.changeType !== 'all') queryParams.append('changeType', filters.changeType);
      if (filters.priority && filters.priority !== 'all') queryParams.append('priority', filters.priority);
      if (filters.domain && filters.domain !== 'all') queryParams.append('domain', filters.domain);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      
      const url = `/api/app/versions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest<AppVersion[]>(url, {
        method: 'GET',
      });
      
      if (response.success && response.data) {
        setVersions(Array.isArray(response.data) ? response.data : []);
      } else {
        setError(response.error || 'Failed to fetch versions');
        setVersions([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch versions';
      setError(errorMessage);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refreshVersions();
  }, [refreshVersions]);

  const setFilters = useCallback((newFilters: Partial<VersionFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const createVersion = useCallback(async (
    changes: AppVersion['changes'],
    priority: 'LOW' | 'Medium' | 'High'
  ): Promise<AppVersion | null> => {
    try {
      setError(null);
      
      // Determine the highest priority from changes
      const highestPriority = changes.reduce((max, change) => {
        const priorityOrder: Record<Priority, number> = { LOW: 1, Medium: 2, High: 3 };
        return priorityOrder[change.priority] > priorityOrder[max] ? change.priority : max;
      }, priority);
      
      const response = await apiRequest<AppVersion>('/api/app/versions', {
        method: 'POST',
        body: {
          changes,
          priority: highestPriority,
        },
      });
      
      if (response.success && response.data) {
        await refreshVersions();
        return response.data;
      } else {
        setError(response.error || 'Failed to create version');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create version';
      setError(errorMessage);
      return null;
    }
  }, [refreshVersions]);

  return {
    versions,
    loading,
    error,
    filters,
    viewMode,
    setFilters,
    setViewMode,
    refreshVersions,
    createVersion,
  };
};

