'use client';

// Schema to Store Utility
// Generates UI state management hooks from FormSchema

import { useState, useCallback, useMemo } from 'react';
import { useFormState } from '../../shared/hooks';
import { FormSchema } from '../types/form-schema';
import { 
  generateValidationRulesFromForm, 
  extractInitialValuesFromForm 
} from './schema-to-zod';

/**
 * Generic modal state management
 */
export interface ModalState {
  isOpen: boolean;
  isEditMode: boolean;
  title: string;
  close: () => void;
}

/**
 * Generic form context for a domain entity
 */
export interface EntityFormContext<T = any> {
  formState: ReturnType<typeof useFormState>;
  modalState: ModalState;
  selectedEntity: T | null;
  openCreateModal: () => void;
  closeModal: () => void;
  openEditModal: (entity: T) => void;
  populateForm: (entity: T) => void;
}

/**
 * Generic list filter state
 */
export interface ListFilterState {
  searchTerm: string;
  filters: Record<string, any>;
  setSearchTerm: (term: string) => void;
  setFilter: (key: string, value: any) => void;
  resetFilters: () => void;
  currentFilters: Record<string, any>;
}

/**
 * Creates a generic UI hook for CRUD operations
 */
export const createEntityUIHook = <T extends Record<string, any>>(
  entityName: string,
  schema: FormSchema,
  config?: {
    createTitle?: string;
    editTitle?: string;
    basePath?: string;
    onDelete?: (entity: T) => void;
    onView?: (entity: T) => void;
    customFilters?: Record<string, { type: 'all' | string; options?: any[] }>;
  }
) => {
  // This function returns a React hook
  return function useHook() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [filterStates, setFilterStates] = useState<Record<string, any>>({});

    // Get initial values and validation rules from schema
    const initialValues = extractInitialValuesFromForm(schema);
    const validationRules = generateValidationRulesFromForm(schema);

    // Form state management
    const formState = useFormState(initialValues, validationRules);

    // Initialize custom filters
    if (config?.customFilters) {
      Object.keys(config.customFilters).forEach(key => {
        if (!filterStates[key]) {
          filterStates[key] = 'all';
        }
      });
    }

    // Search handler
    const handleSearch = useCallback((query: string) => {
      setSearchTerm(query);
    }, []);

    // Filter handler
    const handleFilterChange = useCallback((key: string, value: any) => {
      setFilterStates(prev => ({ ...prev, [key]: value }));
    }, []);

    // Reset filters
    const resetFilters = useCallback(() => {
      setSearchTerm('');
      setFilterStates({});
      if (config?.customFilters) {
        Object.keys(config.customFilters).forEach(key => {
          setFilterStates(prev => ({ ...prev, [key]: 'all' }));
        });
      }
    }, [config?.customFilters]);

    // Populate form with entity data (auto-generated from schema)
    const populateForm = useCallback((entity: T) => {
      schema.sections.forEach(section => {
        // Get fields for this section
        const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
        
        if (section.isRepeatingSection) {
          // Handle repeating sections
          const sectionData = entity[section.id];
          if (Array.isArray(sectionData)) {
            formState.setValue(section.id, sectionData);
          }
        } else {
          // Handle regular fields
          sectionFields.forEach(field => {
            const value = entity[field.name];
            if (value !== undefined) {
              formState.setValue(field.name, value);
            }
          });
        }
      });
    }, [schema, formState.setValue]);

    // Open create modal
    const openCreateModal = useCallback(() => {
      setIsCreateModalOpen(true);
      formState.reset();
    }, [formState]);

    // Close modal
    const closeModal = useCallback(() => {
      setIsCreateModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedEntity(null);
      formState.reset();
    }, [formState]);

    // Open edit modal
    const openEditModal = useCallback((entity: T) => {
      setSelectedEntity(entity);
      setIsEditModalOpen(true);
      populateForm(entity);
    }, [populateForm]);

    // Computed values
    const currentFilters = useMemo(() => {
      const filters: Record<string, any> = { search: searchTerm };
      
      // Add custom filters
      Object.entries(filterStates).forEach(([key, value]) => {
        if (value !== 'all' && value !== undefined && value !== null) {
          filters[key] = value;
        }
      });
      
      return filters;
    }, [searchTerm, filterStates]);

    const isModalOpen = isCreateModalOpen || isEditModalOpen;
    const modalTitle = isCreateModalOpen 
      ? (config?.createTitle || `Create New ${entityName}`)
      : (config?.editTitle || `Edit ${entityName}`);

    // Action handlers
    const handleViewEntity = useCallback((entity: T) => {
      if (config?.basePath) {
        window.location.href = `/${config.basePath}/${entity.id}`;
      } else if (config?.onView) {
        config.onView(entity);
      }
    }, [config]);

    const handleDeleteEntity = useCallback((entity: T) => {
      if (config?.onDelete) {
        config.onDelete(entity);
      } else {
        const confirmed = window.confirm(
          `Are you sure you want to delete ${entity.name || entity.title || 'this item'}?`
        );
        if (process.env.NODE_ENV === 'development' && confirmed) {
          // Default delete behavior
          console.log(`Delete ${entityName}:`, entity.id);
        }
      }
    }, [config, entityName]);

    // Auto-generate entity-specific handler names
    const entityNameLower = entityName.toLowerCase();
    
    // Build return object with dynamic properties
    const returnValue: any = {
      // State
      searchTerm,
      filterStates,
      selectedEntity,
      isCreateModalOpen,
      isEditModalOpen,
      isModalOpen,
      modalTitle,
      currentFilters,

      // Form state
      formState,

      // Handlers
      handleSearch,
      handleFilterChange,
      resetFilters,
      openCreateModal,
      closeModal,
      closeCreateModal: closeModal,
      closeEditModal: closeModal,
      openEditModal,
      handleViewEntity,
      handleDeleteEntity,

      // Helpers
      populateForm,
    };

    // Auto-generate entity-specific handler names (e.g., handleViewVendor, handleEditVendor, handleDeleteVendor for entityName="Vendor")
    returnValue[`handleView${entityName}`] = handleViewEntity;
    returnValue[`handleEdit${entityName}`] = openEditModal;
    returnValue[`handleDelete${entityName}`] = handleDeleteEntity;

    // Auto-generate filter state for common filter names (always add them)
    if (filterStates.status !== undefined) {
      returnValue.filterStatus = filterStates.status;
    }
    if (filterStates.category !== undefined) {
      returnValue.filterCategory = filterStates.category;
    }
    
    return returnValue;
  };
};

// Remove the duplicate createEntityUIHook at the end

/**
 * Generates filter state for a list with common filter types
 */
export const useListFilters = <T extends Record<string, any>>(
  initialFilters: Record<string, { type: 'all' | string; options?: any[] }> = {}
) => {
  const [filters, setFilters] = useState<Record<string, any>>(
    Object.keys(initialFilters).reduce((acc, key) => {
      acc[key] = initialFilters[key].type;
      return acc;
    }, {} as Record<string, any>)
  );

  const [searchTerm, setSearchTerm] = useState('');

  const setFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(
      Object.keys(initialFilters).reduce((acc, key) => {
        acc[key] = initialFilters[key].type;
        return acc;
      }, {} as Record<string, any>)
    );
    setSearchTerm('');
  }, [initialFilters]);

  const currentFilters = useMemo(() => {
    const result: Record<string, any> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result[key] = value;
      }
    });
    
    if (searchTerm) {
      result.search = searchTerm;
    }
    
    return result;
  }, [filters, searchTerm]);

  return {
    filters,
    searchTerm,
    setFilter,
    setSearchTerm,
    resetFilters,
    currentFilters,
  };
};

/**
 * Generates modal state management
 */
export const useModalState = (createTitle: string, editTitle: string) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const openCreate = useCallback(() => setIsCreateOpen(true), []);
  const closeCreate = useCallback(() => setIsCreateOpen(false), []);
  const openEdit = useCallback(() => setIsEditOpen(true), []);
  const closeEdit = useCallback(() => setIsEditOpen(false), []);
  const closeAll = useCallback(() => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
  }, []);

  return {
    isCreateOpen,
    isEditOpen,
    isOpen: isCreateOpen || isEditOpen,
    isEditMode: isEditOpen,
    modalTitle: isCreateOpen ? createTitle : editTitle,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    closeAll,
  };
};

/**
 * Helper to generate form population logic from schema
 */
export const generateFormPopulator = <T extends Record<string, any>>(
  schema: FormSchema
) => {
  return (entity: T, formState: ReturnType<typeof useFormState>) => {
    schema.sections.forEach(section => {
      // Get fields for this section
      const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
      
      if (section.isRepeatingSection) {
        const sectionData = entity[section.id];
        if (Array.isArray(sectionData)) {
          formState.setValue(section.id, sectionData);
        }
      } else {
        sectionFields.forEach(field => {
          const value = entity[field.name];
          if (value !== undefined && value !== null) {
            formState.setValue(field.name, value);
          }
        });
      }
    });
  };
};


