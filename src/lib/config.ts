// Import DEMO_MODE from env config
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';

// Helper function to check if demo mode is enabled
// For config object initialization, uses static value (evaluated at import time)
// For runtime checks in API routes, use the server-side loader functions directly
const isDemoModeEnabled = (): boolean => {
  // Always use static value for config object (evaluated at module load time)
  // API routes should use their own isDemoModeEnabled() functions that use the loader
  return DEMO_MODE;
};

// Get the schema API base URL
// IMPORTANT: Always return relative URL so client requests go through Next.js API routes
// The Next.js API routes will handle proxying to external backend when demo mode is false
const getSchemaApiBaseUrl = (): string => {
  // Use environment variable if set, otherwise default to '/api/schemas'
  // Always use relative URL so requests go through Next.js API routes
  return process.env.NEXT_PUBLIC_SCHEMA_API_BASE || '/api/schemas';
};

// Get the data API base URL
// IMPORTANT: Always return '/api/data' so client requests go through Next.js API routes
// The Next.js API routes will handle proxying to external backend when demo mode is false
const getDataApiBaseUrl = (): string => {
  // Always use relative URL so requests go through Next.js API routes
  // The API routes check isDemoModeEnabled() and proxy when needed
  return '/api/data';
};

export const config = {
  schemaApi: {
    basePath: getSchemaApiBaseUrl(),
  },
  dataApi: {
    basePath: getDataApiBaseUrl(),
  },
  relationTypeApi: {
    basePath: process.env.NEXT_PUBLIC_RELATION_TYPE_API_BASE || '/api/data/relation-types',
  },
  demoMode: {
    enabled: isDemoModeEnabled(),
  },
} as const;
