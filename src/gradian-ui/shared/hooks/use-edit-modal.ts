// Hook for managing edit modal with dynamic schema loading and entity fetching
// Can be used to open edit modals for any schema ID and entity ID

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { apiRequest } from '../utils/api';
import { asFormBuilderSchema } from '@/gradian-ui/schema-manager/utils/schema-utils';
import type { FormSchema as FormBuilderSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { useCompanyStore } from '@/stores/company.store';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { filterFormDataForSubmission } from '@/gradian-ui/form-builder/utils/form-data-filter';

/**
 * Reconstruct RegExp objects from serialized schema
 */
function reconstructRegExp(obj: any): any {
  if (obj && typeof obj === 'object') {
    // Check if this is a serialized RegExp
    if (obj.__regexp === true && obj.source) {
      return new RegExp(obj.source, obj.flags || '');
    }
    
    // Recursively process arrays
    if (Array.isArray(obj)) {
      return obj.map(item => reconstructRegExp(item));
    }
    
    // Recursively process objects
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = reconstructRegExp(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

export interface UseEditModalOptions {
  /**
   * Optional function to enrich form data before submission
   * Useful for adding reference IDs, default values, etc.
   */
  enrichData?: (formData: Record<string, any>, entityId: string) => Record<string, any>;
  
  /**
   * Optional callback when entity is successfully updated
   */
  onSuccess?: (data: any) => void;
  
  /**
   * Optional callback when modal is closed
   */
  onClose?: () => void;
}

export interface UseEditModalReturn {
  /**
   * Target schema for the edit modal
   */
  targetSchema: FormBuilderSchema | null;
  
  /**
   * Current entity data (pre-populated)
   */
  entityData: any | null;
  
  /**
   * Entity ID being edited
   */
  entityId: string | null;
  
  /**
   * Whether the edit modal is open
   */
  isOpen: boolean;
  
  /**
   * Whether form is currently submitting
   */
  isSubmitting: boolean;
  
  /**
   * Error message for the form
   */
  formError: string | null;
  
  /**
   * Error message for schema/entity loading
   */
  loadError: string | null;
  
  /**
   * Whether schema/entity is currently loading
   */
  isLoading: boolean;
  
  /**
   * Open the edit modal with a schema ID and entity ID
   */
  openEditModal: (schemaId: string, entityId: string) => Promise<void>;
  
  /**
   * Close the edit modal
   */
  closeEditModal: () => void;
  
  /**
   * Handle form submission
   */
  handleSubmit: (formData: Record<string, any>) => Promise<void>;
  
  /**
   * Clear form error
   */
  clearFormError: () => void;
  
  /**
   * Clear load error
   */
  clearLoadError: () => void;
}

/**
 * Hook for managing edit modal with dynamic schema loading and entity fetching
 * 
 * @param options - Configuration options for the hook
 * @returns Modal state and handlers
 * 
 * @example
 * ```tsx
 * const {
 *   targetSchema,
 *   entityData,
 *   isOpen,
 *   openEditModal,
 *   closeEditModal,
 *   handleSubmit
 * } = useEditModal({
 *   enrichData: (data, id) => ({ ...data, updatedAt: new Date() }),
 *   onSuccess: () => console.log('Updated!'),
 * });
 * ```
 */
export function useEditModal(
  options: UseEditModalOptions = {}
): UseEditModalReturn {
  const { enrichData, onSuccess, onClose } = options;
  const { getCompanyId } = useCompanyStore();
  const queryClient = useQueryClient();

  const [targetSchema, setTargetSchema] = useState<FormBuilderSchema | null>(null);
  const [entityData, setEntityData] = useState<any | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Open edit modal with target schema ID and entity ID
   */
  const openEditModal = useCallback(async (schemaId: string, editEntityId: string) => {
    // Clear previous errors
    setLoadError(null);
    setFormError(null);
    setIsLoading(true);
    
    try {
      // Fetch schema using React Query (will use cache if available)
      const schemaResponse = await apiRequest<FormSchema>(`/api/schemas/${schemaId}`);
      
      if (!schemaResponse.success || !schemaResponse.data) {
        throw new Error(schemaResponse.error || `Schema not found: ${schemaId}`);
      }

      await cacheSchemaClientSide(schemaResponse.data, { queryClient, persist: false });
      // Reconstruct RegExp objects
      const rawSchema = reconstructRegExp(schemaResponse.data) as FormSchema;
      
      // Validate schema structure
      if (!rawSchema?.id) {
        throw new Error(`Invalid schema structure: ${schemaId}`);
      }

      // Convert to form-builder schema
      const formBuilderSchema = asFormBuilderSchema(rawSchema);

      // Final validation
      if (!formBuilderSchema?.id || !formBuilderSchema?.name) {
        throw new Error('Schema conversion failed: missing required fields');
      }

      // Fetch entity data
      const apiEndpoint = `/api/data/${schemaId}/${editEntityId}`;
      const entityResult = await apiRequest(apiEndpoint, {
        method: 'GET',
        callerName: 'useEditModal.loadEntity',
      });

      if (!entityResult.success || !entityResult.data) {
        throw new Error(`Entity not found: ${editEntityId}`);
      }

      // Set schema, entity data, and open modal
      setTargetSchema(formBuilderSchema);
      setEntityData(entityResult.data);
      setEntityId(editEntityId);
      setIsOpen(true);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load form';
      console.error('Error opening edit modal:', err);
      setLoadError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  /**
   * Close edit modal
   */
  const closeEditModal = useCallback(() => {
    setIsOpen(false);
    setTargetSchema(null);
    setEntityData(null);
    setEntityId(null);
    setFormError(null);
    onClose?.();
  }, [onClose]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (formData: Record<string, any>) => {
    if (!targetSchema || !entityId) {
      console.error('No target schema or entity ID available for submission');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    
    try {
      // Filter form data to remove temporary IDs, hidden fields, etc.
      const filteredData = filterFormDataForSubmission(formData, targetSchema, {
        keepEntityId: true, // Keep entity ID for edit mode
        removeRepeatingItemIds: true, // Remove temporary IDs from repeating sections
        removeEmptyValues: false, // Keep empty values (let backend decide)
      });

      // Enrich data if provided
      let enrichedData = enrichData ? enrichData(filteredData, entityId) : filteredData;

      // Automatically add companyId from store if not already present
      // Only add if entity doesn't have companyId (preserve existing companyId for updates)
      if (!enrichedData.companyId) {
        const companyId = getCompanyId();
        if (companyId !== null && companyId !== -1) {
          enrichedData = {
            ...enrichedData,
            companyId: String(companyId),
          };
        }
      }

      // Update entity using API
      const apiEndpoint = `/api/data/${targetSchema.id}/${entityId}`;
      const result = await apiRequest(apiEndpoint, {
        method: 'PUT',
        body: enrichedData,
      });

      if (result.success) {
        closeEditModal();
        onSuccess?.(result.data);
      } else {
        console.error(`Failed to update ${targetSchema.name}:`, result.error);
        setFormError(result.error || `Failed to update ${targetSchema.name}. Please try again.`);
      }
      
      setIsSubmitting(false);
    } catch (error) {
      console.error(`Error updating ${targetSchema.name}:`, error);
      setFormError(error instanceof Error ? error.message : `Failed to update ${targetSchema.name}. Please try again.`);
      setIsSubmitting(false);
    }
  }, [targetSchema, entityId, enrichData, closeEditModal, onSuccess, getCompanyId]);

  const clearFormError = useCallback(() => {
    setFormError(null);
  }, []);

  const clearLoadError = useCallback(() => {
    setLoadError(null);
  }, []);

  return {
    targetSchema,
    entityData,
    entityId,
    isOpen,
    isSubmitting,
    formError,
    loadError,
    isLoading,
    openEditModal,
    closeEditModal,
    handleSubmit,
    clearFormError,
    clearLoadError,
  };
}

