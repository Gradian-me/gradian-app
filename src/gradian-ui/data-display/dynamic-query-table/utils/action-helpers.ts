import type { ActionConfig, ActionType } from '@/gradian-ui/data-display/components/action-types';
import { Schema } from '../types';

/**
 * Type definition for dynamic query actions configuration
 */
export interface DynamicQueryActionsConfig {
  dynamicQueryId: string;
  actionMetadata: Array<{
    schema: string;
    actions: ActionType[];
  }>;
}

/**
 * Normalize schema ID for comparison (remove hyphens, lowercase)
 */
function normalizeSchemaId(schemaId: string): string {
  return schemaId.replace(/-/g, '').toLowerCase();
}

/**
 * Find matching action metadata for a given schema ID
 * Handles schema ID normalization and flexible matching
 */
export function findActionMetadataForSchema(
  schemaId: string,
  actionMetadata: DynamicQueryActionsConfig['actionMetadata']
): { schema: string; actions: ActionType[] } | null {
  if (!actionMetadata || actionMetadata.length === 0) {
    return null;
  }

  const normalizedTargetId = normalizeSchemaId(schemaId);

  // Try exact match first (with normalization)
  const exactMatch = actionMetadata.find((meta) => {
    const normalizedMetaId = normalizeSchemaId(meta.schema);
    return normalizedMetaId === normalizedTargetId;
  });

  if (exactMatch) {
    return exactMatch;
  }

  // Try partial match (case-insensitive, ignoring hyphens)
  const partialMatch = actionMetadata.find((meta) => {
    const normalizedMetaId = normalizeSchemaId(meta.schema);
    return (
      normalizedTargetId.includes(normalizedMetaId) ||
      normalizedMetaId.includes(normalizedTargetId)
    );
  });

  return partialMatch || null;
}

// Track last edit action to prevent rapid-fire clicks
let lastEditAction: { schemaId: string; entityId: string; timestamp: number } | null = null;
const EDIT_ACTION_DEBOUNCE_MS = 500; // Prevent duplicate clicks within 500ms

/**
 * Create ActionConfig objects from action types for a given schema
 */
export function createActionConfigs(
  actionTypes: ActionType[],
  schemaId: string,
  dynamicQueryId: string,
  rowId?: string,
  onEditEntity?: (schemaId: string, entityId: string) => void
): ActionConfig[] {
  return actionTypes.map((actionType) => {
    // For view actions, construct URL if rowId is provided
    let href: string | undefined;
    let canOpenInNewTab: boolean | undefined;

    if (actionType === 'view' && rowId) {
      // Construct URL: /page/{schemaId}/{rowId}
      href = `/page/${schemaId}/${rowId}`;
      canOpenInNewTab = true;
    }
    // For edit actions, use callback instead of href if provided
    // else if (actionType === 'edit' && rowId) {
    //   // Construct URL: /page/{schemaId}/${rowId}?mode=edit
    //   href = `/page/${schemaId}/${rowId}?mode=edit`;
    //   canOpenInNewTab = false;
    // }

    // Create onClick handler with debounce guard
    const onClick = () => {
      if (actionType === 'edit' && rowId && onEditEntity) {
        // Prevent rapid-fire clicks that could cause loops
        const now = Date.now();
        const isDuplicate = lastEditAction && 
          lastEditAction.schemaId === schemaId && 
          lastEditAction.entityId === rowId &&
          (now - lastEditAction.timestamp) < EDIT_ACTION_DEBOUNCE_MS;
        
        if (isDuplicate) {
          // Ignore duplicate click
          return;
        }
        
        // Record this action
        lastEditAction = { schemaId, entityId: rowId, timestamp: now };
        
        // Use callback to open form modal
        onEditEntity(schemaId, rowId);
      } else if (actionType === 'delete') {
        // For delete actions, show confirmation and handle deletion
        console.log(`Delete action: ${actionType}`, {
          schemaId,
          dynamicQueryId,
          rowId,
        });
        // TODO: Implement delete functionality with confirmation dialog
      } else {
        // View actions are handled via href in HierarchyActionsMenu / table renderers
        console.log(`Action: ${actionType}`, {
          schemaId,
          dynamicQueryId,
          rowId,
        });
      }
    };

    return {
      type: actionType,
      onClick,
      href,
      canOpenInNewTab,
    };
  });
}

/**
 * Get action buttons config for a schema
 * This is the main utility function to use in components
 */
export function getActionButtonsForSchema(
  schema: Schema,
  dynamicQueryActions: DynamicQueryActionsConfig | undefined,
  dynamicQueryId: string,
  rowId?: string,
  onEditEntity?: (schemaId: string, entityId: string) => void
): ActionConfig[] | null {
  if (!dynamicQueryActions) {
    return null;
  }

  // Only process if the dynamicQueryId matches
  if (dynamicQueryActions.dynamicQueryId !== dynamicQueryId) {
    return null;
  }

  const actionMetadata = findActionMetadataForSchema(
    schema.id,
    dynamicQueryActions.actionMetadata
  );

  if (!actionMetadata || !actionMetadata.actions || actionMetadata.actions.length === 0) {
    return null;
  }

  return createActionConfigs(actionMetadata.actions, schema.id, dynamicQueryId, rowId, onEditEntity);
}

