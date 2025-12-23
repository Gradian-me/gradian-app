/**
 * Hook for evaluating formula fields with dependency tracking
 */

import { useMemo, useState } from 'react';
import { parseFormula, extractFormulaDependencies, FormulaContext } from '../utils/formula-parser';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';

export interface UseFormulaEvaluationOptions {
  formula?: string;
  fieldName: string;
  formData?: Record<string, any>;
  referenceData?: Record<string, any[]>; // For picker field aggregations
  enabled?: boolean;
}

export interface FormulaEvaluationResult {
  value: number | string | null;
  error: string | null;
  dependencies: string[];
  isEvaluating: boolean;
}

/**
 * Hook to evaluate a formula field
 * Automatically recalculates when dependencies change
 */
export function useFormulaEvaluation({
  formula,
  fieldName,
  formData,
  referenceData,
  enabled = true
}: UseFormulaEvaluationOptions): FormulaEvaluationResult {
  
  // Get context from store
  const formSchema = useDynamicFormContextStore((s) => s.formSchema);
  const storeFormData = useDynamicFormContextStore((s) => s.formData);
  const userData = useDynamicFormContextStore((s) => s.userData);
  
  // Get pageData separately (not from store, computed from browser)
  // Memoize to prevent creating new object on every render
  const pageData = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        const query: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          query[key] = value;
        });
        return {
          host: url.host,
          hostname: url.hostname,
          origin: url.origin,
          pathname: url.pathname,
          query
        };
      } catch {
        return null;
      }
    }
    return null;
  }, []); // Empty deps - pageData only changes on navigation, which causes remount anyway

  // Use provided formData or fallback to store
  const effectiveFormData = formData || storeFormData || {};

  // Extract dependencies from formula
  const dependencies = useMemo(() => {
    if (!formula) return [];
    return extractFormulaDependencies(formula);
  }, [formula]);

  // Create dependency values object for change detection
  const dependencyValues = useMemo(() => {
    const values: Record<string, any> = {};
    dependencies.forEach(dep => {
      values[dep] = effectiveFormData[dep];
    });
    return values;
  }, [dependencies, effectiveFormData]);

  // Evaluate formula
  const dependencyKey = JSON.stringify(dependencyValues);

  const result = useMemo(() => {
    if (!enabled || !formula || formula.trim() === '') {
      return {
        value: null,
        error: null,
        dependencies: [],
        isEvaluating: false
      };
    }

    try {
      const context: FormulaContext = {
        formData: effectiveFormData,
        formSchema,
        pageData: pageData || undefined,
        userData: userData || undefined,
        referenceData: referenceData || undefined
      };

      const parseResult = parseFormula(formula, context, referenceData);

      if (!parseResult.success) {
        return {
          value: null,
          error: parseResult.error || 'Formula evaluation failed',
          dependencies: parseResult.dependencies || [],
          isEvaluating: false
        };
      }

      return {
        value: parseResult.value ?? null,
        error: null,
        dependencies: parseResult.dependencies || [],
        isEvaluating: false
      };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        dependencies: [],
        isEvaluating: false
      };
    }
  }, [formula, enabled, effectiveFormData, formSchema, pageData, userData, referenceData, dependencyKey]);

  return result;
}

