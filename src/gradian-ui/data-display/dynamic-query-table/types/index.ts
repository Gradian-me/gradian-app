import { TableColumn } from '../../table/types';

export interface DynamicQueryTableProps {
  dynamicQueryId: string;
  flatten?: boolean;
  showFlattenSwitch?: boolean;
  onFlattenChange?: (flatten: boolean) => void;
  showIds?: boolean;
  onShowIdsChange?: (showIds: boolean) => void;
  flattenedSchemas?: string[];
  queryParams?: Record<string, any>;
  highlightQuery?: string;
  onRefreshReady?: (refreshFn: () => Promise<void>) => void;
  expandAllTrigger?: number;
  onExpandAllReady?: (expandFn: () => void, collapseFn: () => void) => void;
  onStatusChange?: (isSuccess: boolean, statusCode?: number, loading?: boolean, error?: string | null) => void;
}

export interface DynamicQueryResponse {
  success: boolean;
  statusCode: number;
  message?: string;
  data: any;
}

export interface SchemaField {
  id: string;
  name: string;
  label: string;
  component: string;
  options?: any[];
  role?: string;
  targetSchema?: string;
  [key: string]: any;
}

export interface Schema {
  id: string;
  label: string;
  fields: SchemaField[];
}

export interface NestedTableViewWrapperProps {
  data: any[];
  schema: Schema;
  schemas: Schema[];
  depth?: number;
  highlightQuery?: string;
  showFlattenSwitch?: boolean;
  flatten?: boolean;
  onFlattenChange?: (flatten: boolean) => void;
  expandAllTrigger?: number;
  onExpandAllReady?: (expandFn: () => void, collapseFn: () => void) => void;
  showIds?: boolean;
  flattenedSchemas?: string[];
}

export interface NestedTableViewProps {
  data: any[];
  schema: Schema;
  schemas: Schema[];
  depth?: number;
  highlightQuery?: string;
  expandAllTrigger?: number;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  showFlattenSwitch?: boolean;
  flatten?: boolean;
  onFlattenChange?: (flatten: boolean) => void;
  showIds?: boolean;
  flattenedSchemas?: string[];
}

export interface FlatTableRendererProps {
  data: Record<string, any>;
  schemas?: Schema[];
  showFlattenSwitch?: boolean;
  flatten?: boolean;
  onFlattenChange?: (flatten: boolean) => void;
  showIds?: boolean;
  onShowIdsChange?: (showIds: boolean) => void;
  highlightQuery?: string;
}

export interface NestedTableRendererProps {
  data: any;
  schemas?: Schema[];
  showFlattenSwitch?: boolean;
  flatten?: boolean;
  onFlattenChange?: (flatten: boolean) => void;
  highlightQuery?: string;
  expandAllTrigger?: number;
  onExpandAllReady?: (expandFn: () => void, collapseFn: () => void) => void;
  showIds?: boolean;
  flattenedSchemas?: string[];
}

export interface ColumnGroup {
  schema: Schema;
  columns: TableColumn[];
  startIndex: number;
}

export interface ColumnGroupInfo {
  groupIndex: number;
  columnIndex: number;
  totalInGroup: number;
}

