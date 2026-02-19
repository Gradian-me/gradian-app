// Data Display Module Exports

export { DataDisplayWrapper } from './components/DataDisplayWrapper';
export { DataDisplayFilterPane } from './components/DataDisplayFilterPane';
export { DataDisplayViewSwitch } from './components/DataDisplayViewSwitch';
export { DataDisplayContainer } from './components/DataDisplayContainer';
export { DataDisplayPagination } from './components/DataDisplayPagination';
export { DataDisplayEmptyState } from './components/DataDisplayEmptyState';
export { DataDisplayLoadingState } from './components/DataDisplayLoadingState';
export { DataDisplayErrorState } from './components/DataDisplayErrorState';

// Card Components
export * from './card';

// List Components
export * from './list';

// New Components
export { EmptyState } from './components/EmptyState';
export { LoadingState } from './components/LoadingState';
export { SearchBar } from './components/SearchBar';
export { FilterBar } from './components/FilterBar';
export { Modal } from './components/Modal';
export { DataTable } from './components/DataTable';
export { DynamicCardRenderer } from './components/DynamicCardRenderer';
export { ViewSwitcher } from './components/ViewSwitcher';
export { DynamicCard } from './components/DynamicCard';
export { DynamicList } from './components/DynamicList';
// BadgeRenderer is now exported from form-builder/form-elements/utils/badge-viewer
export { DynamicMetricRenderer } from './components/DynamicMetricRenderer';
export { DynamicCardDialog } from './components/DynamicCardDialog';
export type { ActionConfig, ActionType } from './components/action-types';
export { DynamicInfoCard } from './components/DynamicInfoCard';
export { ComponentRenderer } from './components/ComponentRenderer';
export { DynamicDetailPageRenderer } from './components/DynamicDetailPageRenderer';
export { DynamicRepeatingTableViewer } from './components/DynamicRepeatingTableViewer';
export { DynamicPageRenderer } from './components/DynamicPageRenderer';
export { DataFilterDialog } from './components/DataFilterDialog';
export type { DataFilterDialogProps } from './components/DataFilterDialog';
export { AvatarUser } from './components/AvatarUser';
export type { AvatarUserProps, UserData } from './components/AvatarUser';
export { getFilterStrategy, registerFilterStrategy } from './utils/filter-strategy';
export { FilterPaneRenderer } from './utils/filter-pane-renderer-utils';
export type { FilterPaneRendererProps } from './utils/filter-pane-renderer-utils';

// Table Components
export * from './table';

// Export types but exclude TableColumn to avoid conflict (use TableColumn from ./table instead)
export type {
  DataDisplayWrapperProps,
  DataDisplayConfig,
  DataDisplayView,
  DataDisplayFilterConfig,
  DataDisplaySearchConfig,
  DataDisplayActionConfig,
  DataDisplayPaginationConfig,
  DataDisplayLayoutConfig,
  DataDisplayStylingConfig,
  DataDisplayBehaviorConfig,
  DataDisplayFilters,
  DataDisplayState,
  DataDisplayFilterPaneProps,
  DataDisplayViewSwitchProps,
  DataDisplayContainerProps,
  DataDisplayPaginationProps,
  DataDisplayEmptyStateProps,
  DataDisplayLoadingStateProps,
  DataDisplayErrorStateProps,
  EmptyStateProps,
  LoadingStateProps,
  SearchBarProps,
  FilterOption,
  FilterConfig,
  FilterBarProps,
  ModalProps,
  // TableColumn is excluded - use the one from ./table instead
  DataTableProps,
  FilterItem,
  FilterOperatorOption,
  FilterStrategy,
} from './types';
