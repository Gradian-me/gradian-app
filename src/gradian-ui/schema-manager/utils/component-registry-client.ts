// Component Registry Client Utilities
// Client-side only utilities for fetching components from the registry API

'use client';

import { FormField } from '../types/form-schema';

interface ComponentMeta {
  id: string;
  label: string;
  description?: string;
  usecase?: string;
  category?: string;
}

export interface ComponentOption {
  value: FormField['component'];
  label: string;
  description?: string;
}

/**
 * Fetch form-elements components from the component registry API
 * This is the single source of truth for available components
 * Client-side only - uses browser fetch API
 * @throws Error if the API call fails
 */
export async function fetchFormComponents(): Promise<ComponentOption[]> {
  if (typeof window === 'undefined') {
    throw new Error('fetchFormComponents can only be called on the client side');
  }

  const response = await fetch('/api/ui/components?category=form-elements', {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch components: HTTP ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch components from API');
  }

  if (!Array.isArray(result.data)) {
    throw new Error('Invalid response format: expected array of components');
  }

  // Map component registry data to Select options format
  // Use id as the component value (single source of truth)
  const components = result.data
    .map((comp: ComponentMeta) => ({
      value: comp.id as FormField['component'],
      label: comp.label,
      description: comp.description || comp.usecase,
    }));

  // Remove duplicates and sort
  type ComponentOption = { value: FormField['component']; label: string; description?: string };
  const uniqueComponents = (Array.from(
    new Map(components.map((c: ComponentOption) => [c.value, c])).values()
  ) as ComponentOption[]).sort((a, b) => a.label.localeCompare(b.label));

  return uniqueComponents;
}

