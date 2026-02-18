/**
 * Action types used by dynamic-query-table and HierarchyActionsMenu.
 * Extracted from legacy DynamicActionButtons for shared use.
 */

export type ActionType = 'view' | 'edit' | 'delete';

export interface ActionConfig {
  type: ActionType;
  onClick: () => void;
  disabled?: boolean;
  href?: string;
  canOpenInNewTab?: boolean;
}
