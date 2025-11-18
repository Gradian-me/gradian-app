// Hook to fetch schemas from API

import { useState, useEffect, useCallback } from 'react';

export interface Schema {
  id: string;
  singular_name: string;
  plural_name: string;
  description?: string;
  fields?: Array<{
    id: string;
    name: string;
    label: string;
    type?: string;
    component?: string;
    description?: string;
  }>;
}

export function useSchemas() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchemas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/schemas?summary=true');
      if (!response.ok) {
        throw new Error('Failed to fetch schemas');
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setSchemas(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schemas');
      console.error('Error fetching schemas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  return {
    schemas,
    isLoading,
    error,
    refetch: fetchSchemas,
  };
}

