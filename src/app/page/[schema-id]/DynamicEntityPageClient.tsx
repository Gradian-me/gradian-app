'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicPageRenderer } from '@/gradian-ui/data-display/components/DynamicPageRenderer';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { useSchemaById } from '@/gradian-ui/schema-manager/hooks/use-schema-by-id';
import { useQueryClient } from '@tanstack/react-query';

interface DynamicEntityPageClientProps {
  initialSchema: FormSchema;
  schemaId: string;
  navigationSchemas?: FormSchema[];
}

/**
 * Convert a pattern string to RegExp
 */
function stringToRegExp(pattern: string | undefined): RegExp | undefined {
  if (!pattern) return undefined;
  try {
    return new RegExp(pattern);
  } catch (error) {
    console.warn(`Invalid pattern: ${pattern}`, error);
    return undefined;
  }
}

/**
 * Process a field to convert string patterns to RegExp
 */
function processField(field: any): any {
  const processedField = { ...field };
  if (processedField.validation?.pattern && typeof processedField.validation.pattern === 'string') {
    processedField.validation.pattern = stringToRegExp(processedField.validation.pattern);
  }
  return processedField;
}

/**
 * Process a schema to convert string patterns to RegExp objects
 */
function processSchema(schema: any): FormSchema {
  const processedSchema = { ...schema };
  
  if (processedSchema.fields) {
    processedSchema.fields = processedSchema.fields.map(processField);
  }
  
  return processedSchema as FormSchema;
}

/**
 * Serialize schema to remove RegExp and other non-serializable objects
 */
function serializeSchema(schema: FormSchema): any {
  return JSON.parse(JSON.stringify(schema, (key, value) => {
    if (value instanceof RegExp) {
      return {
        __regexp: true,
        source: value.source,
        flags: value.flags
      };
    }
    return value;
  }));
}

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

export function DynamicEntityPageClient({ initialSchema, schemaId, navigationSchemas }: DynamicEntityPageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Reconstruct RegExp objects from serialized schema from server
  const reconstructedInitialSchema = useMemo(
    () => reconstructRegExp(initialSchema) as FormSchema,
    [initialSchema]
  );

  const reconstructedNavigationSchemas = useMemo(
    () => (navigationSchemas ?? []).map((schema) => reconstructRegExp(schema) as FormSchema),
    [navigationSchemas]
  );

  // Update React Query cache when initialSchema changes (e.g., after router.refresh())
  useEffect(() => {
    if (reconstructedInitialSchema) {
      queryClient.setQueryData(['schemas', schemaId], reconstructedInitialSchema);
    }
  }, [queryClient, schemaId, reconstructedInitialSchema]);

  useEffect(() => {
    if (!reconstructedNavigationSchemas.length) {
      return;
    }

    reconstructedNavigationSchemas.forEach((schema) => {
      if (schema?.id) {
        queryClient.setQueryData(['schemas', schema.id], schema);
      }
    });
  }, [queryClient, reconstructedNavigationSchemas]);
  
  // Track if we've fetched for this schemaId to avoid multiple fetches
  const hasFetchedRef = useRef<string | null>(null);
  const isSchemaReadyRef = useRef<boolean>(false);
  const isInitialFetchRef = useRef<boolean>(true); // Track if this is the initial fetch
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  // Always fetch fresh schema data on page load to avoid stale cache issues
  // Clear cache first, then fetch to ensure we get the latest schema
  const { schema: fetchedSchema, isLoading: isSchemaLoading, refetch: refetchSchema } = useSchemaById(schemaId, {
    enabled: true, // Enable query to allow refetch
    initialData: reconstructedInitialSchema, // Use server data as fallback
  });
  
  // Track refetch function in ref
  const refetchSchemaRef = useRef(refetchSchema);
  useEffect(() => {
    refetchSchemaRef.current = refetchSchema;
  }, [refetchSchema]);
  
  // Always fetch fresh schema data when page loads or schemaId changes
  useEffect(() => {
    if (!schemaId) {
      return;
    }
    
    // Skip if we already fetched for this schemaId and it's ready
    if (hasFetchedRef.current === schemaId && isSchemaReadyRef.current) {
      isInitialFetchRef.current = false; // Mark as no longer initial fetch
      return;
    }
    
    // Mark as fetched before async operation
    hasFetchedRef.current = schemaId;
    isSchemaReadyRef.current = false; // Reset ready state when starting new fetch
    forceUpdate(); // Trigger re-render
    
    // Clear cache first to ensure fresh fetch
    queryClient.removeQueries({ queryKey: ['schemas', schemaId] });
    
    // Invalidate to mark as stale
    queryClient.invalidateQueries({ queryKey: ['schemas', schemaId] });
    
    // Fetch fresh schema data and wait for it to complete
    refetchSchemaRef.current({ cancelRefetch: false })
      .then(() => {
        // Mark schema as ready after refetch completes
        isSchemaReadyRef.current = true;
        isInitialFetchRef.current = false; // Mark as no longer initial fetch
        forceUpdate(); // Trigger re-render
      })
      .catch(() => {
        // Even on error, mark as ready to prevent blocking
        isSchemaReadyRef.current = true;
        isInitialFetchRef.current = false; // Mark as no longer initial fetch
        forceUpdate(); // Trigger re-render
      });
  }, [schemaId, queryClient]); // Only depend on schemaId and queryClient

  // Listen for React Query cache clear events - invalidate cache and refresh router
  useEffect(() => {
    const handleCacheClear = async () => {
      // Reset fetch tracking to allow fresh fetch after cache clear
      hasFetchedRef.current = null;
      // Invalidate React Query cache for this schema
      await queryClient.invalidateQueries({ queryKey: ['schemas', schemaId] });
      // Remove the cached data to force a fresh fetch
      queryClient.removeQueries({ queryKey: ['schemas', schemaId] });
      // Trigger fresh fetch
      void refetchSchema();
      // Force router refresh to get fresh server-side data
      // This will cause the server component to re-render with fresh schema data
      router.refresh();
    };

    // Listen for React Query cache clear event (same tab)
    window.addEventListener('react-query-cache-clear', handleCacheClear as EventListener);

    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'react-query-cache-cleared') {
        // Reset fetch tracking to allow fresh fetch after cache clear
        hasFetchedRef.current = null;
        // Invalidate and remove cached data
        await queryClient.invalidateQueries({ queryKey: ['schemas', schemaId] });
        queryClient.removeQueries({ queryKey: ['schemas', schemaId] });
        // Trigger fresh fetch
        void refetchSchema();
        // Force router refresh to get fresh server-side data
        router.refresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('react-query-cache-clear', handleCacheClear as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [schemaId, queryClient, router, refetchSchema]);

  // Use fetched schema if available, otherwise use initial schema from server
  // Always prefer the latest fetchedSchema over initialSchema
  const schema = fetchedSchema || reconstructedInitialSchema;
  
  // Don't render DynamicPageRenderer until schema refetch is complete
  // This ensures data fetch happens AFTER schema fetch completes
  // IMPORTANT: This check must be AFTER all hooks are called
  // Wait if: we're on initial fetch OR we've initiated a fetch for this schemaId AND it's not ready yet
  const shouldWaitForSchema = 
    isInitialFetchRef.current ||
    (hasFetchedRef.current === schemaId && !isSchemaReadyRef.current);
  
  if (shouldWaitForSchema) {
    // Schema fetch is in progress, wait for it to complete before rendering
    return null;
  }

  // Serialize schema for client component
  const serializedSchema = serializeSchema(schema);

  return (
    <DynamicPageRenderer 
      schema={serializedSchema} 
      entityName={schema.singular_name || 'Entity'}
      navigationSchemas={reconstructedNavigationSchemas}
    />
  );
}

