// Schema-based Form Wrapper Component

import { CompanySelector } from '@/components/layout/CompanySelector';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import {
  FormContextType,
  FormData,
  FormErrors,
  FormSchema,
  FormState,
  FormWrapperProps
} from '@/gradian-ui/schema-manager/types/form-schema';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { cn, validateField as validateFieldUtil } from '@/gradian-ui/shared/utils';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { ulid } from 'ulid';
import { GoToTopForm } from '../form-elements/go-to-top-form';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { useUserStore } from '@/stores/user.store';
import { getActionConfig, getSingularName, isEditMode } from '../utils/action-config';
import { AccordionFormSection } from './AccordionFormSection';
import { FormModal } from './FormModal';
import { FormSystemSection } from './FormSystemSection';
import { ExpandCollapseControls } from '@/gradian-ui/data-display/components/HierarchyExpandCollapseControls';
import { replaceDynamicContext } from '../utils/dynamic-context-replacer';
import { AiFormFillerDialog } from '@/domains/ai-builder/components/AiFormFillerDialog';
import { Sparkles, MoreVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DynamicQuickActions } from '@/gradian-ui/data-display/components/DynamicQuickActions';

// Form Context
const FormContext = createContext<FormContextType | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a SchemaFormWrapper');
  }
  return context;
};

// Helper function to merge initial values with default values from schema
const mergeInitialValuesWithDefaults = (
  initialValues: FormData,
  schema: FormSchema,
  referenceEntityData?: Record<string, any>
): FormData => {
  const mergedValues = { ...initialValues };

  const fields = Array.isArray(schema?.fields) ? schema.fields : [];
  const sections = Array.isArray(schema?.sections) ? schema.sections : [];
  if (fields.length === 0) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[mergeInitialValuesWithDefaults] Schema fields is missing or not an array: ${JSON.stringify({ schemaId: schema?.id })}`);
    return mergedValues;
  }

  // Process all fields to apply default values where needed
  fields.forEach(field => {
    // Skip if field is in a repeating section (handled separately)
    const section = sections.find(s => s.id === field.sectionId);
    if (section?.isRepeatingSection) {
      return;
    }

    // Check if existing value is a template string that needs resolution
    const currentValue = mergedValues[field.name];
    if (typeof currentValue === 'string' && currentValue.includes('{{') && currentValue.includes('}}')) {
      const resolved = replaceDynamicContext(currentValue, {
        formSchema: schema,
        formData: mergedValues,
        referenceData: referenceEntityData ?? useDynamicFormContextStore.getState().referenceData,
      } as any);
      mergedValues[field.name] = resolved;
    }
    // Apply defaultValue if field value is undefined, null, or empty string
    else if (field.defaultValue !== undefined &&
      (mergedValues[field.name] === undefined ||
        mergedValues[field.name] === null ||
        mergedValues[field.name] === '')) {
      const resolvedDefault = typeof field.defaultValue === 'string'
        ? replaceDynamicContext(field.defaultValue, {
          formSchema: schema,
          formData: mergedValues,
          referenceData: referenceEntityData ?? useDynamicFormContextStore.getState().referenceData,
        } as any)
        : field.defaultValue;
      mergedValues[field.name] = resolvedDefault;
    }
  });

  return mergedValues;
};

// Helper function to ensure repeating section items have unique IDs
const ensureRepeatingItemIds = (
  values: FormData,
  schema: FormSchema,
  referenceEntityData?: Record<string, any>
): FormData => {
  const newValues = mergeInitialValuesWithDefaults(values, schema, referenceEntityData);

  const sections = Array.isArray(schema?.sections) ? schema.sections : [];
  const fields = Array.isArray(schema?.fields) ? schema.fields : [];
  if (sections.length === 0) {
    loggingCustom(LogType.CLIENT_LOG, 'warn', `[ensureRepeatingItemIds] Schema sections is missing or not an array: ${JSON.stringify({ schemaId: schema?.id })}`);
    return newValues;
  }

  sections.forEach(section => {
    if (section.isRepeatingSection) {
      // Initialize repeating sections to empty array if they don't exist or are null/undefined
      if (!newValues[section.id] || !Array.isArray(newValues[section.id])) {
        newValues[section.id] = [];
      }

      const items = newValues[section.id];
      if (Array.isArray(items)) {
        newValues[section.id] = items.map((item: any, index: number) => {
          // Only add id if it doesn't already exist
          if (!item.id) {
            const itemWithId = {
              ...item,
              id: ulid()
            };

            // Apply default values to repeating section items
            const sectionFields = fields.filter(f => f.sectionId === section.id);
            sectionFields.forEach(field => {
              if (field.defaultValue !== undefined &&
                (itemWithId[field.name] === undefined ||
                  itemWithId[field.name] === null ||
                  itemWithId[field.name] === '')) {
                const resolvedDefault = typeof field.defaultValue === 'string'
                  ? replaceDynamicContext(field.defaultValue, {
                    formSchema: schema,
                    formData: itemWithId,
                    referenceData: referenceEntityData ?? useDynamicFormContextStore.getState().referenceData,
                  } as any)
                  : field.defaultValue;
                itemWithId[field.name] = resolvedDefault;
              }
            });

            return itemWithId;
          }

          // Apply default values to existing items too
          const sectionFields = fields.filter(f => f.sectionId === section.id);
          sectionFields.forEach(field => {
            if (field.defaultValue !== undefined &&
              (item[field.name] === undefined ||
                item[field.name] === null ||
                item[field.name] === '')) {
              const resolvedDefault = typeof field.defaultValue === 'string'
                ? replaceDynamicContext(field.defaultValue, {
                  formSchema: schema,
                  formData: item,
                  referenceData: referenceEntityData ?? useDynamicFormContextStore.getState().referenceData,
                } as any)
                : field.defaultValue;
              item[field.name] = resolvedDefault;
            }
          });

          return item;
        });
      }
    }
  });

  return newValues;
};

// Form State Reducer
type FormAction =
  | { type: 'SET_VALUE'; fieldName: string; value: any }
  | { type: 'SET_ERROR'; fieldName: string; error: string }
  | { type: 'SET_TOUCHED'; fieldName: string; touched: boolean }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET'; initialValues: FormData; schema: FormSchema; referenceEntityData?: Record<string, any> }
  | { type: 'VALIDATE_FIELD'; fieldName: string; schema: FormSchema }
  | { type: 'VALIDATE_FORM'; schema: FormSchema }
  | { type: 'ADD_REPEATING_ITEM'; sectionId: string; defaultValue: any }
  | { type: 'REMOVE_REPEATING_ITEM'; sectionId: string; index: number }
  | { type: 'UPDATE_ENTITY_AFTER_SAVE'; entityData: Record<string, any> };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_VALUE': {
      // Handle nested paths for repeating sections (e.g., "contacts[0].name")
      const match = action.fieldName.match(/^(.+)\[(\d+)\]\.(.+)$/);

      if (match) {
        // This is a repeating section field
        const [, sectionId, itemIndex, fieldName] = match;
        const index = parseInt(itemIndex);
        const currentArray = state.values[sectionId] || [];

        // Create a deep copy of the array to avoid mutations
        const newArray = currentArray.map((item: any) => ({ ...item }));

        // Ensure the array is long enough and item exists at this index
        while (newArray.length <= index) {
          newArray.push({
            id: ulid()
          });
        }

        // If item at index doesn't have required structure, ensure it has an ID
        if (!newArray[index].id) {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `[FormReducer] Item at index ${index} missing id, adding one`);
          newArray[index] = {
            ...newArray[index],
            id: ulid()
          };
        }

        // Update the specific field in the item, preserving all other fields including id
        newArray[index] = {
          ...newArray[index],
          [fieldName]: action.value,
        };

        loggingCustom(LogType.CLIENT_LOG, 'log', `[FormReducer] Updating repeating section item: ${JSON.stringify({
          sectionId,
          itemIndex: index,
          fieldName,
          value: action.value,
          itemId: newArray[index].id,
          before: currentArray[index],
          after: newArray[index],
        })}`);

        return {
          ...state,
          values: {
            ...state.values,
            [sectionId]: newArray,
          },
          dirty: true,
        };
      }

      // Regular field update
      loggingCustom(LogType.CLIENT_LOG, 'log', `[FormReducer] Updating regular field: ${JSON.stringify({
        fieldName: action.fieldName,
        value: action.value,
      })}`);

      return {
        ...state,
        values: { ...state.values, [action.fieldName]: action.value },
        dirty: true,
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.fieldName]: action.error },
      };

    case 'SET_TOUCHED':
      return {
        ...state,
        touched: { ...state.touched, [action.fieldName]: action.touched },
      };

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting,
      };

    case 'RESET':
      // Dispatch custom event to trigger formula refresh in dialogs
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('form-reset', {
          detail: { schemaId: action.schema?.id }
        }));
      }
      return {
        values: ensureRepeatingItemIds(action.initialValues, action.schema, action.referenceEntityData),
        errors: {},
        touched: {},
        dirty: false,
        isValid: true,
        isSubmitting: false,
      };

    case 'VALIDATE_FIELD': {
      const fields = Array.isArray(action.schema?.fields) ? action.schema.fields : [];
      // Handle nested paths for repeating sections (e.g., "contacts[0].name")
      const match = action.fieldName.match(/^(.+)\[(\d+)\]\.(.+)$/);

      let field;
      let fieldValue;

      if (match) {
        // This is a repeating section field
        const [, sectionId, itemIndex, fieldName] = match;
        const index = parseInt(itemIndex);
        field = fields.find(f => f.sectionId === sectionId && f.name === fieldName);
        fieldValue = state.values[sectionId]?.[index]?.[fieldName];
      } else {
        // Regular field
        field = fields.find(f => f.name === action.fieldName);
        fieldValue = state.values[action.fieldName];
      }

      if (!field) return state;

      // Check if field should be validated (required or has validation rules)
      const isRequired = field.validation?.required ?? false;
      if (!isRequired && !field.validation) return state;

      const validationRules = {
        ...field.validation,
        required: field.validation?.required ?? false
      };
      const result = validateFieldUtil(fieldValue, validationRules);
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.fieldName]: result.isValid ? '' : result.error || 'Invalid value',
        },
      };
    }

    case 'VALIDATE_FORM': {
      const newErrors: FormErrors = {};
      let isValid = true;
      const fields = Array.isArray(action.schema?.fields) ? action.schema.fields : [];

      fields.forEach(field => {
        // Check if field is required or has validation rules
        const isRequired = field.validation?.required ?? false;
        if (isRequired || field.validation) {
          const validationRules = {
            ...field.validation,
            required: field.validation?.required ?? false
          };
          const result = validateFieldUtil(state.values[field.name], validationRules);
          if (!result.isValid) {
            newErrors[field.name] = result.error || 'Invalid value';
            isValid = false;
          }
        }
      });

      return {
        ...state,
        errors: newErrors,
        isValid,
      };
    }

    case 'ADD_REPEATING_ITEM': {
      const currentArray = state.values[action.sectionId] || [];
      // Add a unique ID to help React track items properly
      const itemWithId = {
        ...action.defaultValue,
        id: ulid()
      };
      return {
        ...state,
        values: {
          ...state.values,
          [action.sectionId]: [...currentArray, itemWithId],
        },
        dirty: true,
      };
    }

    case 'REMOVE_REPEATING_ITEM': {
      const currentArray = state.values[action.sectionId] || [];
      const newArray = currentArray.filter((_: any, index: number) => index !== action.index);
      return {
        ...state,
        values: {
          ...state.values,
          [action.sectionId]: newArray,
        },
        dirty: true,
      };
    }

    case 'UPDATE_ENTITY_AFTER_SAVE': {
      // Update entity data (especially ID) after save without marking as dirty
      // This allows the form to update when saved as incomplete
      return {
        ...state,
        values: {
          ...state.values,
          ...action.entityData,
        },
        // Don't mark as dirty - this is just updating to reflect saved state
      };
    }

    default:
      return state;
  }
};

export const SchemaFormWrapper: React.FC<FormWrapperProps> = ({
  schema,
  onSubmit,
  onReset,
  onCancel,
  onFieldChange,
  initialValues = {},
  referenceEntityData,
  validationMode = 'onSubmit',
  disabled = false,
  className,
  children,
  onMount,
  hideActions = false,
  error,
  message,
  errorStatusCode,
  onErrorDismiss,
  hideCollapseExpandButtons = false,
  forceExpandedSections = false,
  hideGoToTopButton = false,
  ...props
}) => {
  // Normalize schema so sections/fields are always arrays (never null) - prevents "Cannot read properties of null (reading 'length')"
  const safeSchema = useMemo((): FormSchema => {
    if (!schema || typeof schema !== 'object') {
      return {
        id: 'unknown',
        name: 'Item',
        title: 'Items',
        singular_name: 'Item',
        plural_name: 'Items',
        sections: [],
        fields: [],
        detailPageMetadata: { sections: [], componentRenderers: [], tableRenderers: [], quickActions: [] },
      } as FormSchema;
    }
    const sections = Array.isArray(schema.sections) ? schema.sections : [];
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    const dpm = schema.detailPageMetadata;
    const detailPageMetadata = dpm != null
      ? {
          ...dpm,
          sections: Array.isArray(dpm.sections) ? dpm.sections : [],
          componentRenderers: Array.isArray(dpm.componentRenderers) ? dpm.componentRenderers : [],
          tableRenderers: Array.isArray(dpm.tableRenderers) ? dpm.tableRenderers : [],
          quickActions: Array.isArray(dpm.quickActions) ? dpm.quickActions : [],
        }
      : { sections: [] as any[], componentRenderers: [] as any[], tableRenderers: [] as any[], quickActions: [] as any[] };
    return {
      ...schema,
      sections,
      fields,
      detailPageMetadata,
    } as FormSchema;
  }, [schema]);

  // Ref for error alert to scroll to on 400 errors
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const lastErrorStatusCodeRef = useRef<number | undefined>(undefined);

  const [state, dispatch] = useReducer(formReducer, {
    values: ensureRepeatingItemIds(initialValues, safeSchema, referenceEntityData),
    errors: {},
    touched: {},
    dirty: false,
    isValid: true,
    isSubmitting: false,
  });

  const [addItemErrors, setAddItemErrors] = React.useState<Record<string, string | null>>({});
  const [isIncomplete, setIsIncomplete] = React.useState(false);
  // Track if form has been submitted at least once (to show incomplete message only after submit)
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  // Track which sections need items (for better error message)
  const [incompleteSections, setIncompleteSections] = React.useState<string[]>([]);

  // State for AI Form Filler dialog
  const [isFormFillerOpen, setIsFormFillerOpen] = React.useState(false);

  // State to track which sections are expanded
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => {
    // Initialize based on section initialState prop or forceExpandedSections
    const initial: Record<string, boolean> = {};
    if (safeSchema.sections.length > 0) {
      safeSchema.sections.forEach(section => {
        // If forceExpandedSections is true, always expand; otherwise use initialState
        initial[section.id] = forceExpandedSections ? true : (section.initialState !== 'collapsed');
      });
    }
    return initial;
  });

  // Deep comparison to avoid unnecessary resets
  const prevInitialValuesRef = React.useRef<string>(JSON.stringify(initialValues));
  const isInitialMountRef = React.useRef<boolean>(true);

  // Update form state when initialValues change (for editing scenarios)
  // Only reset if the actual content has changed AND form is not dirty (user hasn't made changes)
  useEffect(() => {
    const currentInitialValues = JSON.stringify(initialValues);

    // On initial mount, always initialize (but don't reset if form is already initialized)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevInitialValuesRef.current = currentInitialValues;
      // Don't reset on initial mount - form is already initialized with initialValues in useReducer
      return;
    }

    // Only reset if:
    // 1. The actual content has changed (not just reference)
    // 2. The form is not dirty (user hasn't made changes)
    if (prevInitialValuesRef.current !== currentInitialValues && !state.dirty) {
      prevInitialValuesRef.current = currentInitialValues;
      dispatch({ type: 'RESET', initialValues, schema: safeSchema, referenceEntityData: referenceEntityDataRef.current });
      // Check if loaded entity is incomplete (only for edit mode)
      if (initialValues?.incomplete === true) {
        setIsIncomplete(true);
        setHasSubmitted(true); // Entity was already saved, so consider it submitted
      } else {
        setIsIncomplete(false);
        setHasSubmitted(false); // Reset on new form
      }
    } else if (prevInitialValuesRef.current !== currentInitialValues) {
      // If form is dirty but initialValues changed (e.g., after incomplete save),
      // update the entity ID and other key fields to allow adding items
      const prevValues = JSON.parse(prevInitialValuesRef.current || '{}');
      const newId = initialValues?.id;
      const prevId = prevValues?.id;

      // If ID changed (e.g., from undefined to a value after incomplete save), update it
      if (newId && newId !== prevId && state.values?.id !== newId) {
        dispatch({ type: 'UPDATE_ENTITY_AFTER_SAVE', entityData: { id: newId, ...initialValues } });
      }

      // Update the ref even if we don't reset (to prevent future false positives)
      prevInitialValuesRef.current = currentInitialValues;
    }
  }, [initialValues, schema, state.dirty, state.values?.id]);

  // Update expanded sections when schema sections change
  const sectionIds = useMemo(() => {
    if (!safeSchema?.sections || !Array.isArray(safeSchema.sections)) {
      return '';
    }
    return safeSchema.sections.map(s => s.id).join(',');
  }, [safeSchema?.sections]);

  useEffect(() => {
    setExpandedSections(prev => {
      const newExpanded: Record<string, boolean> = {};
      // Ensure schema has sections array
      if (safeSchema?.sections && Array.isArray(safeSchema.sections)) {
        safeSchema.sections.forEach(section => {
          // If forceExpandedSections is true, always expand; otherwise preserve existing state or use initialState
          newExpanded[section.id] = forceExpandedSections
            ? true
            : (prev[section.id] !== undefined
              ? prev[section.id]
              : (section.initialState !== 'collapsed'));
        });
      }
      return newExpanded;
    });
  }, [sectionIds, forceExpandedSections, safeSchema?.sections]);

  const setValue = useCallback((fieldName: string, value: any) => {
    loggingCustom(LogType.FORM_DATA, 'info', `Setting field "${fieldName}" to: ${JSON.stringify(value)}`);
    dispatch({ type: 'SET_VALUE', fieldName, value });
    onFieldChange?.(fieldName, value);

    if (validationMode === 'onChange') {
      dispatch({ type: 'VALIDATE_FIELD', fieldName, schema: safeSchema });
    }
  }, [onFieldChange, validationMode, safeSchema]);

  const setError = useCallback((fieldName: string, error: string) => {
    dispatch({ type: 'SET_ERROR', fieldName, error });
  }, []);

  const setTouched = useCallback((fieldName: string, touched: boolean) => {
    dispatch({ type: 'SET_TOUCHED', fieldName, touched });

    if (validationMode === 'onBlur') {
      dispatch({ type: 'VALIDATE_FIELD', fieldName, schema: safeSchema });
    }
  }, [validationMode, safeSchema]);

  const validateField = useCallback((fieldName: string) => {
    dispatch({ type: 'VALIDATE_FIELD', fieldName, schema: safeSchema });
    return !state.errors[fieldName];
  }, [safeSchema, state.errors]);

  const validateForm = useCallback(async (): Promise<{ isValid: boolean; isIncomplete: boolean }> => {
    // STEP 1: Validate main form first (required fields, maxItems, field validations)
    // This sets isValid - if false, form should not save
    let isValid = true;
    const newErrors: FormErrors = {};

    safeSchema.sections.forEach(section => {
      // Check repeating section constraints
      if (section.isRepeatingSection && section.repeatingConfig) {
        const { maxItems } = section.repeatingConfig;

        // Check if this is a relation-based repeating section
        const isRelationBased = section.repeatingConfig.targetSchema && section.repeatingConfig.relationTypeId;

        // For regular repeating sections, get item count from form values
        if (!isRelationBased) {
          const items = state.values[section.id] || [];
          const itemCount = items.length;

          // Validate maxItems (this is a real validation error, not incomplete)
          if (maxItems !== undefined && itemCount > maxItems) {
            const sectionLabel = section.title || section.id;
            const errorMessage = `Maximum ${maxItems} item(s) allowed for ${sectionLabel}`;
            newErrors[section.id] = errorMessage;
            isValid = false;
          }

          // Validate fields within each repeating item
          const sectionFields = safeSchema.fields.filter(f => f.sectionId === section.id);
          items.forEach((item: any, itemIndex: number) => {
            sectionFields.forEach(field => {
              // Check if field is required or has validation rules
              const isRequired = field.validation?.required ?? false;
              if (isRequired || field.validation) {
                const validationRules = {
                  ...field.validation,
                  required: field.validation?.required ?? false
                };
                const fieldValue = item[field.name];
                const result = validateFieldUtil(fieldValue, validationRules);
                if (!result.isValid) {
                  const errorKey = `${section.id}[${itemIndex}].${field.name}`;
                  newErrors[errorKey] = result.error || 'Invalid value';
                  isValid = false;
                }
              }
            });
          });
        }
        // Note: For relation-based sections, field validation is handled by the relation items themselves
      } else {
        // Validate individual fields in non-repeating sections
        const sectionFields = safeSchema.fields.filter(f => f.sectionId === section.id);
        sectionFields.forEach(field => {
          // Check if field is required or has validation rules
          const isRequired = field.validation?.required ?? false;
          if (isRequired || field.validation) {
            const validationRules = {
              ...field.validation,
              required: field.validation?.required ?? false
            };
            const result = validateFieldUtil(state.values[field.name], validationRules);
            if (!result.isValid) {
              newErrors[field.name] = result.error || 'Invalid value';
              isValid = false;
            }
          }
        });
      }
    });

    // Custom validation: relatedCompanies is required for company-based schemas
    if (schema.canSelectMultiCompanies && schema.isNotCompanyBased !== true) {
      const relatedCompanies = state.values['relatedCompanies'];
      const hasRelated =
        Array.isArray(relatedCompanies) ? relatedCompanies.length > 0 : Boolean(relatedCompanies);

      if (!hasRelated) {
        const errorMessage = 'Please select at least one related company.';
        newErrors['relatedCompanies'] = errorMessage;
        isValid = false;
      }
    }

    // Custom validation: status is required when statusGroup is configured
    const hasStatusGroup = Array.isArray(schema.statusGroup) && schema.statusGroup.length > 0;
    if (hasStatusGroup) {
      const status = state.values['status'];
      const hasStatus =
        Array.isArray(status) ? status.length > 0 : Boolean(status);

      if (!hasStatus) {
        const errorMessage = 'Status is required.';
        newErrors['status'] = errorMessage;
        isValid = false;
      }
    }

    // Update errors in state immediately and mark fields as touched
    Object.entries(newErrors).forEach(([fieldName, error]) => {
      dispatch({ type: 'SET_ERROR', fieldName, error });
      dispatch({ type: 'SET_TOUCHED', fieldName, touched: true });
    });

    // Clear errors for fields that are now valid
    Object.keys(state.errors).forEach(fieldName => {
      if (!newErrors[fieldName] && state.errors[fieldName]) {
        dispatch({ type: 'SET_ERROR', fieldName, error: '' });
      }
    });

    // STEP 2: Check minItems - if form is already incomplete, minItems becomes a blocking validation error
    // If form is not yet incomplete, allow saving with incomplete flag (first save)
    let isIncomplete = false;
    const isAlreadyIncomplete = state.values?.incomplete === true || initialValues?.incomplete === true;

    if (isValid) {
      // For relation-based sections, we need to fetch relations count for validation
      const relationCounts: Record<string, number> = {};
      const hasEntityId = !!(state.values?.id);

      // Fetch relation counts for relation-based sections
      if (hasEntityId) {
        const relationPromises = safeSchema.sections
          .filter(section =>
            section.isRepeatingSection &&
            section.repeatingConfig?.targetSchema &&
            section.repeatingConfig?.relationTypeId
          )
          .map(async (section) => {
            try {
              // Build query params ensuring 'id' is always last
              const queryParams = new URLSearchParams();
              queryParams.append('sourceSchema', schema.id);
              queryParams.append('sourceId', state.values.id);
              if (section.repeatingConfig!.relationTypeId) {
                queryParams.append('relationTypeId', section.repeatingConfig!.relationTypeId);
              }
              if (section.repeatingConfig!.targetSchema) {
                queryParams.append('targetSchema', section.repeatingConfig!.targetSchema);
              }
              // If id needs to be added, append it here as the last parameter

              const response = await apiRequest<any>(
                `/api/relations?${queryParams.toString()}`
              );
              if (response.success) {
                const countFromResponse = (response as { count?: number }).count;
                const resolvedCount =
                  typeof countFromResponse === 'number'
                    ? countFromResponse
                    : Array.isArray(response.data)
                      ? response.data.length
                      : 0;
                relationCounts[section.id] = resolvedCount;
              } else {
                relationCounts[section.id] = 0;
              }
            } catch (error) {
              loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching relations count for section ${section.id}: ${error instanceof Error ? error.message : String(error)}`);
              relationCounts[section.id] = 0;
            }
          });

        await Promise.all(relationPromises);
      }

      // Check minItems for all repeating sections (only if main form is valid)
      const sectionsNeedingItems: string[] = [];
      safeSchema.sections.forEach(section => {
        if (section.isRepeatingSection && section.repeatingConfig) {
          const { minItems } = section.repeatingConfig;

          if (minItems !== undefined && minItems > 0) {
            const isRelationBased = section.repeatingConfig.targetSchema && section.repeatingConfig.relationTypeId;

            let itemCount: number;
            if (isRelationBased) {
              const relationValueArray = Array.isArray(state.values[section.id]) ? state.values[section.id] : [];
              if (hasEntityId && relationCounts[section.id] !== undefined) {
                itemCount = relationCounts[section.id];
              } else {
                itemCount = relationValueArray.length;
              }
            } else {
              const items = state.values[section.id] || [];
              itemCount = items.length;
            }

            if (itemCount < minItems) {
              const sectionLabel = section.title || section.id;
              const itemLabel = minItems === 1 ? 'item' : 'items';
              const errorMessage = `At least ${minItems} ${itemLabel} required for ${sectionLabel}`;
              sectionsNeedingItems.push(sectionLabel);

              // If form is already incomplete, minItems becomes a blocking validation error
              // Otherwise, allow first save with incomplete flag
              if (isAlreadyIncomplete) {
                // Form is already incomplete - minItems is now a blocking error
                newErrors[section.id] = errorMessage;
                isValid = false; // Block submission
              } else {
                // First save - allow with incomplete flag
                isIncomplete = true;
                newErrors[section.id] = errorMessage; // Show error but allow save
              }
            }
          }
        }
      });

      // Update incomplete sections list
      setIncompleteSections(sectionsNeedingItems);

      // Update section errors for incomplete sections (after main validation)
      Object.entries(newErrors).forEach(([fieldName, error]) => {
        // Only update section-level errors (not field errors which were already updated)
        if (safeSchema.sections.some(s => s.id === fieldName && s.isRepeatingSection)) {
          dispatch({ type: 'SET_ERROR', fieldName, error });
          dispatch({ type: 'SET_TOUCHED', fieldName, touched: true });
        }
      });

      // Clear errors for sections that are now complete
      safeSchema.sections.forEach(section => {
        if (section.isRepeatingSection && section.repeatingConfig) {
          const { minItems } = section.repeatingConfig;
          if (minItems !== undefined && minItems > 0) {
            const isRelationBased = section.repeatingConfig.targetSchema && section.repeatingConfig.relationTypeId;
            let itemCount: number;
            if (isRelationBased) {
              const relationValueArray = Array.isArray(state.values[section.id]) ? state.values[section.id] : [];
              if (hasEntityId && relationCounts[section.id] !== undefined) {
                itemCount = relationCounts[section.id];
              } else {
                itemCount = relationValueArray.length;
              }
            } else {
              const items = state.values[section.id] || [];
              itemCount = items.length;
            }

            // Clear error if minItems is now met
            if (itemCount >= minItems && state.errors[section.id] && !newErrors[section.id]) {
              dispatch({ type: 'SET_ERROR', fieldName: section.id, error: '' });
            }
          }
        }
      });
    } else {
      // If form is invalid, clear incomplete sections and their errors
      setIncompleteSections([]);
      // Clear any incomplete section errors when form is invalid
      safeSchema.sections.forEach(section => {
        if (section.isRepeatingSection && section.repeatingConfig?.minItems && state.errors[section.id]) {
          // Only clear if it's an incomplete error (not a maxItems error)
          const errorMsg = state.errors[section.id];
          if (errorMsg && errorMsg.includes('At least')) {
            dispatch({ type: 'SET_ERROR', fieldName: section.id, error: '' });
          }
        }
      });
    }

    return { isValid, isIncomplete };
  }, [schema, state.values, state.errors, initialValues]);

  // Check incomplete status (minItems) without full validation
  // This only checks for incomplete status, not required field validation
  const checkIncompleteStatus = useCallback(async (): Promise<boolean> => {
    let isIncomplete = false;
    const hasEntityId = !!(state.values?.id);

    // For relation-based sections, we need to fetch relations count for validation
    const relationCounts: Record<string, number> = {};

    // Fetch relation counts for relation-based sections
    if (hasEntityId) {
      const relationPromises = safeSchema.sections
        .filter(section =>
          section.isRepeatingSection &&
          section.repeatingConfig?.targetSchema &&
          section.repeatingConfig?.relationTypeId
        )
        .map(async (section) => {
          try {
            // Build query params ensuring 'id' is always last
            const queryParams = new URLSearchParams();
            queryParams.append('sourceSchema', schema.id);
            queryParams.append('sourceId', state.values.id);
            if (section.repeatingConfig!.relationTypeId) {
              queryParams.append('relationTypeId', section.repeatingConfig!.relationTypeId);
            }
            if (section.repeatingConfig!.targetSchema) {
              queryParams.append('targetSchema', section.repeatingConfig!.targetSchema);
            }
            // If id needs to be added, append it here as the last parameter

            const response = await apiRequest<any>(
              `/api/relations?${queryParams.toString()}`
            );
            if (response.success) {
              const countFromResponse = (response as { count?: number }).count;
              const resolvedCount =
                typeof countFromResponse === 'number'
                  ? countFromResponse
                  : Array.isArray(response.data)
                    ? response.data.length
                    : 0;
              relationCounts[section.id] = resolvedCount;
            } else {
              relationCounts[section.id] = 0;
            }
          } catch (error) {
            loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching relations count for section ${section.id}: ${error instanceof Error ? error.message : String(error)}`);
            relationCounts[section.id] = 0;
          }
        });

      await Promise.all(relationPromises);
    }

    // Only check minItems for incomplete status, don't validate required fields
    safeSchema.sections.forEach(section => {
      if (section.isRepeatingSection && section.repeatingConfig) {
        const { minItems } = section.repeatingConfig;

        if (minItems !== undefined && minItems > 0) {
          const isRelationBased = section.repeatingConfig.targetSchema && section.repeatingConfig.relationTypeId;

          let itemCount: number;
          if (isRelationBased) {
            const relationValueArray = Array.isArray(state.values[section.id]) ? state.values[section.id] : [];
            if (hasEntityId && relationCounts[section.id] !== undefined) {
              itemCount = relationCounts[section.id];
            } else {
              itemCount = relationValueArray.length;
            }
          } else {
            const items = state.values[section.id] || [];
            itemCount = items.length;
          }

          if (itemCount < minItems) {
            isIncomplete = true;
          }
        }
      }
    });

    return isIncomplete;
  }, [schema, state.values]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET', initialValues, schema, referenceEntityData: referenceEntityDataRef.current });
    onReset?.();
  }, [initialValues, onReset, schema]);

  // State for relation-based repeating sections
  const [relationModalState, setRelationModalState] = React.useState<{
    isOpen: boolean;
    sectionId: string;
    targetSchema?: string;
    relationTypeId?: string;
  }>({ isOpen: false, sectionId: '' });

  // Trigger to refresh relation-based sections (increments when relations are created)
  const [refreshRelationsTrigger, setRefreshRelationsTrigger] = React.useState(0);

  // Dynamic form context (Zustand) - expose formSchema, formData, userData, and referenceData
  const setFormSchemaInContext = useDynamicFormContextStore((s) => s.setFormSchema);
  const setFormDataInContext = useDynamicFormContextStore((s) => s.setFormData);
  const setUserDataInContext = useDynamicFormContextStore((s) => s.setUserData);
  const setReferenceDataInContext = useDynamicFormContextStore((s) => s.setReferenceData);
  const resetDynamicContext = useDynamicFormContextStore((s) => s.reset);
  const currentUser = useUserStore((s) => s.user);

  // Store referenceEntityData in a ref so it can be accessed in the reducer
  const referenceEntityDataRef = React.useRef<Record<string, any> | undefined>(referenceEntityData);
  React.useEffect(() => {
    referenceEntityDataRef.current = referenceEntityData;
  }, [referenceEntityData]);

  useEffect(() => {
    // Initialize dynamic form context when schema changes
    // Set immediately to ensure context is available before fields render
    setFormSchemaInContext(schema);
    setUserDataInContext(currentUser ?? null);
    setReferenceDataInContext(referenceEntityData ?? null);
    // Also set initial form data immediately if available
    if (state.values && Object.keys(state.values).length > 0) {
      setFormDataInContext(state.values);
    }
    return () => {
      resetDynamicContext();
    };
  }, [schema, currentUser, referenceEntityData, setFormSchemaInContext, setUserDataInContext, setReferenceDataInContext, resetDynamicContext]);

  useEffect(() => {
    // Keep form data in sync with Zustand context
    setFormDataInContext(state.values);
  }, [state.values, setFormDataInContext]);

  // Re-process defaultValues when referenceEntityData becomes available
  useEffect(() => {
    if (!referenceEntityData || state.dirty) return;

    // Check if any field values contain unresolved template strings
    const hasUnresolvedTemplates = safeSchema.fields.some(field => {
      const section = safeSchema.sections.find(s => s.id === field.sectionId);
      if (section?.isRepeatingSection) return false;
      const value = state.values[field.name];
      return typeof value === 'string' && value.includes('{{') && value.includes('}}');
    });

    if (hasUnresolvedTemplates) {
      // Re-process all values with ensureRepeatingItemIds which will resolve templates
      const processedValues = ensureRepeatingItemIds(state.values, schema, referenceEntityData);

      // Check if any values actually changed
      const hasChanges = safeSchema.fields.some(field => {
        const section = safeSchema.sections.find(s => s.id === field.sectionId);
        if (section?.isRepeatingSection) return false;
        return state.values[field.name] !== processedValues[field.name];
      });

      if (hasChanges) {
        // Update all changed values
        safeSchema.fields.forEach(field => {
          const section = safeSchema.sections.find(s => s.id === field.sectionId);
          if (section?.isRepeatingSection) return;
          const oldValue = state.values[field.name];
          const newValue = processedValues[field.name];
          if (oldValue !== newValue) {
            dispatch({ type: 'SET_VALUE', fieldName: field.name, value: newValue });
          }
        });
      }
    }
  }, [referenceEntityData, schema, state.values, state.dirty, dispatch]);

  // Scroll to error alert when 400 error occurs
  useEffect(() => {
    // Only scroll if:
    // 1. We have an error
    // 2. Status code is 400
    // 3. This is a new error (status code changed from previous value)
    // 4. Error alert ref is available
    if (
      error &&
      errorStatusCode === 400 &&
      errorStatusCode !== lastErrorStatusCodeRef.current &&
      errorAlertRef.current
    ) {
      // Update the ref to track this error
      lastErrorStatusCodeRef.current = errorStatusCode;

      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (errorAlertRef.current) {
          errorAlertRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });
        }
      }, 100);
    } else if (!error) {
      // Reset the ref when error is cleared
      lastErrorStatusCodeRef.current = undefined;
    }
  }, [error, errorStatusCode]);

  const addRepeatingItem = useCallback((sectionId: string) => {
    const section = safeSchema.sections.find(s => s.id === sectionId);
    if (!section?.isRepeatingSection) return;

    // Check if this is a relation-based repeating section
    const isRelationBased = section.repeatingConfig?.targetSchema && section.repeatingConfig?.relationTypeId;

    if (isRelationBased && section.repeatingConfig) {
      // For relation-based sections, open FormModal for target schema
      const currentEntityId = state.values?.id;

      if (!currentEntityId) {
        // Entity must be saved first
        setAddItemErrors(prev => ({
          ...prev,
          [sectionId]: 'Please save the form first before adding related items'
        }));
        setTimeout(() => setAddItemErrors(prev => ({ ...prev, [sectionId]: null })), 5000);
        return;
      }

      // Open modal for creating new entity in target schema
      setRelationModalState({
        isOpen: true,
        sectionId,
        targetSchema: section.repeatingConfig.targetSchema,
        relationTypeId: section.repeatingConfig.relationTypeId,
      });

      return;
    }

    // Traditional inline fields repeating section
    // Clear any previous add item error for this section
    setAddItemErrors(prev => ({ ...prev, [sectionId]: null }));

    // Validate existing items before allowing a new one
    const items = state.values[sectionId] || [];
    let hasErrors = false;
    const newErrors: FormErrors = {};
    const errorFields: string[] = [];

    // Check if there are existing items to validate
    if (items.length > 0) {
      const sectionFields = safeSchema.fields.filter(f => f.sectionId === sectionId);
      items.forEach((item: any, itemIndex: number) => {
        sectionFields.forEach(field => {
          // Check if field is required or has validation rules
          const isRequired = field.validation?.required ?? false;
          if (isRequired || field.validation) {
            const validationRules = {
              ...field.validation,
              required: field.validation?.required ?? false
            };
            const fieldValue = item[field.name];
            const result = validateFieldUtil(fieldValue, validationRules);
            if (!result.isValid) {
              const errorKey = `${sectionId}[${itemIndex}].${field.name}`;
              newErrors[errorKey] = result.error || 'Invalid value';
              hasErrors = true;
              errorFields.push(`Item ${itemIndex + 1} - ${field.label || field.name}`);

              // Mark field as touched to show the error
              dispatch({ type: 'SET_TOUCHED', fieldName: errorKey, touched: true });
            }
          }
        });
      });

      // Update errors in state
      Object.entries(newErrors).forEach(([fieldName, error]) => {
        dispatch({ type: 'SET_ERROR', fieldName, error });
      });
    }

    // If there are validation errors, don't add a new item
    if (hasErrors) {
      const errorMessage = `Please fix validation errors in existing items before adding a new one. Fields with errors: ${errorFields.slice(0, 3).join(', ')}${errorFields.length > 3 ? ` and ${errorFields.length - 3} more...` : ''}`;

      setAddItemErrors(prev => ({ ...prev, [sectionId]: errorMessage }));

      loggingCustom(LogType.FORM_DATA, 'warn',
        `Cannot add new item to "${section.title}": Please fix validation errors in existing items first.`
      );

      // Clear the error after 5 seconds
      setTimeout(() => setAddItemErrors(prev => ({ ...prev, [sectionId]: null })), 5000);

      return;
    }

    // Add the new item
    const sectionFields = safeSchema.fields.filter(f => f.sectionId === sectionId);
    const defaultValue = sectionFields.reduce((acc, field) => {
      if (field.defaultValue !== undefined) {
        const resolvedDefault = typeof field.defaultValue === 'string'
          ? replaceDynamicContext(field.defaultValue, {
            formSchema: schema,
            formData: state.values,
            referenceData: referenceEntityDataRef.current ?? useDynamicFormContextStore.getState().referenceData,
          } as any)
          : field.defaultValue;
        acc[field.name] = resolvedDefault;
      } else {
        acc[field.name] = '';
      }
      return acc;
    }, {} as any);

    loggingCustom(LogType.FORM_DATA, 'info',
      `Adding new item to repeating section "${section.title}"`
    );

    dispatch({ type: 'ADD_REPEATING_ITEM', sectionId, defaultValue });
  }, [schema, state.values]);

  const removeRepeatingItem = useCallback((sectionId: string, index: number) => {
    dispatch({ type: 'REMOVE_REPEATING_ITEM', sectionId, index });
  }, []);

  const submit = useCallback(async () => {
    if (disabled) return { isValid: false, isIncomplete: false };

    // Mark that form has been submitted (to show incomplete message)
    setHasSubmitted(true);

    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });

    // Log form data before validation
    loggingCustom(LogType.FORM_DATA, 'info', '=== FORM SUBMISSION STARTED ===');
    loggingCustom(LogType.FORM_DATA, 'info', `Form Values: ${JSON.stringify(state.values, null, 2)}`);

    // Validate synchronously
    const validationResult = await validateForm();
    const { isValid, isIncomplete } = validationResult;

    // Log validation results
    loggingCustom(LogType.FORM_DATA, isValid ? 'info' : 'warn', `Form Validation Status: ${isValid ? 'VALID' : 'INVALID'}${isIncomplete ? ' (INCOMPLETE)' : ''}`);

    // Log errors for each field
    Object.entries(state.errors).forEach(([fieldName, error]) => {
      if (error) {
        loggingCustom(LogType.FORM_DATA, 'error', `Field "${fieldName}": ${error}`);
      }
    });

    // Log section-level validation
    safeSchema.sections.forEach(section => {
      let sectionValid = true;
      const sectionErrors: string[] = [];

      if (section.isRepeatingSection && section.repeatingConfig) {
        const items = state.values[section.id] || [];
        const { minItems, maxItems } = section.repeatingConfig;

        // Check if this is a relation-based repeating section
        const isRelationBased = section.repeatingConfig.targetSchema && section.repeatingConfig.relationTypeId;
        const hasEntityId = !!(state.values?.id);

        const sectionLabel = section.title || section.id;
        if (minItems !== undefined && items.length < minItems) {
          sectionValid = false;
          sectionErrors.push(`At least ${minItems} item(s) required for ${sectionLabel}, found ${items.length}`);
        }

        if (maxItems !== undefined && items.length > maxItems) {
          sectionValid = false;
          sectionErrors.push(`Maximum ${maxItems} item(s) allowed for ${sectionLabel}, found ${items.length}`);
        }

        // Check for errors within repeating items
        const sectionFields = safeSchema.fields.filter(f => f.sectionId === section.id);
        items.forEach((item: any, itemIndex: number) => {
          sectionFields.forEach(field => {
            const errorKey = `${section.id}[${itemIndex}].${field.name}`;
            if (state.errors[errorKey]) {
              sectionValid = false;
              sectionErrors.push(`Item ${itemIndex + 1} - ${field.name}: ${state.errors[errorKey]}`);
            }
          });
        });
      } else {
        // Check errors for non-repeating section fields
        const sectionFields = safeSchema.fields.filter(f => f.sectionId === section.id);
        sectionFields.forEach(field => {
          if (state.errors[field.name]) {
            sectionValid = false;
            sectionErrors.push(`${field.name}: ${state.errors[field.name]}`);
          }
        });
      }

      loggingCustom(LogType.FORM_DATA, sectionValid ? 'info' : 'warn',
        `Section "${section.title || section.id}": ${sectionValid ? 'VALID' : 'INVALID'}${sectionErrors.length > 0 ? ` - ${sectionErrors.join(', ')}` : ''}`
      );
    });

    // Log overall validation summary
    const totalErrors = Object.values(state.errors).filter(err => err).length;
    loggingCustom(LogType.FORM_DATA, 'info', `Validation Summary: ${totalErrors} error(s) found${isIncomplete ? ', form is incomplete' : ''}`);

    // Update incomplete status
    setIsIncomplete(isIncomplete);

    // Only allow submission if form is valid (no validation errors)
    // isIncomplete is just a flag for minItems, not a validation error
    // If isValid is false, there are real validation errors and we should not save
    if (isValid && onSubmit) {
      try {
        // If form is incomplete (minItems missing), add incomplete flag
        // Otherwise, explicitly set to false when complete
        const submissionData = isIncomplete
          ? { ...state.values, incomplete: true }
          : { ...state.values, incomplete: false }; // Explicitly set to false when complete
        await onSubmit(submissionData, { isIncomplete });
        loggingCustom(LogType.FORM_DATA, 'info', `Form submitted successfully${isIncomplete ? ' (with incomplete flag)' : ' (complete)'}`);

        // Update incomplete status based on validation result
        setIsIncomplete(isIncomplete);

        // If form was incomplete but is now complete, clear incomplete flag
        if (!isIncomplete) {
          // Form is now complete - clear the incomplete flag from state
          if (state.values.incomplete === true) {
            dispatch({ type: 'SET_VALUE', fieldName: 'incomplete', value: false });
          }
          setIncompleteSections([]);
        }
      } catch (error) {
        loggingCustom(LogType.FORM_DATA, 'error', `Form submission error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Form has validation errors - don't save
      loggingCustom(LogType.FORM_DATA, 'warn', 'Form submission blocked due to validation errors');
    }

    loggingCustom(LogType.FORM_DATA, 'info', '=== FORM SUBMISSION ENDED ===');

    dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
    return { isValid, isIncomplete };
  }, [disabled, validateForm, onSubmit, state.values, state.errors, schema]);

  // Get action configurations dynamically
  const editMode = isEditMode(initialValues);
  const singularName = getSingularName(schema);
  const actionConfigs = useMemo(() => {
    const defaultActions: Array<'submit' | 'cancel' | 'reset'> = ['cancel', 'reset', 'submit'];
    const actions = schema.actions || defaultActions;
    // Ensure actions is always an array
    const actionsArray = Array.isArray(actions) ? actions : defaultActions;
    return actionsArray.map(actionType => getActionConfig(actionType, singularName, editMode));
  }, [schema.actions, singularName, editMode]);

  const contextValue: FormContextType = {
    state,
    actions: {
      setValue,
      setError,
      setTouched,
      validateField,
      validateForm,
      reset,
      submit,
      addRepeatingItem,
      removeRepeatingItem,
    },
    schema,
  };

  // Call onMount with submit function if provided
  useEffect(() => {
    onMount?.(submit);
  }, [submit]);

  const formClasses = cn(
    'w-full space-y-6',
    schema.styling?.className,
    className
  );

  // Collapse/Expand all functions
  const collapseAll = useCallback(() => {
    const collapsed: Record<string, boolean> = {};
    safeSchema.sections.forEach(section => {
      collapsed[section.id] = false;
    });
    setExpandedSections(collapsed);
  }, [safeSchema.sections]);

  const expandAll = useCallback(() => {
    const expanded: Record<string, boolean> = {};
    safeSchema.sections.forEach(section => {
      expanded[section.id] = true;
    });
    setExpandedSections(expanded);
  }, [safeSchema.sections]);

  // Toggle individual section
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // Check if all sections are expanded or collapsed
  const allExpanded = useMemo(() => {
    return safeSchema.sections.every(section => expandedSections[section.id] === true);
  }, [safeSchema.sections, expandedSections]);

  const allCollapsed = useMemo(() => {
    return safeSchema.sections.every(section => expandedSections[section.id] === false);
  }, [safeSchema.sections, expandedSections]);

  // If this is rendered inside a form (FormDialog), don't create another form element
  const isInsideForm = typeof window !== 'undefined' &&
    document.getElementById('form-dialog-form')?.closest('form');

  const renderSections = () => {
    return safeSchema.sections.map((section) => {
      return (
        <AccordionFormSection
          key={section.id}
          section={section}
          schema={schema}
          values={state.values}
          errors={state.errors}
          touched={state.touched}
          onChange={setValue}
          onBlur={(fieldName: string) => setTouched(fieldName, true)}
          onFocus={() => { }}
          disabled={disabled}
          isExpanded={expandedSections[section.id] ?? (section.initialState !== 'collapsed')}
          onToggleExpanded={() => toggleSection(section.id)}
          repeatingItems={section.isRepeatingSection ? (state.values[section.id] || []) : undefined}
          onAddRepeatingItem={section.isRepeatingSection ? () => addRepeatingItem(section.id) : undefined}
          onRemoveRepeatingItem={section.isRepeatingSection ? (index: number) => removeRepeatingItem(section.id, index) : undefined}
          addItemError={section.isRepeatingSection ? addItemErrors[section.id] : undefined}
          refreshRelationsTrigger={section.isRepeatingSection && section.repeatingConfig?.targetSchema ? refreshRelationsTrigger : undefined}
          isAddingItem={section.isRepeatingSection && relationModalState.isOpen && relationModalState.sectionId === section.id}
        />
      );
    });
  };

  // Get first validation error for display (prioritize section-level errors, then repeating item errors)
  const firstValidationError = useMemo(() => {
    // First check for section-level errors (min/max items)
    const suppressedSectionErrors = new Set<string>();
    const sectionErrors = Object.entries(state.errors).filter(([key, value]) => {
      const section = safeSchema.sections.find(s => s.id === key);
      return section?.isRepeatingSection && value;
    });

    if (sectionErrors.length > 0) {
      for (const [sectionId, errorMessage] of sectionErrors) {
        const section = safeSchema.sections.find(s => s.id === sectionId);
        if (section?.isRepeatingSection && section.repeatingConfig?.targetSchema) {
          const sectionValue = state.values[sectionId];
          if (Array.isArray(sectionValue) && sectionValue.length > 0) {
            suppressedSectionErrors.add(sectionId);
            continue;
          }
        }
        if (section) {
          return `${section.title}: ${errorMessage}`;
        }
        return errorMessage;
      }
    }

    // Then check for repeating item field errors
    const repeatingSectionItemErrors = Object.entries(state.errors).filter(([key, value]) => {
      return key.includes('[') && key.includes(']') && value;
    });

    if (repeatingSectionItemErrors.length > 0) {
      const [errorKey, errorMessage] = repeatingSectionItemErrors[0];
      // Parse the error key to get section id, item index, and field name
      const match = errorKey.match(/^(.+)\[(\d+)\]\.(.+)$/);
      if (match) {
        const [, sectionId, itemIndex, fieldName] = match;
        const section = safeSchema.sections.find(s => s.id === sectionId);
        const field = safeSchema.fields.find(f => f.sectionId === sectionId && f.name === fieldName);
        return section
          ? `${section.title} - Item ${parseInt(itemIndex) + 1} (${field?.label || fieldName}): ${errorMessage}`
          : errorMessage;
      }
      return errorMessage;
    }

    // Finally check for regular field errors
    const remainingErrorEntry = Object.entries(state.errors).find(([key, err]) => err && !suppressedSectionErrors.has(key));
    return remainingErrorEntry ? remainingErrorEntry[1] : '';
  }, [state.errors, safeSchema.sections, safeSchema.fields, state.values]);

  const formContent = (
    <>
      {children || (
        <>
          {/* Incomplete Badge - shown when form is saved but incomplete, only after submit */}
          {isIncomplete && hasSubmitted && (
            <div className="mb-4">
              <FormAlert
                type="warning"
                message="Form saved but incomplete"
                subtitle={
                  incompleteSections.length > 0
                    ? `Please add at least one item to the following section${incompleteSections.length > 1 ? 's' : ''}: ${incompleteSections.join(', ')}. The form will remain open until all requirements are met.`
                    : "Please complete all required sections to finish. The form will remain open until all requirements are met."
                }
                onDismiss={undefined}
                dismissible={false}
              />
            </div>
          )}

          {/* Message Alert - shown only when there's a message and no blocking errors */}
          {message && !(error || firstValidationError) && !isIncomplete && (
            <div className="mb-4">
              <FormAlert
                type="info"
                message={message}
                onDismiss={onErrorDismiss}
                dismissible={!!onErrorDismiss}
              />
            </div>
          )}

          {/* Error Alert - shown when there's an error or validation issue */}
          {(error || firstValidationError) && (
            <div ref={errorAlertRef} className="mb-4">
              <FormAlert
                type="error"
                message={error || firstValidationError}
                subtitle={error && message ? message : undefined}
                onDismiss={error ? onErrorDismiss : undefined}
                dismissible={!!error}
                statusCode={error ? errorStatusCode : undefined}
                action={
                  (() => {
                    const errorMessage = (error || firstValidationError || '').toLowerCase();
                    return errorMessage.includes('company id is required') ||
                      errorMessage.includes('cannot create records when') ||
                      errorMessage.includes('please select a company') ||
                      errorMessage.includes('please select a specific company');
                  })() ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium opacity-80">Select a company:</p>
                      <CompanySelector />
                    </div>
                  ) : undefined
                }
              />
            </div>
          )}

          {!hideActions && (
            <div className="space-y-3 pb-2 mb-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center justify-between py-1 gap-3">
                {/* Fill With AI Button - Only show in create mode */}
                <div className="flex items-center">
                  {!editMode && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIsFormFillerOpen(true)}
                      disabled={disabled}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden md:inline">Fill With AI</span>
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {actionConfigs.length > 0 && actionConfigs.map((config) => {
                    if (config.type === 'submit') {
                      return (
                        <Button
                          key={config.type}
                          type="button"
                          variant="gradient"
                          disabled={disabled || state.isSubmitting}
                          onClick={(e) => {
                            e.preventDefault();
                            submit();
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {!state.isSubmitting && config.icon}
                            {state.isSubmitting ? (
                              config.loading || 'Submitting...'
                            ) : (
                              <span className="hidden md:inline">{config.label}</span>
                            )}
                          </div>
                        </Button>
                      );
                    } else if (config.type === 'cancel') {
                      return (
                        <Button
                          key={config.type}
                          type="button"
                          variant={config.variant}
                          onClick={(e) => {
                            e.preventDefault();
                            onCancel?.();
                          }}
                          disabled={disabled}
                        >
                          <div className="flex items-center gap-2">
                            {config.icon}
                            <span className="hidden md:inline">{config.label}</span>
                          </div>
                        </Button>
                      );
                    } else if (config.type === 'reset') {
                      return (
                        <Button
                          key={config.type}
                          type="button"
                          variant={config.variant}
                          onClick={reset}
                          disabled={disabled}
                        >
                          <div className="flex items-center gap-2">
                            {config.icon}
                            <span className="hidden md:inline">{config.label}</span>
                          </div>
                        </Button>
                      );
                    }
                    return null;
                  })}

                  {/* Quick Actions Popover (Ellipsis) - Inline with buttons */}
                  {(Array.isArray(safeSchema.detailPageMetadata?.quickActions) && safeSchema.detailPageMetadata.quickActions.length > 0) ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Quick actions">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-80 p-0">
                        <div className="p-3">
                          <DynamicQuickActions
                            actions={safeSchema.detailPageMetadata?.quickActions ?? []}
                            schema={safeSchema}
                            data={referenceEntityData || {}}
                            disableAnimation
                            className="space-y-2"
                            hideContainerCard
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>

              </div>
            </div>
          )}

          {/* Collapse/Expand All Buttons */}
          {(safeSchema.sections.length > 0) && schema?.isCollapsibleSections !== false && !hideCollapseExpandButtons && (
            <div className="flex justify-end mb-4">
              <ExpandCollapseControls
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
                expandDisabled={allExpanded || disabled}
                collapseDisabled={allCollapsed || disabled}
                variant="outline"
                size="sm"
                showLabels={true}
              />
            </div>
          )}

          <div className="space-y-4">
            <FormSystemSection
              schema={schema}
              values={state.values}
              errors={state.errors}
              touched={state.touched}
              onChange={setValue}
              onBlur={(fieldName: string) => setTouched(fieldName, true)}
              disabled={disabled}
            />
            {renderSections()}
          </div>
        </>
      )}

      {/* FormModal for relation-based repeating sections */}
      {relationModalState.isOpen && relationModalState.targetSchema && (
        <FormModal
          schemaId={relationModalState.targetSchema}
          mode="create"
          enrichData={(formData) => {
            // enrichData is called with form data before submission
            return formData;
          }}
          onSuccess={async (createdEntity) => {
            // After successful entity creation, create the relation
            const currentEntityId = state.values?.id;
            const targetEntityId = createdEntity?.id || (createdEntity as any)?.data?.id;

            if (currentEntityId && relationModalState.relationTypeId && targetEntityId && relationModalState.targetSchema) {
              try {
                // Check if the created entity is incomplete
                const isTargetIncomplete = createdEntity?.incomplete === true || (createdEntity as any)?.data?.incomplete === true;

                const relationResponse = await apiRequest('/api/relations', {
                  method: 'POST',
                  body: {
                    sourceSchema: schema.id,
                    sourceId: currentEntityId,
                    targetSchema: relationModalState.targetSchema,
                    targetId: targetEntityId,
                    relationTypeId: relationModalState.relationTypeId,
                    incomplete: isTargetIncomplete || undefined, // Only include if true
                  },
                  callerName: 'FormLifecycleManager.createRelationFromModal',
                });

                if (!relationResponse.success) {
                  loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to create relation: ${relationResponse.error}`);
                  // Could show an error message here
                } else {
                  loggingCustom(LogType.FORM_DATA, 'info', 'Relation created successfully');
                  // Trigger refresh of relation-based sections
                  setRefreshRelationsTrigger(prev => prev + 1);
                }
              } catch (error) {
                loggingCustom(LogType.CLIENT_LOG, 'error', `Error creating relation: ${error instanceof Error ? error.message : String(error)}`);
              }
            }

            // Close modal and clear state
            setRelationModalState({ isOpen: false, sectionId: '' });
          }}
          onIncompleteSave={async (createdEntity) => {
            // When form is saved as incomplete, still create the relation
            const currentEntityId = state.values?.id;
            const targetEntityId = createdEntity?.id || (createdEntity as any)?.data?.id;

            if (currentEntityId && relationModalState.relationTypeId && targetEntityId && relationModalState.targetSchema) {
              try {
                // Target entity is incomplete, so relation should also be marked as incomplete
                const relationResponse = await apiRequest('/api/relations', {
                  method: 'POST',
                  body: {
                    sourceSchema: schema.id,
                    sourceId: currentEntityId,
                    targetSchema: relationModalState.targetSchema,
                    targetId: targetEntityId,
                    relationTypeId: relationModalState.relationTypeId,
                    incomplete: true, // Mark relation as incomplete since target is incomplete
                  },
                  callerName: 'FormLifecycleManager.createRelationFromModal.incomplete',
                });

                if (!relationResponse.success) {
                  loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to create relation for incomplete entity: ${relationResponse.error}`);
                } else {
                  loggingCustom(LogType.FORM_DATA, 'info', 'Relation created successfully for incomplete entity');
                  // Trigger refresh of relation-based sections
                  setRefreshRelationsTrigger(prev => prev + 1);
                }
              } catch (error) {
                loggingCustom(LogType.CLIENT_LOG, 'error', `Error creating relation for incomplete entity: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
            // Don't close modal - keep it open for incomplete saves
          }}
          onClose={() => {
            setRelationModalState({ isOpen: false, sectionId: '' });
          }}
        />
      )}
    </>
  );

  return (
    <>
      <FormContext.Provider value={contextValue}>
        {typeof window !== 'undefined' && document.getElementById('form-dialog-form') ? (
          <div
            className={formClasses}
            {...props}
          >
            {formContent}
          </div>
        ) : (
          <form
            className={formClasses}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            {...props}
          >
            {formContent}
          </form>
        )}
      </FormContext.Provider>

      {/* AI Form Filler Dialog */}
      <AiFormFillerDialog
        isOpen={isFormFillerOpen}
        onClose={() => setIsFormFillerOpen(false)}
        schema={schema}
        formData={state.values}
        setValue={setValue}
        onFillComplete={(data) => {
          // Form fields are already populated by the dialog
          setIsFormFillerOpen(false);
        }}
      />

      {/* Go to Top Button */}
      {!hideGoToTopButton && <GoToTopForm threshold={100} />}
    </>
  );
};

SchemaFormWrapper.displayName = 'SchemaFormWrapper';
