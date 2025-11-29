'use client';

import React from 'react';
import { Modal } from '@/gradian-ui/data-display/components/Modal';
import { SchemaFormWrapper } from './FormLifecycleManager';
import { useFormModal, UseFormModalOptions, FormModalMode } from '../hooks/use-form-modal';
import { Spinner } from '@/components/ui/spinner';
import { FormAlert } from '@/components/ui/form-alert';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { getValueByRole } from '@/gradian-ui/data-display/utils';
import { getPrimaryDisplayString, hasDisplayValue } from '@/gradian-ui/data-display/utils/value-display';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { useDialogBackHandler } from '@/gradian-ui/shared/contexts/DialogContext';

const EXCLUDED_TITLE_ROLES = new Set(['code', 'subtitle', 'description']);

const getEntityDisplayTitle = (
  schema?: FormSchema,
  data?: Record<string, any>
): string | null => {
  if (!schema || !data) {
    return null;
  }

  if (schema.fields?.some((field) => field.role === 'title')) {
    const titleByRole = getValueByRole(schema, data, 'title');
    if (typeof titleByRole === 'string' && titleByRole.trim() !== '') {
      return titleByRole;
    }
  }

  const textFields = schema.fields
    ?.filter(
      (field) =>
        field.component === 'text' &&
        (!field.role || !EXCLUDED_TITLE_ROLES.has(field.role)) &&
        hasDisplayValue(data[field.name])
    )
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  if (textFields && textFields.length > 0) {
    const firstField = textFields[0];
    const value = data[firstField.name];
    const primary = getPrimaryDisplayString(value);
    if (primary) {
      return primary;
    }
    if (value !== null && value !== undefined) {
      const stringValue = String(value).trim();
      if (stringValue !== '') {
        return stringValue;
      }
    }
  }

  const fallback =
    data.name ??
    data.title ??
    data.id ??
    null;

  return fallback ? String(fallback) : null;
};

export interface FormModalProps extends UseFormModalOptions {
  /**
   * Schema ID for the form
   */
  schemaId?: string;
  
  /**
   * Entity ID (required for edit mode)
   */
  entityId?: string;
  
  /**
   * Form mode: 'create' or 'edit'
   * @default 'create'
   */
  mode?: FormModalMode;
  
  /**
   * Modal title override
   */
  title?: string;
  
  /**
   * Modal description override
   */
  description?: string;
  
  /**
   * Modal size
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /**
   * Show loading spinner while schema/entity loads
   */
  showLoadingSpinner?: boolean;

  /**
   * Optional preloaded entity data for edit mode to skip refetching.
   */
  getInitialEntityData?: UseFormModalOptions['getInitialEntityData'];

  /**
   * Optional initial values for create mode (e.g. pre-filled parent in hierarchy view)
   */
  initialValues?: Record<string, any>;

  /**
   * Hide the dialog header (title/description) when true
   * Useful when embedding in a modal to avoid duplicate headers
   */
  hideDialogHeader?: boolean;

  /**
   * Hide the X close button in the top right when true
   * Useful when embedding in a modal to avoid duplicate close buttons
   */
  hideCloseButton?: boolean;
}

/**
 * Unified FormModal component that handles both create and edit modes
 * 
 * @example
 * ```tsx
 * // Create mode
 * <FormModal
 *   schemaId={schemaId}
 *   mode="create"
 *   enrichData={(data) => ({ ...data, referenceId: currentItem.id })}
 *   onSuccess={() => console.log('Created!')}
 * />
 * 
 * // Edit mode
 * <FormModal
 *   schemaId={schemaId}
 *   entityId={entity.id}
 *   mode="edit"
 *   enrichData={(data, id) => ({ ...data, updatedAt: new Date() })}
 *   onSuccess={() => console.log('Updated!')}
 * />
 * ```
 */
export const FormModal: React.FC<FormModalProps> = ({
  schemaId,
  entityId,
  mode = 'create',
  title,
  description,
  size = 'xl',
  showLoadingSpinner = true,
  enrichData,
  onSuccess,
  onClose,
  getInitialSchema,
  getInitialEntityData,
  initialValues,
  hideDialogHeader = false,
  hideCloseButton = false,
}) => {
  const {
    targetSchema,
    entityData,
    mode: currentMode,
    isOpen,
    isSubmitting,
    formError,
    formErrorStatusCode,
    formMessage,
    loadError,
    isLoading,
    openFormModal,
    closeFormModal,
    handleSubmit,
    clearFormError,
    clearLoadError,
  } = useFormModal({
    enrichData,
    onSuccess,
    onClose,
    getInitialSchema,
    getInitialEntityData,
  });

  // Register dialog for back button handling on mobile
  useDialogBackHandler(isOpen, closeFormModal, 'modal', 'form-modal');

  // Track the last opened combination to prevent duplicate opens
  const lastOpenedRef = React.useRef<{ schemaId?: string; entityId?: string; mode?: FormModalMode }>({});

  // Auto-open modal if schemaId is provided
  React.useEffect(() => {
    const shouldOpen = schemaId && (!isOpen && !targetSchema && !isLoading);
    const isNewCombination = 
      lastOpenedRef.current.schemaId !== schemaId || 
      lastOpenedRef.current.entityId !== entityId ||
      lastOpenedRef.current.mode !== mode;
    
    if (shouldOpen && isNewCombination) {
      lastOpenedRef.current = { schemaId, entityId, mode };
      
      if (mode === 'edit' && entityId) {
        openFormModal(schemaId, 'edit', entityId);
      } else {
        openFormModal(schemaId, 'create');
      }
    }
    
    // Reset when modal closes
    if (!isOpen && !targetSchema) {
      lastOpenedRef.current = {};
    }
  }, [schemaId, entityId, mode, isOpen, targetSchema, isLoading, openFormModal]);

  const entityDisplayTitle = React.useMemo(
    () => getEntityDisplayTitle(targetSchema ?? undefined, entityData ?? undefined),
    [targetSchema, entityData]
  );

  const shouldRender = isOpen || Boolean(targetSchema);

  const modalMode = currentMode || mode;
  const isEdit = modalMode === 'edit';

  const schemaName = targetSchema?.name || 'Item';
  const defaultTitle = isEdit ? (entityDisplayTitle ? `Edit ${schemaName}: ${entityDisplayTitle}` : `Edit ${schemaName}`) : `Create New ${schemaName}`;

  const schemaIconName = targetSchema?.icon;

  const modalTitle = React.useMemo(() => {
    if (title) {
      return title;
    }

    if (isEdit && schemaIconName) {
      return (
        <span className="inline-flex items-center gap-2">
          <IconRenderer iconName={schemaIconName} className="h-5 w-5 text-violet-600" />
          <span>{defaultTitle}</span>
        </span>
      );
    }

    return defaultTitle;
  }, [title, isEdit, schemaIconName, defaultTitle]);
  
  // Memoize initialValues to prevent unnecessary form resets
  const memoizedInitialValues = React.useMemo(() => {
    return isEdit && entityData ? entityData : {};
  }, [isEdit, entityData]);
    
  const modalDescription = description || (isEdit
    ? `Update ${(targetSchema?.name || 'item').toLowerCase()} information`
    : `Add a new ${(targetSchema?.name || 'item').toLowerCase()} to your system`);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeFormModal}
      title={modalTitle}
      description={modalDescription}
      size={size}
      showCloseButton={false}
      hideDialogHeader={hideDialogHeader}
      hideCloseButton={hideCloseButton}
    >
      {/* Loading indicator for schema/entity loading */}
      {isLoading && showLoadingSpinner && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <Spinner size="lg" variant="primary" />
            <span className="text-sm font-medium text-gray-600">Loading form...</span>
          </div>
        </div>
      )}

      {/* Loading indicator for form submission */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/60 flex items-center justify-center z-50 rounded-lg">
          <div className="flex flex-col items-center space-y-3 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-100 dark:border-gray-700">
            <Spinner size="lg" variant="primary" />
            <span className="text-lg font-medium text-violet-700 dark:text-violet-300">
              {isEdit ? 'Updating' : 'Creating'} {targetSchema?.name?.toLowerCase() || 'item'}...
            </span>
          </div>
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <FormAlert
          type="error"
          message={loadError}
          className="mb-4"
          dismissible
          onDismiss={clearLoadError}
        />
      )}

      {/* Form */}
      {targetSchema && !isLoading && (
        <SchemaFormWrapper
          key={isEdit && entityId ? `edit-${entityId}` : `create-${targetSchema.id}`}
          schema={targetSchema}
          onSubmit={handleSubmit}
          onReset={() => {}}
          onCancel={closeFormModal}
          initialValues={
            isEdit && entityData
              ? memoizedInitialValues
              : initialValues || memoizedInitialValues
          }
          error={formError || undefined}
          message={formMessage}
          errorStatusCode={formErrorStatusCode}
          onErrorDismiss={clearFormError}
          disabled={isSubmitting}
          hideCollapseExpandButtons={true}
          forceExpandedSections={true}
        />
      )}
    </Modal>
  );
};

FormModal.displayName = 'FormModal';

