'use client';

import { useEffect, useMemo, useRef } from 'react';
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
  
  // Use React Query to fetch and cache schema
  // Use initial schema from server as initialData to populate React Query cache
  // This ensures the cache is populated with server-side data, avoiding unnecessary fetches
  const { schema: fetchedSchema, refetch: refetchSchema } = useSchemaById(schemaId, {
    enabled: false, // We'll trigger a manual refresh to guarantee fresh data
    initialData: reconstructedInitialSchema, // Populate cache with server-side data
  });
  
  // Use fetched schema if available, otherwise use initial schema from server
  // Always prefer the latest initialSchema from server after refresh
  const schema = fetchedSchema || reconstructedInitialSchema;

  // Listen for React Query cache clear events - invalidate cache and refresh router
  useEffect(() => {
    const handleCacheClear = async () => {
      // Invalidate React Query cache for this schema
      await queryClient.invalidateQueries({ queryKey: ['schemas', schemaId] });
      // Remove the cached data to force a fresh fetch
      queryClient.removeQueries({ queryKey: ['schemas', schemaId] });
      // Force router refresh to get fresh server-side data
      // This will cause the server component to re-render with fresh schema data
      router.refresh();
    };

    // Listen for React Query cache clear event (same tab)
    window.addEventListener('react-query-cache-clear', handleCacheClear as EventListener);

    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'react-query-cache-cleared') {
        // Invalidate and remove cached data
        await queryClient.invalidateQueries({ queryKey: ['schemas', schemaId] });
        queryClient.removeQueries({ queryKey: ['schemas', schemaId] });
        // Force router refresh to get fresh server-side data
        router.refresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('react-query-cache-clear', handleCacheClear as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [schemaId, queryClient, router]);

  // Trigger one fresh fetch per schema visit to ensure the client has the latest schema definition
  const lastFetchedSchemaIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!schemaId) {
      return;
    }
    if (lastFetchedSchemaIdRef.current === schemaId) {
      return;
    }
    lastFetchedSchemaIdRef.current = schemaId;
    void refetchSchema();
  }, [schemaId, refetchSchema]);

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

