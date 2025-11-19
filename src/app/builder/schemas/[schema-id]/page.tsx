'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SchemaBuilderEditor } from '@/gradian-ui/schema-manager';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { Message } from '@/gradian-ui/layout/message-box';
import { config } from '@/lib/config';

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

export default function SchemaEditorPage({ params }: { params: Promise<{ 'schema-id': string }> }) {
  const router = useRouter();
  const [schemaId, setSchemaId] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setSchemaId(resolvedParams['schema-id']);
    });
  }, [params]);

  const fetchSchema = async (id: string): Promise<FormSchema> => {
    const cacheBust = Date.now().toString();
    const url = `${config.schemaApi.basePath}/${id}?cacheBust=${cacheBust}`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    const result = await response.json();

    if (response.ok && result.success && result.data) {
      setLoadError(null);
      setApiResponse(null); // Clear any previous errors
      return result.data as FormSchema;
    }

    const errorMessage = result.error || 'Failed to load schema';
    console.error('Failed to fetch schema:', errorMessage);
    setLoadError(errorMessage);

    if (result.messages) {
      const transformedMessages = transformMessages(result.messages);
      setApiResponse({
        ...result,
        messages: transformedMessages,
      });
    } else {
      setApiResponse(result);
    }

    router.replace(`/builder/schemas/${id}/not-found`);
    throw new Error('Failed to fetch schema');
  };

  const saveSchema = async (id: string, schema: FormSchema): Promise<void> => {
    const { id: _schemaId, ...payload } = schema;
    
    // Clear previous messages when starting a new save
    setApiResponse(null);
    
    const response = await fetch(`${config.schemaApi.basePath}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    // Transform messages if they exist
    if (result.messages) {
      const transformedMessages = transformMessages(result.messages);
      setApiResponse({
        ...result,
        messages: transformedMessages,
      });
    } else if (result.message || !result.success) {
      // Set response even if no messages array, to show error or success message
      setApiResponse(result);
    }
    
    if (!result.success) {
      throw new Error('Failed to save schema');
    }

    // Automatically clear cache after successful save
    // This ensures schema changes are reflected immediately in other pages/tabs
    try {
      const clearCacheResponse = await fetch('/api/schemas/clear-cache', {
        method: 'POST',
      });
      const clearCacheData = await clearCacheResponse.json();
      
      if (clearCacheData.success && typeof window !== 'undefined' && clearCacheData.clearReactQueryCache) {
        const reactQueryKeys: string[] = Array.isArray(clearCacheData.reactQueryKeys) && clearCacheData.reactQueryKeys.length > 0
          ? clearCacheData.reactQueryKeys
          : ['schemas', 'companies'];
        
        // Dispatch event to clear React Query caches
        window.dispatchEvent(new CustomEvent('react-query-cache-clear', { 
          detail: { queryKeys: reactQueryKeys } 
        }));
        
        // Also trigger storage event for other tabs
        window.localStorage.setItem('react-query-cache-cleared', JSON.stringify(reactQueryKeys));
        window.localStorage.removeItem('react-query-cache-cleared');
      }
    } catch (error) {
      // Don't throw - cache clearing failure shouldn't prevent save success
      console.warn('Failed to clear cache after save:', error);
    }
  };

  const handleReloadSchema = async () => {
    if (!schemaId) {
      return;
    }
    setIsReloading(true);
    try {
      await fetchSchema(schemaId);
    } catch (error) {
      console.error('Manual schema refresh failed:', error);
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <SchemaBuilderEditor
      schemaId={schemaId}
      fetchSchema={fetchSchema}
      saveSchema={saveSchema}
      onBack={() => router.push('/builder/schemas')}
      apiResponse={apiResponse}
      onClearResponse={() => setApiResponse(null)}
      onRefreshSchema={handleReloadSchema}
      refreshing={isReloading}
    />
  );
}
