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
import { LogType } from '@/gradian-ui/shared/constants/application-variables';
import { cn, validateField as validateFieldUtil } from '@/gradian-ui/shared/utils';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { ChevronsDown, ChevronsUp } from 'lucide-react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { ulid } from 'ulid';
import { GoToTopForm } from '../form-elements/go-to-top-form';
import { getFieldTabIndexMap } from '../form-elements/utils/field-resolver';
import { getActionConfig, getSingularName, isEditMode } from '../utils/action-config';
import { AccordionFormSection } from './AccordionFormSection';
import { FormModal } from './FormModal';
import { FormSystemSection } from './FormSystemSection';

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
const mergeInitialValuesWithDefaults = (initialValues: FormData, schema: FormSchema): FormData => {
  const mergedValues = { ...initialValues };
  
  // Process all fields to apply default values where needed
  schema.fields.forEach(field => {
    // Skip if field is in a repeating section (handled separately)
    const section = schema.sections.find(s => s.id === field.sectionId);
    if (section?.isRepeatingSection) {
      return;
    }
    
    // Apply defaultValue if field value is undefined, null, or empty string
    if (field.defaultValue !== undefined && 
        (mergedValues[field.name] === undefined || 
         mergedValues[field.name] === null || 
         mergedValues[field.name] === '')) {
      mergedValues[field.name] = field.defaultValue;
    }
  });
  
  return mergedValues;
};

// Helper function to ensure repeating section items have unique IDs
const ensureRepeatingItemIds = (values: FormData, schema: FormSchema): FormData => {
  const newValues = mergeInitialValuesWithDefaults(values, schema);
  
  schema.sections.forEach(section => {
    if (section.isRepeatingSection && newValues[section.id]) {
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
            const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
            sectionFields.forEach(field => {
              if (field.defaultValue !== undefined && 
                  (itemWithId[field.name] === undefined || 
                   itemWithId[field.name] === null || 
                   itemWithId[field.name] === '')) {
                itemWithId[field.name] = field.defaultValue;
              }
            });
            
            return itemWithId;
          }
          
          // Apply default values to existing items too
          const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
          sectionFields.forEach(field => {
            if (field.defaultValue !== undefined && 
                (item[field.name] === undefined || 
                 item[field.name] === null || 
                 item[field.name] === '')) {
              item[field.name] = field.defaultValue;
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
  | { type: 'RESET'; initialValues: FormData; schema: FormSchema }
  | { type: 'VALIDATE_FIELD'; fieldName: string; schema: FormSchema }
  | { type: 'VALIDATE_FORM'; schema: FormSchema }
  | { type: 'ADD_REPEATING_ITEM'; sectionId: string; defaultValue: any }
  | { type: 'REMOVE_REPEATING_ITEM'; sectionId: string; index: number };

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
          console.warn(`[FormReducer] Item at index ${index} missing id, adding one`);
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
        
        console.log(`[FormReducer] Updating repeating section item:`, {
          sectionId,
          itemIndex: index,
          fieldName,
          value: action.value,
          itemId: newArray[index].id,
          before: currentArray[index],
          after: newArray[index],
        });
        
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
      console.log(`[FormReducer] Updating regular field:`, {
        fieldName: action.fieldName,
        value: action.value,
      });
      
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
      return {
        values: ensureRepeatingItemIds(action.initialValues, action.schema),
        errors: {},
        touched: {},
        dirty: false,
        isValid: true,
        isSubmitting: false,
      };
    
    case 'VALIDATE_FIELD': {
      // Handle nested paths for repeating sections (e.g., "contacts[0].name")
      const match = action.fieldName.match(/^(.+)\[(\d+)\]\.(.+)$/);
      
      let field;
      let fieldValue;
      
      if (match) {
        // This is a repeating section field
        const [, sectionId, itemIndex, fieldName] = match;
        const index = parseInt(itemIndex);
        field = action.schema.fields.find(f => f.sectionId === sectionId && f.name === fieldName);
        fieldValue = state.values[sectionId]?.[index]?.[fieldName];
      } else {
        // Regular field
        field = action.schema.fields.find(f => f.name === action.fieldName);
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
      
      action.schema.fields.forEach(field => {
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
  const [state, dispatch] = useReducer(formReducer, {
    values: ensureRepeatingItemIds(initialValues, schema),
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
  
  // State to track which sections are expanded
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => {
    // Initialize based on section initialState prop or forceExpandedSections
    const initial: Record<string, boolean> = {};
    schema.sections.forEach(section => {
      // If forceExpandedSections is true, always expand; otherwise use initialState
      initial[section.id] = forceExpandedSections ? true : (section.initialState !== 'collapsed');
    });
    return initial;
  });

  // Deep comparison to avoid unnecessary resets
  const prevInitialValuesRef = React.useRef<string>(JSON.stringify(initialValues));
  
  // Update form state when initialValues change (for editing scenarios)
  // Only reset if the actual content has changed
  useEffect(() => {
    const currentInitialValues = JSON.stringify(initialValues);
    if (prevInitialValuesRef.current !== currentInitialValues) {
      prevInitialValuesRef.current = currentInitialValues;
      dispatch({ type: 'RESET', initialValues, schema });
      // Check if loaded entity is incomplete (only for edit mode)
      if (initialValues?.incomplete === true) {
        setIsIncomplete(true);
        setHasSubmitted(true); // Entity was already saved, so consider it submitted
      } else {
        setIsIncomplete(false);
        setHasSubmitted(false); // Reset on new form
      }
    }
  }, [initialValues, schema]);

  // Update expanded sections when schema sections change
  const sectionIds = useMemo(() => schema.sections.map(s => s.id).join(','), [schema.sections]);
  useEffect(() => {
    setExpandedSections(prev => {
      const newExpanded: Record<string, boolean> = {};
      schema.sections.forEach(section => {
        // If forceExpandedSections is true, always expand; otherwise preserve existing state or use initialState
        newExpanded[section.id] = forceExpandedSections 
          ? true 
          : (prev[section.id] !== undefined 
            ? prev[section.id]
            : (section.initialState !== 'collapsed'));
      });
      return newExpanded;
    });
  }, [sectionIds, forceExpandedSections]);

  const setValue = useCallback((fieldName: string, value: any) => {
    loggingCustom(LogType.FORM_DATA, 'info', `Setting field "${fieldName}" to: ${JSON.stringify(value)}`);
    dispatch({ type: 'SET_VALUE', fieldName, value });
    onFieldChange?.(fieldName, value);
    
    if (validationMode === 'onChange') {
      dispatch({ type: 'VALIDATE_FIELD', fieldName, schema });
    }
  }, [onFieldChange, validationMode, schema]);

  const setError = useCallback((fieldName: string, error: string) => {
    dispatch({ type: 'SET_ERROR', fieldName, error });
  }, []);

  const setTouched = useCallback((fieldName: string, touched: boolean) => {
    dispatch({ type: 'SET_TOUCHED', fieldName, touched });
    
    if (validationMode === 'onBlur') {
      dispatch({ type: 'VALIDATE_FIELD', fieldName, schema });
    }
  }, [validationMode, schema]);

  const validateField = useCallback((fieldName: string) => {
    dispatch({ type: 'VALIDATE_FIELD', fieldName, schema });
    return !state.errors[fieldName];
  }, [schema, state.errors]);

  const validateForm = useCallback(async (): Promise<{ isValid: boolean; isIncomplete: boolean }> => {
    // STEP 1: Validate main form first (required fields, maxItems, field validations)
    // This sets isValid - if false, form should not save
    let isValid = true;
    const newErrors: FormErrors = {};
    
    schema.sections.forEach(section => {
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
          const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
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
        const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
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
        const relationPromises = schema.sections
          .filter(section => 
            section.isRepeatingSection && 
            section.repeatingConfig?.targetSchema && 
            section.repeatingConfig?.relationTypeId
          )
          .map(async (section) => {
            try {
              const response = await apiRequest<any>(
                `/api/relations?sourceSchema=${schema.id}&sourceId=${state.values.id}&relationTypeId=${section.repeatingConfig!.relationTypeId}&targetSchema=${section.repeatingConfig!.targetSchema}`
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
              console.error(`Error fetching relations count for section ${section.id}:`, error);
              relationCounts[section.id] = 0;
            }
          });
        
        await Promise.all(relationPromises);
      }
      
      // Check minItems for all repeating sections (only if main form is valid)
      const sectionsNeedingItems: string[] = [];
      schema.sections.forEach(section => {
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
        if (schema.sections.some(s => s.id === fieldName && s.isRepeatingSection)) {
          dispatch({ type: 'SET_ERROR', fieldName, error });
          dispatch({ type: 'SET_TOUCHED', fieldName, touched: true });
        }
      });
      
      // Clear errors for sections that are now complete
      schema.sections.forEach(section => {
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
      schema.sections.forEach(section => {
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
      const relationPromises = schema.sections
        .filter(section => 
          section.isRepeatingSection && 
          section.repeatingConfig?.targetSchema && 
          section.repeatingConfig?.relationTypeId
        )
        .map(async (section) => {
          try {
            const response = await apiRequest<any>(
              `/api/relations?sourceSchema=${schema.id}&sourceId=${state.values.id}&relationTypeId=${section.repeatingConfig!.relationTypeId}&targetSchema=${section.repeatingConfig!.targetSchema}`
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
            console.error(`Error fetching relations count for section ${section.id}:`, error);
            relationCounts[section.id] = 0;
          }
        });
      
      await Promise.all(relationPromises);
    }
    
    // Only check minItems for incomplete status, don't validate required fields
    schema.sections.forEach(section => {
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
    dispatch({ type: 'RESET', initialValues, schema });
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

  const addRepeatingItem = useCallback((sectionId: string) => {
    const section = schema.sections.find(s => s.id === sectionId);
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
      const sectionFields = schema.fields.filter(f => f.sectionId === sectionId);
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
    const sectionFields = schema.fields.filter(f => f.sectionId === sectionId);
    const defaultValue = sectionFields.reduce((acc, field) => {
      acc[field.name] = field.defaultValue || '';
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
    schema.sections.forEach(section => {
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
        const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
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
        const sectionFields = schema.fields.filter(f => f.sectionId === section.id);
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
    schema.sections.forEach(section => {
      collapsed[section.id] = false;
    });
    setExpandedSections(collapsed);
  }, [schema.sections]);

  const expandAll = useCallback(() => {
    const expanded: Record<string, boolean> = {};
    schema.sections.forEach(section => {
      expanded[section.id] = true;
    });
    setExpandedSections(expanded);
  }, [schema.sections]);

  // Toggle individual section
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // Check if all sections are expanded or collapsed
  const allExpanded = useMemo(() => {
    return schema.sections.every(section => expandedSections[section.id] === true);
  }, [schema.sections, expandedSections]);

  const allCollapsed = useMemo(() => {
    return schema.sections.every(section => expandedSections[section.id] === false);
  }, [schema.sections, expandedSections]);

  // If this is rendered inside a form (FormDialog), don't create another form element
  const isInsideForm = typeof window !== 'undefined' && 
    document.getElementById('form-dialog-form')?.closest('form');

  // Compute tab index map based on field render order
  const fieldTabIndexMap = useMemo(() => getFieldTabIndexMap(schema), [schema]);

  const renderSections = () => {
    return schema.sections.map((section) => {
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
          onFocus={() => {}}
          disabled={disabled}
          isExpanded={expandedSections[section.id] ?? (section.initialState !== 'collapsed')}
          onToggleExpanded={() => toggleSection(section.id)}
          repeatingItems={section.isRepeatingSection ? (state.values[section.id] || []) : undefined}
          onAddRepeatingItem={section.isRepeatingSection ? () => addRepeatingItem(section.id) : undefined}
          onRemoveRepeatingItem={section.isRepeatingSection ? (index: number) => removeRepeatingItem(section.id, index) : undefined}
          addItemError={section.isRepeatingSection ? addItemErrors[section.id] : undefined}
          refreshRelationsTrigger={section.isRepeatingSection && section.repeatingConfig?.targetSchema ? refreshRelationsTrigger : undefined}
          isAddingItem={section.isRepeatingSection && relationModalState.isOpen && relationModalState.sectionId === section.id}
          fieldTabIndexMap={fieldTabIndexMap}
        />
      );
    });
  };

  // Get first validation error for display (prioritize section-level errors, then repeating item errors)
  const firstValidationError = useMemo(() => {
    // First check for section-level errors (min/max items)
    const suppressedSectionErrors = new Set<string>();
    const sectionErrors = Object.entries(state.errors).filter(([key, value]) => {
      const section = schema.sections.find(s => s.id === key);
      return section?.isRepeatingSection && value;
    });
    
    if (sectionErrors.length > 0) {
      for (const [sectionId, errorMessage] of sectionErrors) {
      const section = schema.sections.find(s => s.id === sectionId);
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
        const section = schema.sections.find(s => s.id === sectionId);
        const field = schema.fields.find(f => f.sectionId === sectionId && f.name === fieldName);
        return section 
          ? `${section.title} - Item ${parseInt(itemIndex) + 1} (${field?.label || fieldName}): ${errorMessage}`
          : errorMessage;
      }
      return errorMessage;
    }
    
    // Finally check for regular field errors
    const remainingErrorEntry = Object.entries(state.errors).find(([key, err]) => err && !suppressedSectionErrors.has(key));
    return remainingErrorEntry ? remainingErrorEntry[1] : '';
  }, [state.errors, schema.sections, schema.fields, state.values]);

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
            <div className="mb-4">
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
          
          {actionConfigs.length > 0 && !hideActions && (
            <div className="space-y-3 pb-2 mb-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex justify-end space-x-3">
                {actionConfigs.map((config) => {
                  if (config.type === 'submit') {
                    return (
                      <Button
                        key={config.type}
                        type="button"
                        variant={config.variant}
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
              </div>
            </div>
          )}
          
          {/* Collapse/Expand All Buttons */}
          {schema.sections.length > 0 && schema.isCollapsibleSections !== false && !hideCollapseExpandButtons && (
            <div className="flex justify-end gap-2 mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={collapseAll}
                disabled={allCollapsed || disabled}
                className="flex items-center gap-2"
              >
                <ChevronsUp className="h-4 w-4" />
                <span className="hidden md:inline">Collapse All</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={expandAll}
                disabled={allExpanded || disabled}
                className="flex items-center gap-2"
              >
                <ChevronsDown className="h-4 w-4" />
                <span className="hidden md:inline">Expand All</span>
              </Button>
            </div>
          )}
          
          <div className="space-y-4">
            <FormSystemSection
              schema={schema}
              values={state.values}
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
                const relationResponse = await apiRequest('/api/relations', {
                  method: 'POST',
                  body: {
                    sourceSchema: schema.id,
                    sourceId: currentEntityId,
                    targetSchema: relationModalState.targetSchema,
                    targetId: targetEntityId,
                    relationTypeId: relationModalState.relationTypeId,
                  },
                });
                
                if (!relationResponse.success) {
                  console.error('Failed to create relation:', relationResponse.error);
                  // Could show an error message here
                } else {
                  loggingCustom(LogType.FORM_DATA, 'info', 'Relation created successfully');
                  // Trigger refresh of relation-based sections
                  setRefreshRelationsTrigger(prev => prev + 1);
                }
              } catch (error) {
                console.error('Error creating relation:', error);
              }
            }
            
            // Close modal and clear state
            setRelationModalState({ isOpen: false, sectionId: '' });
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
      {/* Go to Top Button */}
      {!hideGoToTopButton && <GoToTopForm threshold={100} />}
    </>
  );
};

SchemaFormWrapper.displayName = 'SchemaFormWrapper';
