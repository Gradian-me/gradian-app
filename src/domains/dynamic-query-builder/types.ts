/**
 * Dynamic Query Builder types.
 * Matches the API shape for columns, patterns, applyRBAC, and pagination.
 */

export interface DynamicQueryColumnDef {
  fieldId: string;
  schemaId: string;
  /** Order for grouping; only set for columns that participate in grouping */
  groupOrder?: number;
  selectOrder: number;
}

export interface DynamicQueryPatternFromTo {
  alias?: string;
  schemaId: string;
}

/** Root pattern has only from; edge pattern has from, to, edge, optional */
export interface DynamicQueryPatternDef {
  from: DynamicQueryPatternFromTo;
  to?: DynamicQueryPatternFromTo;
  edge?: string;
  optional?: boolean;
}

export interface DynamicQueryPagination {
  limit: number;
  offset: number;
  strategy: 'offset' | 'cursor';
}

export interface DynamicQueryConfig {
  columns: DynamicQueryColumnDef[];
  patterns: DynamicQueryPatternDef[];
  applyRBAC: boolean;
  pagination: DynamicQueryPagination;
}
