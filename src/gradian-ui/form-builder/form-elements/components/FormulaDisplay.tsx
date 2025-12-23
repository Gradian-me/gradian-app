'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calculator } from 'lucide-react';
import { parseFormula, extractFormulaDependencies, FormulaContext } from '@/gradian-ui/formula-engine/utils/formula-parser';
import { extractVariableValues, substituteVariablesWithFieldNames, formulaWithFieldNamesToKaTeX } from '@/gradian-ui/formula-engine/utils/formula-visualization';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';
import { cn } from '@/gradian-ui/shared/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { CopyContent } from './CopyContent';
import { resolveUnit } from '@/gradian-ui/formula-engine/utils/unit-resolver';
import { IconRenderer, isValidLucideIcon } from '@/gradian-ui/shared/utils/icon-renderer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Component for unit tooltip with touch support
const UnitTooltip: React.FC<{
  icon: string;
  label: string;
  color?: string | null;
}> = ({ icon, label, color }) => {
  const [open, setOpen] = useState(false);
  // Force neutral color for the icon to avoid theme accent (blue) bleed
  const iconStyle = undefined;
  const labelStyle = color ? { color } : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span 
            className="cursor-help inline-flex items-center touch-manipulation text-gray-700 dark:text-gray-300"
            onTouchStart={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            onClick={(e) => {
              e.preventDefault();
              setOpen(!open);
            }}
          >
            <IconRenderer 
              iconName={icon} 
              className={cn(
                "h-4 w-4",
                "text-gray-700 dark:text-gray-300"
              )}
              style={iconStyle}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          sideOffset={4} 
          className="z-50 text-gray-900 dark:text-gray-100"
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <IconRenderer 
              iconName={icon} 
              className={cn(
                "h-3.5 w-3.5",
                "text-gray-700 dark:text-gray-300"
              )}
              style={iconStyle}
            />
            <span 
              className={cn(
                !labelStyle && "text-gray-700 dark:text-gray-300",
                "!text-gray-700 dark:!text-gray-300"
              )} 
              style={labelStyle}
            >
              {label}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export interface FormulaDisplayProps {
  field: any;
  data: any;
  schema?: any;
  referenceData?: Record<string, any[]>;
  className?: string;
}

/**
 * Component to display formula results with a view button
 * Can be used in table cells, info cards, etc.
 */
export const FormulaDisplay: React.FC<FormulaDisplayProps> = ({
  field,
  data,
  schema,
  referenceData = {},
  className
}) => {
  const formula = field?.formula;
  const formSchema = useDynamicFormContextStore((s) => s.formSchema) || schema;
  const storeFormData = useDynamicFormContextStore((s) => s.formData);
  const userData = useDynamicFormContextStore((s) => s.userData);
  
  // Use provided data or fallback to store formData
  const formData = data || storeFormData || {};

  // Get pageData
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
  }, []);

  // Evaluate formula
  const evaluation = useMemo(() => {
    if (!formula || formula.trim() === '') {
      return { value: null, error: null, dependencies: [] };
    }

    try {
      const context: FormulaContext = {
        formData,
        formSchema: formSchema || schema,
        pageData: pageData || undefined,
        userData: userData || undefined,
        referenceData: referenceData || undefined
      };

      const parseResult = parseFormula(formula, context, referenceData);

      if (!parseResult.success) {
        return {
          value: null,
          error: parseResult.error || 'Formula evaluation failed',
          dependencies: parseResult.dependencies || []
        };
      }

      return {
        value: parseResult.value ?? null,
        error: null,
        dependencies: parseResult.dependencies || []
      };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        dependencies: []
      };
    }
  }, [formula, formData, formSchema, schema, pageData, userData, referenceData]);

  // Resolve unit expression (can be string, array, or object)
  const resolvedUnit = useMemo(() => {
    const unitExpression = field?.formulaConfig?.unit;
    if (!unitExpression) return null;

    const context: FormulaContext = {
      formData,
      formSchema: formSchema || schema,
      pageData: pageData || undefined,
      userData: userData || undefined,
      referenceData: referenceData || undefined
    };

    return resolveUnit(unitExpression, context);
  }, [field?.formulaConfig?.unit, formData, formSchema, schema, pageData, userData, referenceData]);

  // Extract unit display info (for arrays/objects)
  const unitDisplayInfo = useMemo(() => {
    if (!resolvedUnit) return null;
    
    // If it's an array, use first item
    if (Array.isArray(resolvedUnit) && resolvedUnit.length > 0) {
      const firstItem = resolvedUnit[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        return {
          icon: firstItem.icon,
          label: firstItem.label || firstItem.id,
          color: firstItem.color
        };
      }
    }
    
    // If it's an object directly
    if (typeof resolvedUnit === 'object' && resolvedUnit !== null && !Array.isArray(resolvedUnit)) {
      return {
        icon: resolvedUnit.icon,
        label: resolvedUnit.label || resolvedUnit.id,
        color: resolvedUnit.color
      };
    }
    
    // If it's a string, return as text
    if (typeof resolvedUnit === 'string') {
      return {
        text: resolvedUnit
      };
    }
    
    return null;
  }, [resolvedUnit]);

  // Format display value (without unit - unit is shown separately)
  const displayValue = useMemo(() => {
    if (evaluation.value === null || evaluation.value === undefined) {
      return '—';
    }

    const precision = field?.formulaConfig?.precision ?? 2;
    const format = field?.formulaConfig?.format || 'number';

    let formattedValue: string;

    if (typeof evaluation.value === 'number') {
      if (format === 'currency') {
        // For currency, format without currency symbol (we'll show unit separately)
        formattedValue = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision
        }).format(evaluation.value);
      } else if (format === 'percentage') {
        formattedValue = `${evaluation.value.toFixed(precision)}%`;
      } else {
        formattedValue = evaluation.value.toFixed(precision);
      }
    } else {
      formattedValue = String(evaluation.value);
    }

    return formattedValue;
  }, [evaluation.value, field?.formulaConfig]);

  // Prepare visualization data
  const katexHtml = useMemo(() => {
    if (!formula || evaluation.error) return null;

    try {
      const context: FormulaContext = {
        formData,
        formSchema: formSchema || schema,
        pageData: pageData || undefined,
        userData: userData || undefined,
        referenceData: referenceData || undefined
      };

      const variableValues = extractVariableValues(formula, context, referenceData, formSchema || schema);
      const substitutedFormula = substituteVariablesWithFieldNames(formula, variableValues, formSchema || schema);
      const katexFormula = formulaWithFieldNamesToKaTeX(substitutedFormula);

      // Render KaTeX
      try {
        return katex.renderToString(katexFormula, {
          throwOnError: false,
          displayMode: false
        });
      } catch {
        return null;
      }
    } catch {
      return null;
    }
    return null;
  }, [formula, formData, formSchema, schema, pageData, userData, referenceData, evaluation.error]);

  if (!formula) {
    return <span className={cn("text-gray-400", className)}>—</span>;
  }

  if (evaluation.error) {
    return (
      <span className={cn("text-red-600 dark:text-red-400", className)}>
        Error: {evaluation.error}
      </span>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="whitespace-nowrap">{displayValue}</span>
      {/* Display unit separately after the value */}
      {unitDisplayInfo && (
        <span className="flex items-center text-gray-700 dark:text-gray-300">
          {unitDisplayInfo.text ? (
            // Fixed unit text (e.g., "ml", "kg")
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {unitDisplayInfo.text}
            </span>
          ) : unitDisplayInfo.icon ? (
            // Icon with tooltip (from picker field)
            // Always try to render with IconRenderer - it will fallback to Text icon if invalid
            <UnitTooltip 
              icon={unitDisplayInfo.icon}
              label={unitDisplayInfo.label || 'Unit'}
              color={unitDisplayInfo.color || null}
            />
          ) : unitDisplayInfo.label ? (
            // Fallback to label if no icon
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {unitDisplayInfo.label}
            </span>
          ) : null}
        </span>
      )}
      {formula && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              title="View formula"
            >
              <Calculator className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[500px] max-w-[90vw] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Formula Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Original Formula */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">Formula:</div>
                  <CopyContent content={formula} />
                </div>
                <code className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl block wrap-break-word font-sans border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  {formula}
                </code>
              </div>

              {/* KaTeX Rendered Formula with Field Names and Values */}
              {katexHtml && (
                <div>
                  <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-gray-100">Mathematical Notation:</div>
                  <div 
                    className="text-base bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto [&_.katex]:text-base [&_.katex-display]:text-base"
                    dangerouslySetInnerHTML={{ __html: katexHtml }}
                  />
                </div>
              )}

              {/* Result */}
              {evaluation.value !== null && !evaluation.error && (
                <div>
                  <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-gray-100">Result:</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800 flex items-center gap-2">
                    <span className="whitespace-nowrap">{displayValue}</span>
                    {unitDisplayInfo && (
                      <span className="flex items-center">
                        {unitDisplayInfo.text ? (
                          <span className="text-base font-medium">{unitDisplayInfo.text}</span>
                        ) : unitDisplayInfo.icon ? (
                          <UnitTooltip 
                            icon={unitDisplayInfo.icon}
                            label={unitDisplayInfo.label || 'Unit'}
                            color={unitDisplayInfo.color || null}
                          />
                        ) : unitDisplayInfo.label ? (
                          <span className="text-base font-medium">{unitDisplayInfo.label}</span>
                        ) : null}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              {evaluation.dependencies.length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-gray-100">Dependencies:</div>
                  <div className="flex flex-wrap gap-1">
                    {evaluation.dependencies.map((dep) => (
                      <span key={dep} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {evaluation.error && (
                <div>
                  <div className="text-xs font-semibold mb-2 text-red-600 dark:text-red-400">Error:</div>
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">
                    {evaluation.error}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

FormulaDisplay.displayName = 'FormulaDisplay';

