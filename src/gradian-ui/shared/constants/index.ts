export const API_ENDPOINTS = {
  DATA: '/api/data',
  DASHBOARD: '/api/dashboard',
  SCHEMAS: '/api/schemas',
} as const;

export const ROUTES = {
  DASHBOARD: '/dashboard',
  VENDORS: '/vendors',
  TENDORS: '/tenders',
  PURCHASE_ORDERS: '/purchase-orders',
  INVOICES: '/invoices',
  SHIPMENTS: '/shipments',
  CALENDAR: '/calendar',
  ERP: '/erp',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  PROCUREMENT: 'procurement',
  VENDOR: 'vendor',
} as const;

export const VENDOR_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
} as const;

export const TENDER_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
  AWARDED: 'awarded',
  CANCELLED: 'cancelled',
} as const;

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar' },
  { value: 'EUR', label: 'Euro' },
  { value: 'GBP', label: 'British Pound' },
  { value: 'CAD', label: 'Canadian Dollar' },
] as const;

export const COUNTRIES = [
  { value: 'USA', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'Germany', label: 'Germany' },
  { value: 'France', label: 'France' },
] as const;

export const UNITS = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'L', label: 'Liter' },
  { value: 'box', label: 'Box' },
  { value: 'set', label: 'Set' },
] as const;

export const PAYMENT_TERMS = [
  { value: 'Net 15 days', label: 'Net 15 days' },
  { value: 'Net 30 days', label: 'Net 30 days' },
  { value: 'Net 45 days', label: 'Net 45 days' },
  { value: 'Net 60 days', label: 'Net 60 days' },
  { value: 'COD', label: 'Cash on Delivery' },
] as const;

export const DELIVERY_TERMS = [
  { value: 'FOB Origin', label: 'FOB Origin' },
  { value: 'FOB Destination', label: 'FOB Destination' },
  { value: 'CIF', label: 'CIF (Cost, Insurance, Freight)' },
  { value: 'EXW', label: 'EXW (Ex Works)' },
] as const;

// Translations (key-based app strings)
export {
  TRANSLATION_KEYS,
  TRANSLATIONS,
  type TranslationEntry,
  type TranslationKey,
} from './translations';

// Re-export from config files
export { AUTH_CONFIG, EXCLUDED_LOGIN_ROUTES, FORBIDDEN_ROUTES_PRODUCTION } from '../configs/auth-config';
export { UI_PARAMS, URL_HOME } from '../configs/ui-config';
export { LOG_CONFIG, LogType } from '../configs/log-config';
export { SCHEMA_SUMMARY_EXCLUDED_KEYS } from '../configs/general-config';
export { 
  DEMO_MODE, 
  DEMO_MODE_PARAMS, 
  LOGIN_LOCALLY, 
  LOGIN_LOCALLY_PARAMS, 
  AD_MODE, 
  AD_MODE_PARAMS, 
  REQUIRE_LOGIN,
  IS_DEV,
  IS_PRODUCTION
} from '../configs/env-config';
