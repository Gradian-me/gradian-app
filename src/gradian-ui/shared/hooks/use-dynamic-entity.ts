// Dynamic Entity Hook
// Generic hook for managing any entity based on schema

import { useState, useCallback } from 'react';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { apiRequest } from '../utils/api';
import { useCompanyStore } from '@/stores/company.store';
import { PaginationMeta } from '../utils/pagination-utils';
import { ApiResponse } from '../types/common';

interface EntityFilters {
  search?: string;
  status?: string;
  category?: string;
  companyId?: string; // Backward compatibility - single company ID
  companyIds?: string[]; // Array of company IDs for filtering by multiple companies
}

interface EntityState<T = any> {
  entities: T[];
  currentEntity: T | null;
  isLoading: boolean;
  error: string | null;
  selectedEntity: T | null;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isModalOpen: boolean;
  modalTitle: string;
  currentFilters: EntityFilters;
  formState: {
    values: any;
    setValue: (field: string, value: any) => void;
    reset: () => void;
  };
}

export function useDynamicEntity<T = any>(schema: FormSchema) {
  const { getCompanyId } = useCompanyStore();
  const [entities, setEntities] = useState<T[]>([]);
  const [currentEntity, setCurrentEntity] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with true for initial load
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<EntityFilters>({});
  const [formValues, setFormValues] = useState<any>({});
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  // Use the new dynamic API route
  const apiEndpoint = `/api/data/${schema.id}`;

  // Fetch all entities
  const fetchEntities = useCallback(async (
    filters?: EntityFilters, 
    options?: { 
      disableCache?: boolean;
      page?: number;
      limit?: number | 'all';
    }
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.category) queryParams.append('category', filters.category);
      
      // Handle companyIds - send as comma-separated string (companyIds=id1,id2)
      if (filters?.companyIds && Array.isArray(filters.companyIds) && filters.companyIds.length > 0) {
        // Join array into comma-separated string
        queryParams.append('companyIds', filters.companyIds.map(id => String(id)).join(','));
      } else if (filters?.companyId) {
        // Backward compatibility: Handle single companyId
        queryParams.append('companyId', filters.companyId);
      }
      
      // Add pagination parameters (skip if limit is 'all')
      if (options?.page !== undefined && options?.limit !== 'all') {
        queryParams.append('page', String(options.page));
      }
      if (options?.limit !== undefined && options?.limit !== 'all') {
        queryParams.append('limit', String(options.limit));
      }
      
      const url = queryParams.toString() 
        ? `${apiEndpoint}?${queryParams.toString()}`
        : apiEndpoint;
      
      const response = await apiRequest<T[]>(url, {
        disableCache: options?.disableCache,
      });
      
      if (response.success && response.data) {
        setEntities(response.data);
        // Extract pagination metadata from response if available
        // The API response may include a meta property even though ApiResponse type doesn't include it
        const responseWithMeta = response as ApiResponse<T[]> & { meta?: PaginationMeta };
        if (responseWithMeta.meta && typeof responseWithMeta.meta === 'object') {
          setPaginationMeta(responseWithMeta.meta);
        } else {
          setPaginationMeta(null);
        }
        return { success: true as const, meta: responseWithMeta.meta };
      } else {
        const errorMessage = response.error || 'Failed to fetch entities';
        setError(errorMessage);
        return { success: false as const, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch entities';
      setError(errorMessage);
      return { success: false as const, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint]);

  // Fetch entity by ID
  const fetchEntityById = useCallback(async (id: string): Promise<T | null> => {
    try {
      const response = await apiRequest<T>(`${apiEndpoint}/${id}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return null;
    } catch (err) {
      console.error('Failed to fetch entity:', err);
      return null;
    }
  }, [apiEndpoint]);

  // Create entity
  const createEntity = useCallback(async (data: Partial<T>) => {
    try {
      // Automatically add companyId from store if not already present
      const enrichedData = { ...data } as any;
      if (!enrichedData.companyId) {
        const companyId = getCompanyId();
        if (companyId !== null && companyId !== -1) {
          enrichedData.companyId = String(companyId);
        }
      }
      
      const response = await apiRequest<T>(apiEndpoint, {
        method: 'POST',
        body: enrichedData,
      });
      
      if (response.success && response.data) {
        setEntities(prev => [...prev, response.data as T]);
        return { success: true, data: response.data };
      }
      
      return { success: false, error: response.error || 'Failed to create entity' };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create entity' 
      };
    }
  }, [apiEndpoint, getCompanyId]);

  // Update entity
  const updateEntity = useCallback(async (id: string, data: Partial<T>) => {
    try {
      const response = await apiRequest<T>(`${apiEndpoint}/${id}`, {
        method: 'PUT',
        body: data,
      });
      
      if (response.success && response.data) {
        setEntities(prev => 
          prev.map(entity => 
            (entity as any).id === id ? response.data as T : entity
          )
        );
        return { success: true, data: response.data };
      }
      
      return { success: false, error: response.error || 'Failed to update entity' };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update entity' 
      };
    }
  }, [apiEndpoint]);

  // Delete entity
  const deleteEntity = useCallback(async (id: string) => {
    try {
      const response = await apiRequest(`${apiEndpoint}/${id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        setEntities(prev => prev.filter(entity => (entity as any).id !== id));
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Failed to delete entity' };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete entity' 
      };
    }
  }, [apiEndpoint]);

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setSelectedEntity(null);
    setIsCreateModalOpen(true);
    setIsEditModalOpen(false);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setSelectedEntity(null);
    setFormValues({});
  }, []);

  const openEditModal = useCallback((entity: T) => {
    setSelectedEntity(entity);
    setCurrentEntity(entity);
    // Set form values to entity data for form population
    setFormValues(entity as any);
    setIsEditModalOpen(true);
    setIsCreateModalOpen(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedEntity(null);
    setCurrentEntity(null);
    setFormValues({});
  }, []);

  // Filter handlers
  const setFilters = useCallback((filters: EntityFilters) => {
    setCurrentFilters(filters);
  }, []);

  const handleSearch = useCallback((search: string) => {
    setCurrentFilters(prev => ({ ...prev, search }));
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setCurrentFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Entity action handlers
  const handleEditEntity = useCallback((entity: T) => {
    openEditModal(entity);
  }, [openEditModal]);

  const handleDeleteEntity = useCallback(async (entity: any) => {
    const id = entity.id;
    // Note: Confirmation should be handled by the calling component
    // This function just executes the delete
    await deleteEntity(id);
  }, [deleteEntity]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Form state management
  const formState = {
    values: formValues,
    setValue: (field: string, value: any) => {
      setFormValues((prev: any) => ({ ...prev, [field]: value }));
    },
    reset: () => {
      setFormValues({});
    },
  };

  const isModalOpen = isCreateModalOpen || isEditModalOpen;
  const modalTitle = isCreateModalOpen 
    ? `Create New ${schema.singular_name || 'Entity'}`
    : `Edit ${schema.singular_name || 'Entity'}`;

  return {
    entities,
    currentEntity,
    isLoading,
    error,
    selectedEntity,
    isCreateModalOpen,
    isEditModalOpen,
    isModalOpen,
    modalTitle,
    currentFilters,
    formState,
    paginationMeta,
    fetchEntities,
    fetchEntityById,
    createEntity,
    updateEntity,
    deleteEntity,
    setFilters,
    setCurrentEntity,
    clearError,
    handleSearch,
    handleFilterChange,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    handleEditEntity,
    handleDeleteEntity,
  };
}

