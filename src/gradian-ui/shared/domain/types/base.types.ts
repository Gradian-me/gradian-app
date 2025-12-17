// Base Domain Types
// Common types used across all domains

export interface BaseEntity {
  id: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sortArray?: Array<{ column: string; isAscending: boolean }>;
}

export interface FilterParams {
  search?: string;
  status?: string;
  category?: string;
  tenantIds?: string | string[];
  allowDataRelatedTenants?: boolean;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetail[];
}

