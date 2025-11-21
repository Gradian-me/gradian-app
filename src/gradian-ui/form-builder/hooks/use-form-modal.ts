'use client';

// Unified hook for managing form modals (create and edit) with dynamic schema loading
// Can be used to open create or edit modals for any schema ID

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { asFormBuilderSchema } from '@/gradian-ui/schema-manager/utils/schema-utils';
import type { FormSchema as FormBuilderSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { useCompanyStore } from '@/stores/company.store';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { toast } from 'sonner';
import { filterFormDataForSubmission } from '../utils/form-data-filter';

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

export type FormModalMode = 'create' | 'edit';

export interface UseFormModalOptions {
  /**
   * Optional function to enrich form data before submission
   * For create mode: (formData) => enrichedData
   * For edit mode: (formData, entityId) => enrichedData
   */
  enrichData?: (formData: Record<string, any>, entityId?: string) => Record<string, any>;
  
  /**
   * Optional callback when entity is successfully created/updated
   */
  onSuccess?: (data: any) => void;
  
  /**
   * Optional callback when modal is closed
   */
  onClose?: () => void;

  /**
   * Optional function to supply an already-loaded schema to avoid refetching.
   * Return null to fall back to API.
   */
  getInitialSchema?: (schemaId: string) => FormSchema | null;

  /**
   * Optional function to supply already-loaded entity data (edit mode).
   * Return null to fall back to API fetch.
   */
  getInitialEntityData?: (schemaId: string, entityId?: string) => any | null;
}

export interface UseFormModalReturn {
  /**
   * Target schema for the form modal
   */
  targetSchema: FormBuilderSchema | null;
  
  /**
   * Current entity data (only for edit mode, pre-populated)
   */
  entityData: any | null;
  
  /**
   * Entity ID being edited (only for edit mode)
   */
  entityId: string | null;
  
  /**
   * Current mode: 'create' or 'edit'
   */
  mode: FormModalMode | null;
  
  /**
   * Whether the form modal is open
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
   * HTTP status code for form errors
   */
  formErrorStatusCode?: number;
  
  /**
   * Message from API response (shown in FormAlert)
   */
  formMessage: string | null;
  
  /**
   * Error message for schema/entity loading
   */
  loadError: string | null;
  
  /**
   * Whether schema/entity is currently loading
   */
  isLoading: boolean;
  
  /**
   * Open the form modal
   * @param schemaId - Schema ID for the form
   * @param modalMode - 'create' (default) or 'edit'
   * @param editEntityId - Entity ID (required for edit mode)
   */
  openFormModal: (schemaId: string, modalMode?: FormModalMode, editEntityId?: string) => Promise<void>;
  
  /**
   * Close the form modal
   */
  closeFormModal: () => void;
  
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
 * Unified hook for managing form modals (create and edit) with dynamic schema loading
 * 
 * @param options - Configuration options for the hook
 * @returns Modal state and handlers
 * 
 * @example
 * ```tsx
 * // Create mode
 * const { openFormModal } = useFormModal({
 *   enrichData: (data) => ({ ...data, referenceId: currentItem.id }),
 *   onSuccess: () => console.log('Created!'),
 * });
 * await openFormModal(schemaId);
 * 
 * // Edit mode
 * const { openFormModal } = useFormModal({
 *   enrichData: (data, id) => ({ ...data, updatedAt: new Date() }),
 *   onSuccess: () => console.log('Updated!'),
 * });
 * await openFormModal(schemaId, 'edit', entityId);
 * ```
 */
export function useFormModal(
  options: UseFormModalOptions = {}
): UseFormModalReturn {
  const { enrichData, onSuccess, onClose, getInitialSchema, getInitialEntityData } = options;
  const { getCompanyId } = useCompanyStore();
  const queryClient = useQueryClient();
  const [targetSchema, setTargetSchema] = useState<FormBuilderSchema | null>(null);
  const [entityData, setEntityData] = useState<any | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [mode, setMode] = useState<FormModalMode | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrorStatusCode, setFormErrorStatusCode] = useState<number | undefined>(undefined);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Open form modal - unified function that handles both create and edit modes
   */
  const openFormModal = useCallback(async (
    schemaId: string,
    modalMode: FormModalMode | undefined = 'create',
    editEntityId?: string
  ) => {
    // Clear previous errors and messages
    setLoadError(null);
    setFormError(null);
    setFormMessage(null);
    setIsLoading(true);
    
    try {
      let schemaSource: FormSchema | null = null;
      if (getInitialSchema) {
        try {
          schemaSource = getInitialSchema(schemaId) ?? null;
        } catch (error) {
          console.warn('getInitialSchema threw an error, falling back to API fetch.', error);
          schemaSource = null;
        }
      }

      if (!schemaSource) {
        const response = await apiRequest<FormSchema>(`/api/schemas/${schemaId}`);
        
        if (!response.success || !response.data) {
          throw new Error(response.error || `Schema not found: ${schemaId}`);
        }

        schemaSource = response.data;
        await cacheSchemaClientSide(schemaSource, { queryClient, persist: false });
      }

      const schemaCopy = JSON.parse(JSON.stringify(schemaSource));

      // Reconstruct RegExp objects
      const rawSchema = reconstructRegExp(schemaCopy) as FormSchema;
      
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

      // For edit mode, fetch entity data
      if (modalMode === 'edit' && editEntityId) {
        let entitySource: any | null = null;
        if (getInitialEntityData) {
          try {
            entitySource = getInitialEntityData(schemaId, editEntityId) ?? null;
          } catch (error) {
            console.warn('getInitialEntityData threw an error, falling back to API fetch.', error);
            entitySource = null;
          }
        }

        if (entitySource) {
          setEntityData(entitySource);
          setEntityId(editEntityId);
        }

        const apiEndpoint = `/api/data/${schemaId}/${editEntityId}`;
        const entityResult = await apiRequest(apiEndpoint, {
          method: 'GET',
        });

        if (!entityResult.success || !entityResult.data) {
          throw new Error(`Entity not found: ${editEntityId}`);
        }

        setEntityData(entityResult.data);
        setEntityId(editEntityId);
      } else {
        // Create mode - clear entity data
        setEntityData(null);
        setEntityId(null);
      }

      // Set schema, mode, and open modal
      setTargetSchema(formBuilderSchema);
      setMode(modalMode);
      setIsOpen(true);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load form';
      console.error(`Error opening ${modalMode} modal:`, err);
      setLoadError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [getInitialSchema, getInitialEntityData, queryClient]);

  /**
   * Close form modal
   */
  const closeFormModal = useCallback(() => {
    setIsOpen(false);
    setTargetSchema(null);
    setEntityData(null);
    setEntityId(null);
    setMode(null);
    setFormError(null);
    setFormMessage(null);
    onClose?.();
  }, [onClose]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (formData: Record<string, any>) => {
    if (!targetSchema) {
      console.error('No target schema available for submission');
      return;
    }

    if (mode === 'edit' && !entityId) {
      console.error('No entity ID available for edit submission');
      return;
    }

    setFormError(null);
    setFormMessage(null);
    setIsSubmitting(true);
    
    try {
      // Filter form data to remove temporary IDs, hidden fields, etc.
      const filteredData = targetSchema
        ? filterFormDataForSubmission(formData, targetSchema, {
            keepEntityId: mode === 'edit', // Keep entity ID for edit mode
            removeRepeatingItemIds: true, // Remove temporary IDs from repeating sections
            removeEmptyValues: false, // Keep empty values (let backend decide)
          })
        : formData;

      // Enrich data if provided (pass entityId for edit mode)
      let enrichedData = enrichData 
        ? enrichData(filteredData, mode === 'edit' ? entityId || undefined : undefined)
        : filteredData;

      // Automatically add companyId from store if not already present
      // Only add for create mode or if entity doesn't have companyId (for edit mode)
      if (mode === 'create' || !enrichedData.companyId) {
        const companyId = getCompanyId();
        if (companyId !== null && companyId !== -1) {
          enrichedData = {
            ...enrichedData,
            companyId: String(companyId),
          };
        }
      }

      // Determine API endpoint and method based on mode
      const apiEndpoint = mode === 'edit' && entityId
        ? `/api/data/${targetSchema.id}/${entityId}`
        : `/api/data/${targetSchema.id}`;
      
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const result = await apiRequest(apiEndpoint, {
        method,
        body: enrichedData,
      });

      if (result.success) {
        const entityLabel =
          targetSchema.singular_name ||
          targetSchema.name ||
          targetSchema.title ||
          'Record';
        const successTitle =
          mode === 'edit'
            ? `${entityLabel} updated`
            : `${entityLabel} created`;
        const successDescription =
          mode === 'edit'
            ? 'Changes saved successfully.'
            : 'New record created successfully.';

        toast.success(successTitle, { description: successDescription });
        closeFormModal();
        onSuccess?.(result.data);
      } else {
        const action = mode === 'edit' ? 'update' : 'create';
        console.error(`Failed to ${action} ${targetSchema.name}:`, result.error);
        
        // If both error and message exist, show error on top and message in FormAlert
        if (result.error && result.message) {
          setFormError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
          setFormMessage(typeof result.message === 'string' ? result.message : JSON.stringify(result.message));
        } else {
          // Only error or only message
          const errorText = result.error || result.message;
          setFormError(typeof errorText === 'string' ? errorText : (errorText ? JSON.stringify(errorText) : `Failed to ${action} ${targetSchema.name}. Please try again.`));
          setFormMessage(null);
        }
        setFormErrorStatusCode(result.statusCode);
      }
      
      setIsSubmitting(false);
    } catch (error) {
      const action = mode === 'edit' ? 'update' : 'create';
      console.error(`Error ${action}ing ${targetSchema.name}:`, error);
      setFormError(error instanceof Error ? error.message : `Failed to ${action} ${targetSchema.name}. Please try again.`);
      setFormMessage(null);
      setFormErrorStatusCode(undefined);
      setIsSubmitting(false);
    }
  }, [targetSchema, mode, entityId, enrichData, closeFormModal, onSuccess, getCompanyId]);

  const clearFormError = useCallback(() => {
    setFormError(null);
    setFormMessage(null);
    setFormErrorStatusCode(undefined);
  }, []);

  const clearLoadError = useCallback(() => {
    setLoadError(null);
  }, []);

  return {
    targetSchema,
    entityData,
    entityId,
    mode,
    isOpen,
    isSubmitting,
    formError,
    formErrorStatusCode,
    formMessage,
    loadError,
    isLoading,
    openFormModal,
    closeFormModal,
    handleSubmit,
    clearFormError,
    clearLoadError,
  };
}

