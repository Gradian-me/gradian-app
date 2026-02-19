// Data Display Types

import { BaseComponentProps, ComponentConfig } from '../../shared/types';

export interface DataDisplayWrapperProps extends BaseComponentProps {
  config: DataDisplayConfig;
  data: any[];
  loading?: boolean;
  error?: string | null;
  onDataChange?: (data: any[]) => void;
  onFilterChange?: (filters: DataDisplayFilters) => void;
  onViewChange?: (view: DataDisplayView) => void;
  onAddNew?: () => void;
  onRefresh?: () => void;
}

export interface DataDisplayConfig {
  id: string;
  name: string;
  title?: string;
  description?: string;
  views: DataDisplayView[];
  filters: DataDisplayFilterConfig[];
  search: DataDisplaySearchConfig;
  actions: DataDisplayActionConfig[];
  pagination?: DataDisplayPaginationConfig;
  layout: DataDisplayLayoutConfig;
  styling?: DataDisplayStylingConfig;
  behavior?: DataDisplayBehaviorConfig;
}

export interface DataDisplayView {
  id: string;
  name: string;
  label: string;
  icon?: React.ReactNode;
  component: 'card' | 'list' | 'table' | 'grid' | 'timeline';
  config: ComponentConfig;
  responsive?: {
    hideOn?: ('sm' | 'md' | 'lg' | 'xl')[];
    showOn?: ('sm' | 'md' | 'lg' | 'xl')[];
  };
}

export interface DataDisplayFilterConfig {
  id: string;
  name: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'text' | 'checkbox' | 'radio';
  options?: Array<{ label: string; value: any; disabled?: boolean }>;
  placeholder?: string;
  defaultValue?: any;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
  styling?: {
    width?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'outlined' | 'filled';
  };
}

export interface DataDisplaySearchConfig {
  enabled: boolean;
  placeholder?: string;
  debounceMs?: number;
  minLength?: number;
  maxLength?: number;
  fields?: string[]; // Fields to search in
  styling?: {
    width?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'outlined' | 'filled';
  };
}

export interface DataDisplayActionConfig {
  id: string;
  name: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  position?: 'left' | 'right' | 'center';
  responsive?: {
    hideOn?: ('sm' | 'md' | 'lg' | 'xl')[];
    showOn?: ('sm' | 'md' | 'lg' | 'xl')[];
  };
}

export interface DataDisplayPaginationConfig {
  enabled: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  position?: 'top' | 'bottom' | 'both';
}

export interface DataDisplayLayoutConfig {
  container: {
    padding?: number;
    margin?: number;
    maxWidth?: string;
    centered?: boolean;
  };
  header: {
    show?: boolean;
    title?: string;
    description?: string;
    actions?: string[]; // Action IDs to show in header
  };
  filterPane: {
    show?: boolean;
    position?: 'top' | 'left' | 'right';
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    width?: string;
  };
  viewSwitch: {
    show?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
    alignment?: 'start' | 'center' | 'end';
  };
  content: {
    padding?: number;
    gap?: number;
    responsive?: boolean;
  };
}

export interface DataDisplayStylingConfig {
  theme?: 'light' | 'dark' | 'auto';
  variant?: 'default' | 'minimal' | 'elevated' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
}

export interface DataDisplayBehaviorConfig {
  autoRefresh?: {
    enabled: boolean;
    interval: number; // in milliseconds
  };
  infiniteScroll?: {
    enabled: boolean;
    threshold: number; // pixels from bottom
  };
  selection?: {
    enabled: boolean;
    multiple: boolean;
    onSelectionChange?: (selected: any[]) => void;
  };
  sorting?: {
    enabled: boolean;
    defaultSort?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  grouping?: {
    enabled: boolean;
    defaultGroup?: string;
    groups?: Array<{
      id: string;
      label: string;
      field: string;
    }>;
  };
}

export interface DataDisplayFilters {
  search?: string;
  [key: string]: any;
}

export interface DataDisplayState {
  data: any[];
  filteredData: any[];
  loading: boolean;
  error: string | null;
  currentView: DataDisplayView;
  filters: DataDisplayFilters;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
  selection: any[];
  sorting: {
    field: string | null;
    direction: 'asc' | 'desc';
  };
  grouping: {
    field: string | null;
    groups: Record<string, any[]>;
  };
}

export interface DataDisplayFilterPaneProps extends BaseComponentProps {
  config: DataDisplayConfig;
  filters: DataDisplayFilters;
  onFilterChange: (filters: DataDisplayFilters) => void;
  onSearch: (search: string) => void;
  onAddNew: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export interface DataDisplayViewSwitchProps extends BaseComponentProps {
  views: DataDisplayView[];
  currentView: DataDisplayView;
  onViewChange: (view: DataDisplayView) => void;
  config: DataDisplayConfig;
}

export interface DataDisplayContainerProps extends BaseComponentProps {
  data: any[];
  view: DataDisplayView;
  loading?: boolean;
  error?: string | null;
  onItemClick?: (item: any) => void;
  onItemAction?: (action: string, item: any) => void;
  config: DataDisplayConfig;
  state: DataDisplayState;
}

export interface DataDisplayPaginationProps extends BaseComponentProps {
  config: DataDisplayPaginationConfig;
  pagination: DataDisplayState['pagination'];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface DataDisplayEmptyStateProps extends BaseComponentProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: DataDisplayActionConfig[];
  onAction?: (action: string) => void;
}

export interface DataDisplayLoadingStateProps extends BaseComponentProps {
  message?: string;
  skeleton?: boolean;
  count?: number;
}

export interface DataDisplayErrorStateProps extends BaseComponentProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

// Empty State Component Types
export interface EmptyStateProps extends BaseComponentProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

// Loading State Component Types
export interface LoadingStateProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
}

// Search Bar Component Types
export interface SearchBarProps extends BaseComponentProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  showSearchButton?: boolean;
}

// Filter Bar Component Types
export interface FilterOption {
  id: string;
  label: string;
  value?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  value: string;
  placeholder: string;
  options: FilterOption[];
}

export interface FilterBarProps extends BaseComponentProps {
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
}

// Modal Component Types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
  hideDialogHeader?: boolean; // Hide the dialog header (title/description) when true
  hideCloseButton?: boolean; // Hide the X close button in top right when true
  footerLeftActions?: React.ReactNode; // Actions to show on the left side of the footer
  /**
   * Enable built-in maximize/minimize toggle in the modal header.
   * When true, a small square button is shown in the header (configurable via breakpoint classes).
   */
  enableMaximize?: boolean;
  /**
   * Optional initial maximize state when enableMaximize is true.
   */
  defaultMaximized?: boolean;
  /**
   * Optional callback when maximize state changes.
   */
  onMaximizeChange?: (value: boolean) => void;
}

// Data Table Component Types
export interface TableColumn {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: any, index: number) => React.ReactNode;
}

export interface DataTableProps extends BaseComponentProps {
  columns: TableColumn[];
  data: any[];
  onRowClick?: (row: any, index: number) => void;
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
}

/** Single filter condition for DataFilterDialog. Output shape for filterArray. */
export interface FilterItem {
  id: string;
  column: string;
  operator: string;
  value: unknown;
}

/** Operator option for filter strategy. */
export interface FilterOperatorOption {
  id: string;
  label: string;
  symbol?: string;
}

/** Filter strategy per component type: operators and default operator. */
export interface FilterStrategy {
  operators: FilterOperatorOption[];
  defaultOperator: string;
}
