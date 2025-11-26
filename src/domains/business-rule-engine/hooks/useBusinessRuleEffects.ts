// Hook to evaluate business rule effects (push-based model)

import { useMemo, useRef } from 'react';
import type { BusinessRuleWithEffects, RuleTarget } from '../types';
import { evaluateRule } from '../utils/rule-evaluator';
import { extractFieldsFromRule } from '../utils/rule-field-extractor';

export interface ObjectEffects {
  isVisible: boolean;
  isRequired: boolean;
  isDisabled: boolean;
}

export interface BusinessRuleEffectsMap {
  fields: Record<string, ObjectEffects>;
  sections: Record<string, ObjectEffects>;
}

/**
 * Hook to evaluate all business rules and return effects for each object
 * @param businessRules Array of business rules with effects
 * @param formValues The current form values
 * @param fieldIds Array of all field IDs in the form
 * @param sectionIds Array of all section IDs in the form
 * @returns Map of effects for each field and section
 */
export function useBusinessRuleEffects(
  businessRules: BusinessRuleWithEffects[] | undefined,
  formValues: Record<string, any>,
  fieldIds: string[],
  sectionIds: string[]
): BusinessRuleEffectsMap {
  // Extract all fields referenced in business rules for optimization
  const watchFields = useMemo(() => {
    if (!businessRules || businessRules.length === 0) {
      return [];
    }
    const allFields = new Set<string>();
    businessRules.forEach((rule) => {
      const fields = extractFieldsFromRule(rule);
      fields.forEach((field) => allFields.add(field));
    });
    return Array.from(allFields);
  }, [businessRules]);

  // Extract only the watched field values to avoid re-computation when unrelated fields change
  // This is critical for performance - we only want to re-evaluate when watched fields change
  // Use a ref to track the serialized watched values and only update when they actually change
  const prevSerializedRef = useRef<string>('');
  const prevWatchedValuesRef = useRef<Record<string, any>>({});
  
  // Create a serialized string of watched field values for comparison
  // We access formValues directly here but only use the serialized string as the stable dependency
  const watchedValuesSerialized = (() => {
    if (watchFields.length === 0) {
      return '';
    }
    const sortedFields = [...watchFields].sort();
    return JSON.stringify(
      sortedFields.map((fieldName) => [fieldName, formValues[fieldName]])
    );
  })();
  
  // Only update watchedValues if the serialized string changed
  const watchedValues = useMemo(() => {
    if (watchFields.length === 0) {
      return {};
    }
    
    // If serialized string hasn't changed, return previous object to maintain reference equality
    if (watchedValuesSerialized === prevSerializedRef.current && Object.keys(prevWatchedValuesRef.current).length > 0) {
      return prevWatchedValuesRef.current;
    }
    
    // Extract current watched field values
    const currentValues: Record<string, any> = {};
    watchFields.forEach((fieldName) => {
      currentValues[fieldName] = formValues[fieldName];
    });
    
    // Update refs
    prevSerializedRef.current = watchedValuesSerialized;
    prevWatchedValuesRef.current = currentValues;
    
    return currentValues;
    // Depend only on the serialized string and watchFields - this ensures we only
    // recalculate when watched field values actually change, not when any field changes
  }, [watchedValuesSerialized, watchFields.join(',')]);

  return useMemo(() => {
    const effects: BusinessRuleEffectsMap = {
      fields: {},
      sections: {},
    };

    // Initialize all fields and sections with default effects
    fieldIds.forEach((fieldId) => {
      effects.fields[fieldId] = {
        isVisible: true,
        isRequired: false,
        isDisabled: false,
      };
    });

    sectionIds.forEach((sectionId) => {
      effects.sections[sectionId] = {
        isVisible: true,
        isRequired: false,
        isDisabled: false,
      };
    });

    if (!businessRules || businessRules.length === 0) {
      return effects;
    }

    // Evaluate each business rule using only watched values (more efficient)
    businessRules.forEach((rule) => {
      const rulePasses = evaluateRule(rule, watchedValues);

      if (!rulePasses) {
        return; // Rule doesn't pass, skip its effects
      }

      // Apply effects to required objects
      if (rule.effects.requiredObjects) {
        rule.effects.requiredObjects.forEach((target) => {
          if (target.type === 'field' && effects.fields[target.id]) {
            effects.fields[target.id].isRequired = true;
          } else if (target.type === 'section' && effects.sections[target.id]) {
            effects.sections[target.id].isRequired = true;
          }
        });
      }

      // Apply effects to visible objects first (so they can override hidden)
      if (rule.effects.visibleObjects) {
        rule.effects.visibleObjects.forEach((target) => {
          if (target.type === 'field' && effects.fields[target.id]) {
            effects.fields[target.id].isVisible = true;
          } else if (target.type === 'section' && effects.sections[target.id]) {
            effects.sections[target.id].isVisible = true;
          }
        });
      }

      // Apply effects to hidden objects (visibleObjects in same rule override this)
      if (rule.effects.hiddenObjects) {
        rule.effects.hiddenObjects.forEach((target) => {
          // Check if this object is also in visibleObjects (same rule) - if so, skip hidden
          const isAlsoVisible = rule.effects.visibleObjects?.some(
            (v) => v.id === target.id && v.type === target.type
          );
          if (isAlsoVisible) {
            return; // visibleObjects takes precedence in the same rule
          }
          
          if (target.type === 'field' && effects.fields[target.id]) {
            effects.fields[target.id].isVisible = false;
          } else if (target.type === 'section' && effects.sections[target.id]) {
            effects.sections[target.id].isVisible = false;
          }
        });
      }

      // Apply effects to disabled objects
      if (rule.effects.disabledObjects) {
        rule.effects.disabledObjects.forEach((target) => {
          if (target.type === 'field' && effects.fields[target.id]) {
            effects.fields[target.id].isDisabled = true;
          } else if (target.type === 'section' && effects.sections[target.id]) {
            effects.sections[target.id].isDisabled = true;
          }
        });
      }
    });

    return effects;
    // Only depend on the specific fields referenced in rules via watchedValues
    // This ensures we only re-evaluate when watched fields change, not when any field changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessRules, fieldIds, sectionIds, watchedValues]);
}

/**
 * Get effects for a specific field, including section-level effects
 */
export function getFieldEffects(
  fieldId: string,
  sectionId: string,
  effects: BusinessRuleEffectsMap
): ObjectEffects {
  const fieldEffect = effects.fields[fieldId] || {
    isVisible: true,
    isRequired: false,
    isDisabled: false,
  };

  const sectionEffect = effects.sections[sectionId] || {
    isVisible: true,
    isRequired: false,
    isDisabled: false,
  };

  // Merge: section effects override field effects
  // For visibility: if section is hidden, field is hidden
  // For required: if section is required, all fields in section are required
  // For disabled: if section is disabled, all fields in section are disabled
  return {
    isVisible: sectionEffect.isVisible && fieldEffect.isVisible,
    isRequired: sectionEffect.isRequired || fieldEffect.isRequired,
    isDisabled: sectionEffect.isDisabled || fieldEffect.isDisabled,
  };
}

