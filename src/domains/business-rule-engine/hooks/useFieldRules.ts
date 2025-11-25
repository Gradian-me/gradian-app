// Hook to evaluate field business rules

import { useMemo } from 'react';
import type { FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { evaluateRule } from '../utils/rule-evaluator';
import { extractFieldsFromRules } from '../utils/rule-field-extractor';

export interface FieldRuleResults {
  isVisible: boolean;
  isRequired: boolean;
  isDisabled: boolean;
}

/**
 * Hook to evaluate business rules for a field
 * Only watches fields that are actually referenced in the business rules
 * @param field The form field with optional businessRules
 * @param formValues The current form values
 * @returns Object with isVisible, isRequired, and isDisabled flags
 */
export function useFieldRules(
  field: FormField,
  formValues: Record<string, any>
): FieldRuleResults {
  // Extract which fields are referenced in the business rules
  const watchFields = useMemo(() => {
    if (!field.businessRules) {
      return [];
    }
    return extractFieldsFromRules(field.businessRules);
  }, [field.businessRules]);

  // Extract only the watched field values to avoid re-computation when unrelated fields change
  // This is critical for performance - we only want to re-evaluate when watched fields change
  const watchedValues = useMemo(() => {
    if (watchFields.length === 0) {
      return {};
    }
    const result: Record<string, any> = {};
    watchFields.forEach((fieldName) => {
      result[fieldName] = formValues[fieldName];
    });
    return result;
  }, [watchFields, formValues]);

  return useMemo(() => {
    const results: FieldRuleResults = {
      isVisible: true,
      isRequired: false,
      isDisabled: false,
    };

    if (!field.businessRules) {
      return results;
    }

    // Evaluate visibleRule using only watched values (more efficient)
    if (field.businessRules.visibleRule) {
      results.isVisible = evaluateRule(field.businessRules.visibleRule, watchedValues);
    }

    // Evaluate requiredRule using only watched values (more efficient)
    if (field.businessRules.requiredRule) {
      results.isRequired = evaluateRule(field.businessRules.requiredRule, watchedValues);
    }

    // Evaluate disabledRule using only watched values (more efficient)
    if (field.businessRules.disabledRule) {
      results.isDisabled = evaluateRule(field.businessRules.disabledRule, watchedValues);
    }

    return results;
    // Only depend on the specific fields referenced in rules via watchedValues
    // This ensures we only re-evaluate when watched fields change, not when any field changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.businessRules, watchedValues]);
}

