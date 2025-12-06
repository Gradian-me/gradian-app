// Table Viewer Types

export interface TableColumn<T = any> {
  id: string;
  label: string;
  accessor: keyof T | ((row: T) => any);
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  minWidth?: number;
  maxWidth?: number;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  headerRender?: () => React.ReactNode;
  cellClassName?: string | ((row: T, index: number) => string);
  sticky?: 'left' | 'right';
  /**
   * Whether the column content is allowed to wrap to multiple lines.
   * Defaults to true when maxWidth is provided for backward compatibility.
   */
  allowWrap?: boolean;
  /**
   * Optional field metadata (used for component-specific rendering)
   */
  field?: any;
}

export interface TableConfig<T = any> {
  id: string;
  columns: TableColumn<T>[];
  data: T[];
  pagination?: {
    enabled: boolean;
    pageSize?: number | 'all';
    showPageSizeSelector?: boolean;
    pageSizeOptions?: (number | 'all')[];
    alwaysShow?: boolean; // If true, always show pagination even with one page (default: false)
  };
  sorting?: {
    enabled: boolean;
    defaultSort?: {
      columnId: string;
      direction: 'asc' | 'desc';
    };
    multiSort?: boolean;
  };
  filtering?: {
    enabled: boolean;
    globalSearch?: boolean;
    columnFilters?: Record<string, any>;
  };
  selection?: {
    enabled: boolean;
    multiple?: boolean;
    onSelectionChange?: (selectedRows: T[]) => void;
  };
  emptyState?: {
    message?: string;
    icon?: React.ReactNode;
  };
  hideEmptyState?: boolean; // If true, don't render empty state (useful when parent component handles it)
  loading?: boolean;
  className?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

export interface TableProps<T = any> {
  config: TableConfig<T>;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  onCellClick?: (value: any, row: T, column: TableColumn<T>, index: number) => void;
  highlightQuery?: string;
}

export interface TableState {
  page: number;
  pageSize: number | 'all';
  sortBy: string | null;
  sortDirection: 'asc' | 'desc';
  selectedRows: Set<number>;
  globalFilter: string;
  columnFilters: Record<string, any>;
}

export * from './repeating-table';

