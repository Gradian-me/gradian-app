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
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { replaceDynamicContext, replaceDynamicContextInObject } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { FormDialogErrorBoundary } from './FormDialogErrorBoundary';
import { Button } from '@/components/ui/button';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getSchemaTranslatedSingularName } from '@/gradian-ui/schema-manager/utils/schema-utils';
import { Maximize2, Minimize2 } from 'lucide-react';
import { ConfirmationMessage } from '../form-elements/components/ConfirmationMessage';

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

  const filtered = schema.fields?.filter(
    (field) =>
      field.component === 'text' &&
      (!field.role || !EXCLUDED_TITLE_ROLES.has(field.role)) &&
      hasDisplayValue(data[field.name])
  ) ?? [];
  const textFields = [...filtered].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  if (textFields.length > 0) {
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
  onIncompleteSave,
  onClose,
  getInitialSchema,
  getInitialEntityData,
  initialValues,
  hideDialogHeader = false,
  hideCloseButton = false,
  referenceEntityData,
}) => {
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Create customActionSubmit handler using useCallback to maintain hook order consistency
  const customActionSubmit = React.useCallback(async (formData: Record<string, any>, schema: any) => {
    // Only intercept action-forms that have a callApi quick action
    if (schema.schemaType !== 'action-form') {
      throw new Error('skip-default-submit');
    }
    const qa = schema.detailPageMetadata?.quickActions?.find((q: any) => q.action === 'callApi');
    if (!qa?.submitRoute) {
      // If action form doesn't have a callApi action, just close the modal
      // This allows action forms that only have other action types (like openMetadataEditor)
      // to be used as containers without requiring form submission
      return; // Return successfully to close the modal
    }
    // If a payloadTemplate is provided, apply dynamic context replacement; otherwise use raw formData
    let payload = qa.payloadTemplate
      ? replaceDynamicContextInObject(
          qa.payloadTemplate,
          {
          formSchema: schema,
          formData,
          referenceData: referenceEntityData,
          } as any
        )
      : formData;
    
    // Add encrypted skip_key to body for POST/PUT/PATCH requests if passSkipKey is true
    if (qa.passSkipKey) {
      try {
        const { getEncryptedSkipKey } = await import('@/gradian-ui/shared/utils/skip-key-storage');
        const method = qa.submitMethod || 'POST';
        const isBodyMethod = method === 'POST' || method === 'PUT' || method === 'PATCH';
        
        if (isBodyMethod) {
          const encryptedSkipKey = getEncryptedSkipKey(false); // Get as object for body (not URL-encoded)
          if (encryptedSkipKey) {
            // Ensure payload is an object before adding skip_key
            const basePayload = typeof payload === 'object' && payload !== null ? payload : {};
            payload = {
              ...basePayload,
              skip_key: encryptedSkipKey, // This will be an object {ciphertext, iv} that gets properly stringified
            };
            loggingCustom(LogType.CLIENT_LOG, 'log', `[FormModal] Added encrypted skip_key to action form payload: ${JSON.stringify({
              endpoint: qa.submitRoute,
              method,
              hasSkipKey: !!payload.skip_key,
              skipKeyType: typeof payload.skip_key,
              skipKeyStructure: payload.skip_key && typeof payload.skip_key === 'object' ? Object.keys(payload.skip_key) : 'N/A',
            })}`);
          } else {
            loggingCustom(LogType.CLIENT_LOG, 'warn', '[FormModal] passSkipKey is true but encrypted skip key is not available. Make sure NEXT_PUBLIC_SKIP_KEY is set and initializeSkipKeyStorage() has been called.');
          }
        } else {
          // For GET/DELETE requests, add skip_key to query parameters
          const encryptedSkipKey = getEncryptedSkipKey(true); // Get as URL-encoded string for query params
          if (encryptedSkipKey) {
            const url = new URL(qa.submitRoute, window.location.origin);
            url.searchParams.set('skip_key', encryptedSkipKey as string);
            // Note: endpoint will be replaced below, but we need to handle this differently
            loggingCustom(LogType.CLIENT_LOG, 'warn', '[FormModal] passSkipKey for GET/DELETE requests should be handled via DynamicQuickActions, not FormModal.');
          }
        }
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `[FormModal] Error adding skip_key: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    const endpoint = replaceDynamicContext(
      qa.submitRoute,
      {
        formSchema: schema,
        formData: payload,
        referenceData: referenceEntityData,
      } as any
    );
    const method = qa.submitMethod || 'POST';
    
    // Log the final payload before sending (especially to verify skip_key)
    if (qa.passSkipKey) {
      loggingCustom(LogType.CLIENT_LOG, 'log', `[FormModal] Sending request with payload: ${JSON.stringify({
        endpoint,
        method,
        hasSkipKey: !!(payload && typeof payload === 'object' && 'skip_key' in payload),
        payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
        skipKeyPresent: !!(payload && typeof payload === 'object' && payload.skip_key),
      })}`);
    }
    
    const response = await apiRequest(endpoint, {
      method,
      body: payload,
      callerName: 'FormModal.customActionSubmit',
    });
    
    // Check if the request was successful
    if (!response.success) {
      const errorMessage = response.error || 'Request failed';
      loggingCustom(LogType.CLIENT_LOG, 'error', `[FormModal] API request failed: ${JSON.stringify({
        endpoint,
        method,
        error: errorMessage,
        statusCode: response.statusCode,
        hasSkipKey: !!(payload && typeof payload === 'object' && 'skip_key' in payload),
      })}`);
      throw new Error(errorMessage);
    }
    
    return response;
  }, [referenceEntityData]);

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
    onIncompleteSave,
    onClose,
    getInitialSchema,
    getInitialEntityData,
    customActionSubmit,
  });

  const [submitForm, setSubmitForm] = React.useState<(() => void) | null>(null);
  const [formDirty, setFormDirty] = React.useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = React.useState(false);

  const handleClose = React.useCallback(() => {
    if (formDirty) {
      setShowUnsavedConfirm(true);
      return;
    }
    closeFormModal();
  }, [formDirty, closeFormModal]);

  const handleConfirmDiscard = React.useCallback(() => {
    setShowUnsavedConfirm(false);
    setFormDirty(false);
    closeFormModal();
  }, [closeFormModal]);

  // Reset dirty when modal closes so next open doesn't show stale state
  React.useEffect(() => {
    if (!isOpen) {
      setFormDirty(false);
      setShowUnsavedConfirm(false);
    }
  }, [isOpen]);

  // Register dialog for back button handling on mobile (uses handleClose so unsaved warning can show)
  useDialogBackHandler(isOpen, handleClose, 'modal', 'form-modal');

  // Warn before refresh or closing tab when form has unsaved changes
  React.useEffect(() => {
    if (!isOpen || !formDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, formDirty]);

  // Track the last opened combination to prevent duplicate opens
  const lastOpenedRef = React.useRef<{ schemaId?: string; entityId?: string; mode?: FormModalMode; attempted?: boolean; hasError?: boolean }>({});
  const isOpeningRef = React.useRef(false);

  // Auto-open modal if schemaId is provided
  React.useEffect(() => {
    // Prevent if already opening
    if (isOpeningRef.current) {
      return;
    }

    const combinationKey = `${schemaId}-${entityId}-${mode}`;
    const lastCombinationKey = `${lastOpenedRef.current.schemaId}-${lastOpenedRef.current.entityId}-${lastOpenedRef.current.mode}`;
    const isNewCombination = combinationKey !== lastCombinationKey;
    
    // Check if we've already attempted this exact combination
    const hasAttempted = lastOpenedRef.current.attempted && combinationKey === lastCombinationKey;
    const hasError = lastOpenedRef.current.hasError && combinationKey === lastCombinationKey;
    
    // Don't open if:
    // 1. Already attempted this combination (prevents loops)
    // 2. There's a current load error for this combination
    // 3. Modal is already open or loading
    const shouldOpen = schemaId && 
      (!isOpen && !targetSchema && !isLoading) && 
      (isNewCombination || (!hasAttempted && !hasError)) &&
      !loadError;
    
    if (shouldOpen) {
      isOpeningRef.current = true;
      lastOpenedRef.current = { 
        schemaId, 
        entityId, 
        mode, 
        attempted: true,
        hasError: false // Reset error flag for new attempt
      };
      
      if (mode === 'edit' && entityId) {
        openFormModal(schemaId, 'edit', entityId).catch(() => {
          // Mark as having error if openFormModal fails
          if (lastOpenedRef.current.schemaId === schemaId && 
              lastOpenedRef.current.entityId === entityId &&
              lastOpenedRef.current.mode === mode) {
            lastOpenedRef.current.hasError = true;
          }
        }).finally(() => {
          isOpeningRef.current = false;
        });
      } else {
        openFormModal(schemaId, 'create').catch(() => {
          // Mark as having error if openFormModal fails
          if (lastOpenedRef.current.schemaId === schemaId && 
              lastOpenedRef.current.entityId === entityId &&
              lastOpenedRef.current.mode === mode) {
            lastOpenedRef.current.hasError = true;
          }
        }).finally(() => {
          isOpeningRef.current = false;
        });
      }
    }
    
    // Update error flag if loadError is set
    if (loadError && combinationKey === lastCombinationKey) {
      lastOpenedRef.current.hasError = true;
    }
    
    // Reset when modal closes or when schemaId/entityId changes to a new combination
    if (!isOpen && !targetSchema && !isLoading) {
      if (isNewCombination || !schemaId) {
        lastOpenedRef.current = {};
        isOpeningRef.current = false;
      }
    }
  }, [schemaId, entityId, mode, isOpen, targetSchema, isLoading, loadError, openFormModal]);

  const entityDisplayTitle = React.useMemo(
    () => getEntityDisplayTitle(targetSchema ?? undefined, entityData ?? undefined),
    [targetSchema, entityData]
  );

  const shouldRender = isOpen || Boolean(targetSchema);

  const modalMode = currentMode || mode;
  const isEdit = modalMode === 'edit';
  const isActionForm = targetSchema?.schemaType === 'action-form';
  const actionFormQuickAction = targetSchema?.detailPageMetadata?.quickActions?.find(
    (qa) => qa.action === 'callApi'
  );

  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();
  const translatedSingular = targetSchema
    ? getSchemaTranslatedSingularName(targetSchema, language, targetSchema.singular_name || targetSchema.name || getT(TRANSLATION_KEYS.LABEL_ITEM, language, defaultLang))
    : getT(TRANSLATION_KEYS.LABEL_ITEM, language, defaultLang);
  const schemaDisplayName = targetSchema?.singular_name || targetSchema?.name || 'Item';
  const defaultTitle = isEdit
    ? (entityDisplayTitle
        ? `${getT(TRANSLATION_KEYS.TITLE_EDIT, language, defaultLang)} ${translatedSingular}: ${entityDisplayTitle}`
        : `${getT(TRANSLATION_KEYS.TITLE_EDIT, language, defaultLang)} ${translatedSingular}`)
    : `${getT(TRANSLATION_KEYS.TITLE_CREATE_NEW, language, defaultLang)} ${translatedSingular}`;

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
  // Include entityId in dependencies to ensure update when entity is saved as incomplete
  const memoizedInitialValues = React.useMemo(() => {
    if (isEdit && entityData) {
      return entityData;
    }
    // Merge initialValues with entityData if entityData has ID (for incomplete saves)  
    if (entityData?.id && initialValues) {
      return { ...initialValues, ...entityData };
    }
    return initialValues || {};
  }, [isEdit, entityData, entityId, initialValues]);
    
  const modalDescription = description || (isEdit
    ? getT(TRANSLATION_KEYS.DESC_UPDATE_ENTITY_INFORMATION, language, defaultLang).replace('{name}', translatedSingular)
    : getT(TRANSLATION_KEYS.DESC_ADD_NEW_ENTITY_TO_SYSTEM, language, defaultLang).replace('{name}', translatedSingular));

  if (!shouldRender) {
    return null;
  }

  const modalContentResetKey = `${schemaId ?? ''}-${entityId ?? ''}-${mode}`;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      description={modalDescription}
      size={size}
      className={isMaximized ? 'lg:max-w-[100vw] lg:max-h-screen' : undefined}
      showCloseButton={false}
      hideDialogHeader={hideDialogHeader}
      hideCloseButton={hideCloseButton}
      headerActions={
        !hideDialogHeader ? (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => setIsMaximized((prev) => !prev)}
              aria-label={isMaximized ? 'Restore form size' : 'Maximize form'}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        ) : undefined
      }
    >
      <FormDialogErrorBoundary onClose={handleClose} resetKey={modalContentResetKey}>
        {/* Quick actions popover is now rendered inline with action buttons in FormLifecycleManager */}

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
                {isEdit ? getT(TRANSLATION_KEYS.MESSAGE_UPDATING, language, defaultLang) : getT(TRANSLATION_KEYS.MESSAGE_CREATING, language, defaultLang)} {translatedSingular}...
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
            key={entityId ? `edit-${entityId}-${targetSchema.id}` : `create-${targetSchema.id}`}
            schema={targetSchema}
            onSubmit={handleSubmit}
            onReset={() => {}}
            onCancel={handleClose}
            initialValues={memoizedInitialValues}
            referenceEntityData={referenceEntityData}
            error={formError || undefined}
            message={formMessage}
            errorStatusCode={formErrorStatusCode}
            onErrorDismiss={clearFormError}
            disabled={isSubmitting}
            hideCollapseExpandButtons={true}
            forceExpandedSections={true}
            hideActions={isActionForm}
            onMount={(submitFn) => setSubmitForm(() => submitFn)}
            onFormStateChange={(s) => setFormDirty(s.dirty)}
          />
        )}
        {isActionForm && !isLoading && (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => submitForm?.()}
              disabled={isSubmitting}
            >
              {actionFormQuickAction?.label || title || 'Submit'}
            </Button>
          </div>
        )}
      </FormDialogErrorBoundary>
    </Modal>

    {/* Unsaved changes confirmation */}
    <ConfirmationMessage
      isOpen={showUnsavedConfirm}
      onOpenChange={(open) => !open && setShowUnsavedConfirm(false)}
      title={getT(TRANSLATION_KEYS.TITLE_UNSAVED_CHANGES, language, defaultLang)}
      message={getT(TRANSLATION_KEYS.MESSAGE_UNSAVED_CHANGES_LEAVE, language, defaultLang)}
      variant="warning"
      buttons={[
        {
          label: getT(TRANSLATION_KEYS.BUTTON_STAY, language, defaultLang),
          variant: 'outline',
          action: () => setShowUnsavedConfirm(false),
        },
        {
          label: getT(TRANSLATION_KEYS.BUTTON_DISCARD, language, defaultLang),
          variant: 'destructive',
          action: handleConfirmDiscard,
        },
      ]}
    />
  </>
  );
};

FormModal.displayName = 'FormModal';

