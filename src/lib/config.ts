// Import DEMO_MODE from application variables
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';

// Helper function to check if demo mode is enabled
// Uses DEMO_MODE from application-variables.ts which references DEMO_MODE_PARAMS
const isDemoModeEnabled = (): boolean => {
  return DEMO_MODE;
};

// Get the schema API base URL based on demo mode
const getSchemaApiBaseUrl = (): string => {
  const isDemo = isDemoModeEnabled();
  if (isDemo) {
    // In demo mode, use local API routes
    return process.env.NEXT_PUBLIC_SCHEMA_API_BASE || '/api/schemas';
  } else {
    // In non-demo mode, use external API URL
    const externalUrl = process.env.NEXT_PUBLIC_URL_SCHEMA_CRUD?.replace(/\/+$/, '') || '';
    return externalUrl ? `${externalUrl}/api/schemas` : '/api/schemas';
  }
};

// Get the data API base URL based on demo mode
const getDataApiBaseUrl = (): string => {
  const isDemo = isDemoModeEnabled();
  if (isDemo) {
    // In demo mode, use local API routes
    return '/api/data';
  } else {
    // In non-demo mode, use external API URL
    const externalUrl = process.env.NEXT_PUBLIC_URL_DATA_CRUD?.replace(/\/+$/, '') || '';
    return externalUrl ? `${externalUrl}/api/data` : '/api/data';
  }
};

export const config = {
  dataSource: process.env.DATA_SOURCE || 'mock',
  database: {
    url: process.env.DATABASE_URL || '',
  },
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

export type DataSource = 'mock' | 'database';

export const isMockData = (): boolean => {
  return config.dataSource === 'mock';
};

export const isDatabaseData = (): boolean => {
  return config.dataSource === 'database';
};
