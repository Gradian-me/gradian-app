import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormSchema } from '../types';
import {
  CreateSchemaPayload,
  DeleteDialogState,
  SchemaCreateResult,
  SchemaTab,
} from '../types/schema-manager-page';
import { MessagesResponse, Message } from '@/gradian-ui/layout/message-box';
import { config } from '@/lib/config';
import { useSchemas, SCHEMAS_QUERY_KEY, SCHEMAS_SUMMARY_QUERY_KEY } from './use-schemas';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { clearSchemaCache } from '@/gradian-ui/indexdb-manager/schema-cache';
import { SCHEMA_SUMMARY_CACHE_KEY } from '@/gradian-ui/indexdb-manager/types';

/**
 * Transform API response messages to MessageBox format
 * API may return: { path: "$.description", en: "description is required" }
 * MessageBox expects: { path: "$.description", message: { en: "description is required" } }
 */
const transformMessages = (apiMessages: any[]): Message[] => {
  if (!Array.isArray(apiMessages)) return [];
  
  return apiMessages.map((msg: any) => {
    // If message already has the correct format, return as is
    if (msg.message !== undefined) {
      return msg;
    }
    
    // Extract path if exists
    const { path, ...languageKeys } = msg;
    
    // If there are language keys (en, fr, etc.), wrap them in message
    if (Object.keys(languageKeys).length > 0) {
      return {
        path,
        message: languageKeys,
      };
    }
    
    // Fallback: treat the whole object as a string message
    return {
      path,
      message: JSON.stringify(msg),
    };
  });
};

export const useSchemaManagerPage = () => {
  const queryClient = useQueryClient();
  const { schemas: fetchedSchemas, isLoading, error: schemasError, refetch: refetchSchemas } = useSchemas({ summary: true });
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SchemaTab>('system');
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table' | 'hierarchy'>('grid');
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, schema: null });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [messages, setMessages] = useState<MessagesResponse | null>(null);

  // Use schemas from React Query cache
  const schemas = fetchedSchemas;
  const loading = isLoading || refreshing;

  // Handle error messages from React Query
  useEffect(() => {
    if (schemasError) {
      const errorMessage = schemasError instanceof Error ? schemasError.message : 'Error fetching schemas';
      setMessages({
        success: false,
        message: errorMessage,
      });
    }
  }, [schemasError]);

  const systemSchemas = useMemo(
    () => schemas.filter(schema => schema.isSystemSchema === true).sort((a, b) => {
      const aName = a.plural_name || a.singular_name || a.id || '';
      const bName = b.plural_name || b.singular_name || b.id || '';
      return aName.localeCompare(bName);
    }),
    [schemas],
  );

  const businessSchemas = useMemo(
    () => schemas.filter(schema => schema.isSystemSchema !== true).sort((a, b) => {
      const aName = a.plural_name || a.singular_name || a.id || '';
      const bName = b.plural_name || b.singular_name || b.id || '';
      return aName.localeCompare(bName);
    }),
    [schemas],
  );

  const systemSchemasCount = useMemo(
    () => showInactive 
      ? systemSchemas.length 
      : systemSchemas.filter(schema => !schema.inactive).length,
    [systemSchemas, showInactive],
  );

  const businessSchemasCount = useMemo(
    () => showInactive 
      ? businessSchemas.length 
      : businessSchemas.filter(schema => !schema.inactive).length,
    [businessSchemas, showInactive],
  );

  const filteredSchemas = useMemo(() => {
    const listToFilter = activeTab === 'system' ? systemSchemas : businessSchemas;

    return listToFilter.filter(schema => {
      // Filter by inactive status if showInactive is false
      if (!showInactive && schema.inactive) {
        return false;
      }

      // Filter by search query
      const query = searchQuery.toLowerCase();
      const pluralName = schema.plural_name?.toLowerCase() || '';
      const singularName = schema.singular_name?.toLowerCase() || '';
      const schemaId = schema.id?.toLowerCase() || '';
      return (
        pluralName.includes(query) ||
        singularName.includes(query) ||
        schemaId.includes(query)
      );
    });
  }, [activeTab, businessSchemas, searchQuery, showInactive, systemSchemas]);

  const invalidateSchemaQueryCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ 
        queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
        refetchType: 'active', // Force refetch of active queries
      }),
      queryClient.invalidateQueries({ 
        queryKey: SCHEMAS_QUERY_KEY,
        refetchType: 'active', // Force refetch of active queries
      }),
    ]);
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await invalidateSchemaQueryCaches();
      await refetchSchemas();

      // Force-refresh summary cache so IndexedDB stores the latest snapshot
      try {
        await clearSchemaCache(undefined, SCHEMA_SUMMARY_CACHE_KEY);
        await apiRequest<FormSchema[]>('/api/schemas', {
          params: {
            summary: 'true',
            cacheBust: Date.now().toString(),
          },
          callerName: 'SchemaManagerRefresh',
        });
      } catch (cacheError) {
        console.warn('[schema-manager] Failed to refresh summary cache', cacheError);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error refreshing schemas';
      setMessages({
        success: false,
        message: errorMessage,
      });
    } finally {
      setRefreshing(false);
    }
  }, [invalidateSchemaQueryCaches, refetchSchemas]);

  const openDeleteDialog = useCallback((schema: FormSchema) => {
    setDeleteDialog({ open: true, schema });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ open: false, schema: null });
  }, []);

  const handleDelete = useCallback(async (hardDelete: boolean = false) => {
    if (!deleteDialog.schema) {
      return false;
    }

    try {
      let response: Response;
      let result: any;

      if (hardDelete) {
        // Hard delete: DELETE the schema and all its data
        response = await fetch(`${config.schemaApi.basePath}/${deleteDialog.schema.id}?hardDelete=true`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        result = await response.json();
      } else {
        // Soft delete: Set schema as inactive
        const updatedSchema = { ...deleteDialog.schema, inactive: true };
        const { id: _schemaId, ...payload } = updatedSchema;
        
        response = await fetch(`${config.schemaApi.basePath}/${deleteDialog.schema.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        result = await response.json();
      }

      if (result.success) {
        // Call clear cache route to clear all caches
        try {
          await fetch('/api/schemas/clear-cache', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }).catch((error) => {
            console.warn('Failed to call clear-cache route:', error);
          });
        } catch (error) {
          console.warn('Error calling clear-cache route:', error);
        }

        // Clear IndexedDB schema cache first
        try {
          await clearSchemaCache(undefined, SCHEMA_SUMMARY_CACHE_KEY);
        } catch (error) {
          console.warn('Failed to clear IndexedDB schema cache:', error);
        }
        
        // Invalidate and refetch queries to ensure fresh data
        await invalidateSchemaQueryCaches();
        
        // Wait a brief moment for cache clearing to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force refetch the schema list
        await refetchSchemas();
        
        // Show success message if available
        if (result.messages) {
          const transformedMessages = transformMessages(result.messages);
          setMessages({
            success: true,
            messages: transformedMessages,
            message: result.message,
          });
        } else if (result.message) {
          setMessages({
            success: true,
            message: result.message,
          });
        }
        closeDeleteDialog();
        return true;
      }

      // Extract error messages from response
      if (result.messages) {
        const transformedMessages = transformMessages(result.messages);
        setMessages({
          success: false,
          messages: transformedMessages,
          message: result.message,
        });
      } else if (result.message) {
        setMessages({
          success: false,
          message: result.message,
        });
      } else {
        setMessages({
          success: false,
          message: result.error || (hardDelete ? 'Failed to delete schema' : 'Failed to set schema inactive'),
        });
      }
      console.error(hardDelete ? 'Failed to delete schema:' : 'Failed to set schema inactive:', result);
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (hardDelete ? 'Error deleting schema' : 'Error setting schema inactive');
      setMessages({
        success: false,
        message: errorMessage,
      });
      console.error(hardDelete ? 'Error deleting schema:' : 'Error setting schema inactive:', error);
      return false;
    }
  }, [closeDeleteDialog, deleteDialog.schema, invalidateSchemaQueryCaches, refetchSchemas]);

  const handleCreate = useCallback(async (payload: CreateSchemaPayload): Promise<SchemaCreateResult> => {
    const { schemaId, singularName, pluralName, description, showInNavigation, isSystemSchema, isNotCompanyBased, allowDataInactive, allowDataForce, allowDataHardDelete } = payload;

    if (!schemaId || !singularName || !pluralName) {
      return { success: false, error: 'Schema ID, Singular Name, and Plural Name are required' };
    }

    // Clear any existing messages when starting a new create operation
    setMessages(null);

    try {
      const newSchema: FormSchema = {
        id: schemaId,
        description,
        singular_name: singularName,
        plural_name: pluralName,
        showInNavigation,
        isSystemSchema,
        isNotCompanyBased,
        allowDataInactive,
        allowDataForce,
        allowDataHardDelete,
        fields: [],
        sections: [],
      };

      const response = await fetch(config.schemaApi.basePath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchema),
      });

      const result = await response.json();

      if (result.success) {
        // Invalidate schemas cache to refetch updated data
        await invalidateSchemaQueryCaches();
        // Don't set messages in hook when dialog is open - let dialog handle it
        // Only set messages after dialog closes if needed
        setCreateDialogOpen(false);
        // Show success message on background page after dialog closes
        if (result.messages) {
          const transformedMessages = transformMessages(result.messages);
          setMessages({
            success: true,
            messages: transformedMessages,
            message: result.message,
          });
        } else if (result.message) {
          setMessages({
            success: true,
            message: result.message,
          });
        }
        return { success: true };
      }

      // Extract error messages from response
      // Don't set messages in hook - return them to dialog instead
      if (result.messages) {
        const transformedMessages = transformMessages(result.messages);
        return { success: false, error: result.error || 'Failed to create schema', messages: transformedMessages };
      } else if (result.message) {
        return { success: false, error: result.error || 'Failed to create schema', message: result.message };
      } else {
        const errorMessage = result.error || 'Failed to create schema';
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error creating schema';
      // Don't set messages in hook - return to dialog instead
      console.error('Error creating schema:', error);
      return { success: false, error: errorMessage };
    }
  }, [invalidateSchemaQueryCaches, queryClient]);

  const openCreateDialog = useCallback(() => setCreateDialogOpen(true), []);
  const closeCreateDialog = useCallback(() => setCreateDialogOpen(false), []);

  return {
    schemas,
    loading,
    refreshing,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    showInactive,
    setShowInactive,
    viewMode,
    setViewMode,
    filteredSchemas,
    systemSchemas,
    businessSchemas,
    systemSchemasCount,
    businessSchemasCount,
    handleRefresh,
    deleteDialog,
    openDeleteDialog,
    closeDeleteDialog,
    handleDelete,
    createDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    handleCreate,
    messages,
    clearMessages: () => setMessages(null),
  };
};
