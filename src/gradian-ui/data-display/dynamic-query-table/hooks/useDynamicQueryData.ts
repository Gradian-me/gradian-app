import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { DynamicQueryResponse } from '../types';

export function useDynamicQueryData(
  dynamicQueryId: string, 
  flatten: boolean,
  queryParams?: Record<string, any>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined);
  const [responseData, setResponseData] = useState<DynamicQueryResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusCode(undefined);

    try {
      // Build query string for flatten parameter (keep it in URL for backward compatibility)
      const queryString = flatten ? '?flatten=true' : '';
      const endpoint = `/api/dynamic-query/${dynamicQueryId}${queryString}`;
      
      // Prepare request body with query params
      // apiRequest will handle JSON serialization, so we pass the object directly
      const body = queryParams && Object.keys(queryParams).length > 0 
        ? queryParams
        : undefined;

      const response = await apiRequest<DynamicQueryResponse>(endpoint, {
        method: 'POST',
        callerName: 'DynamicQueryTable',
        body,
      });

      // Store status code for error handling
      setStatusCode(response.statusCode);

      if (response.success && response.data) {
        setResponseData({
          success: true,
          statusCode: response.statusCode || 200,
          data: response.data,
        });
      } else {
        // Set error message, but keep statusCode for component to handle 404/403
        setError((response.data as any)?.error || (response.data as any)?.message || response.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [dynamicQueryId, flatten, queryParams]);

  useEffect(() => {
    if (dynamicQueryId) {
      fetchData();
    }
  }, [dynamicQueryId, fetchData]);

  return { loading, error, statusCode, responseData, refetch: fetchData };
}

