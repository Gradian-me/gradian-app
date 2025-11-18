// Hook to fetch logical operators from API

import { useState, useEffect } from 'react';
import { Operator } from '../types';

export function useLogicalOperators() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOperators() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/data/logical-operators');
        if (!response.ok) {
          throw new Error('Failed to fetch operators');
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          // Transform API data to Operator format
          const transformedOperators: Operator[] = result.data.map((op: any) => ({
            id: op.id,
            name: op.name,
            title: op.title,
            symbol: op.symbol,
            color: op.color,
            sqlEquivalent: op.sqlEquivalent,
            cypherEquivalent: op.cypherEquivalent,
          }));
          setOperators(transformedOperators);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load operators');
        console.error('Error fetching operators:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOperators();
  }, []);

  return { operators, isLoading, error };
}

