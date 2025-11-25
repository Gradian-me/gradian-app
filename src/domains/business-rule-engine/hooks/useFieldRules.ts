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

  // Create a stable serialized key from watched values for dependency tracking
  const watchedValuesKey = useMemo(() => {
    if (watchFields.length === 0) {
      return '';
    }
    // Create a stable string representation of the watched values
    return JSON.stringify(
      watchFields.map((fieldName) => ({
        field: fieldName,
        value: formValues[fieldName],
      })).sort((a, b) => a.field.localeCompare(b.field))
    );
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

    // Evaluate visibleRule
    if (field.businessRules.visibleRule) {
      results.isVisible = evaluateRule(field.businessRules.visibleRule, formValues);
    }

    // Evaluate requiredRule
    if (field.businessRules.requiredRule) {
      results.isRequired = evaluateRule(field.businessRules.requiredRule, formValues);
    }

    // Evaluate disabledRule
    if (field.businessRules.disabledRule) {
      results.isDisabled = evaluateRule(field.businessRules.disabledRule, formValues);
    }

    return results;
    // Only depend on the specific fields referenced in rules via the serialized key
    // This ensures we only re-evaluate when watched fields change, not when any field changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.businessRules, watchedValuesKey]);
}

