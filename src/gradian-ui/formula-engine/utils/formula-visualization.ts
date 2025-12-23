/**
 * Formula Visualization Utilities
 * 
 * Utilities for visualizing formulas with KaTeX and showing calculation breakdowns
 */

import { FormulaContext } from './formula-parser';

export interface VariableValue {
  variable: string; // e.g., "{{formData.price}}"
  value: number | string | null;
  displayValue: string; // Formatted value for display
  context: string; // e.g., "formData", "reference"
  fieldName: string; // e.g., "price"
}

/**
 * Extract all variables from a formula and get their values
 * @param formula - The formula string
 * @param context - The formula context (formData, formSchema, etc.)
 * @param referenceData - Optional reference data for aggregations
 * @param formSchema - Optional form schema to get field precision settings
 */
export function extractVariableValues(
  formula: string,
  context: FormulaContext,
  referenceData?: Record<string, any[]>,
  formSchema?: any
): VariableValue[] {
  const variables: VariableValue[] = [];
  
  if (!formula) return variables;

  // Match all variable patterns: {{context.field}} or {{reference.field.property.aggregation}}
  const variablePattern = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = variablePattern.exec(formula)) !== null) {
    const fullMatch = match[0]; // e.g., "{{formData.price}}"
    const content = match[1].trim(); // e.g., "formData.price"
    
    const parts = content.split('.');
    const contextKey = parts[0]; // e.g., "formData", "reference"
    const fieldName = parts[1] || '';
    const fullFieldPath = parts.slice(1).join('.'); // Full path for nested fields
    
    let value: any = null;
    let displayValue = 'N/A';

    try {
      switch (contextKey) {
        case 'formData': {
          if (context.formData && fieldName) {
            // Handle nested properties (e.g., formData.tenderItem.quantity)
            if (parts.length > 2) {
              let nestedValue = context.formData[fieldName];
              for (let i = 2; i < parts.length; i++) {
                if (nestedValue && typeof nestedValue === 'object') {
                  nestedValue = nestedValue[parts[i]];
                } else {
                  nestedValue = null;
                  break;
                }
              }
              value = nestedValue;
            } else {
              value = context.formData[fieldName];
            }
          }
          break;
        }
        case 'reference': {
          if (referenceData && fieldName) {
            const refItems = referenceData[fieldName];
            if (Array.isArray(refItems) && refItems.length > 0) {
              // Extract property and aggregation if present
              // Format: reference.fieldName.property.aggregation
              const propertyName = parts.length >= 3 && !['sum', 'avg', 'min', 'max', 'count', 'countdistinct', 'stdev'].includes(parts[2]) 
                ? parts[2] 
                : null;
              const aggregation = parts.length >= 3 && ['sum', 'avg', 'min', 'max', 'count', 'countdistinct', 'stdev'].includes(parts[parts.length - 1])
                ? parts[parts.length - 1]
                : null;

              // Extract numeric values
              const numericValues = refItems
                .map(item => {
                  let valueToAggregate: any = item;
                  if (propertyName) {
                    valueToAggregate = item?.[propertyName];
                  }

                  if (typeof valueToAggregate === 'number') return valueToAggregate;
                  if (typeof valueToAggregate === 'string') {
                    const parsed = parseFloat(valueToAggregate.replace(/[^0-9.-]/g, ''));
                    return isNaN(parsed) ? null : parsed;
                  }
                  return null;
                })
                .filter(v => v !== null && !isNaN(v)) as number[];

              if (numericValues.length > 0) {
                if (!aggregation) {
                  value = numericValues.reduce((a, b) => a + b, 0);
                } else {
                  switch (aggregation) {
                    case 'sum':
                      value = numericValues.reduce((a, b) => a + b, 0);
                      break;
                    case 'avg':
                    case 'average':
                      value = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                      break;
                    case 'min':
                      value = Math.min(...numericValues);
                      break;
                    case 'max':
                      value = Math.max(...numericValues);
                      break;
                    case 'count':
                      value = numericValues.length;
                      break;
                    case 'countdistinct': {
                      const distinct = new Set(numericValues);
                      value = distinct.size;
                      break;
                    }
                    case 'stdev': {
                      if (numericValues.length === 0) {
                        value = 0;
                      } else {
                        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                        const squaredDiffs = numericValues.map(v => Math.pow(v - avg, 2));
                        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length;
                        value = Math.sqrt(avgSquaredDiff);
                      }
                      break;
                    }
                    default:
                      value = numericValues[0] || 0;
                  }
                }
              } else {
                value = 0;
              }
            } else {
              value = 0;
            }
          }
          break;
        }
        case 'pageData': {
          if (context.pageData && fieldName) {
            value = context.pageData[fieldName];
          }
          break;
        }
        case 'userData': {
          if (context.userData && fieldName) {
            value = context.userData[fieldName];
          }
          break;
        }
      }

      // Format display value with field-specific precision
      if (value === null || value === undefined) {
        displayValue = 'N/A';
      } else if (typeof value === 'number') {
        // Get precision from field configuration
        let precision = 2; // Default precision
        
        if (formSchema?.fields) {
          // For formData fields, find the field in schema
          if (contextKey === 'formData' && fieldName) {
            const field = formSchema.fields.find((f: any) => f.name === fieldName);
            if (field) {
              // Check componentTypeConfig for decimalPoints (number fields)
              if (field.componentTypeConfig?.decimalPoints !== undefined) {
                precision = field.componentTypeConfig.decimalPoints;
              }
              // Check formulaConfig for precision (formula fields)
              else if (field.formulaConfig?.precision !== undefined) {
                precision = field.formulaConfig.precision;
              }
            }
          }
          
          // For reference fields, try to find the target schema field
          // Note: For reference aggregations, we'd need to load the target schema
          // to get the field's precision. For now, we use default precision.
          // In the future, we could fetch the target schema to get the field's precision.
        }
        
        // Format with the determined precision
        displayValue = value.toFixed(precision);
      } else {
        displayValue = String(value);
      }
    } catch (error) {
      displayValue = 'Error';
    }

    variables.push({
      variable: fullMatch,
      value,
      displayValue,
      context: contextKey,
      fieldName: parts.slice(1).join('.')
    });
  }

  return variables;
}

/**
 * Replace variables in formula with their values for display
 */
export function substituteVariables(
  formula: string,
  variableValues: VariableValue[]
): string {
  let substituted = formula;
  
  for (const { variable, displayValue } of variableValues) {
    // Replace the variable with its value in parentheses
    substituted = substituted.replace(variable, `(${displayValue})`);
  }
  
  return substituted;
}

/**
 * Replace variables in formula with field names and values in math notation format
 * Format: [fieldName: value]
 */
export function substituteVariablesWithFieldNames(
  formula: string,
  variableValues: VariableValue[],
  formSchema?: any
): string {
  let substituted = formula;
  
  for (const { variable, displayValue, fieldName, context } of variableValues) {
    // Try to get field label from schema
    let fieldLabel = fieldName;
    let aggregation = '';
    let fieldNameForLookup = fieldName;
    
    // Extract aggregation from fieldName (e.g., "quotation-items.totalPrice.sum" -> aggregation is "sum")
    const aggregationTypes = ['sum', 'avg', 'average', 'min', 'max', 'count', 'countdistinct', 'stdev'];
    const fieldParts = fieldName.split('.');
    const lastPart = fieldParts[fieldParts.length - 1];
    if (aggregationTypes.includes(lastPart.toLowerCase())) {
      aggregation = lastPart.toLowerCase();
      // Remove aggregation from fieldName for label lookup
      fieldNameForLookup = fieldParts.slice(0, -1).join('.');
    }
    
    if (formSchema?.fields) {
      // For formData fields, try to find the field in schema
      if (context === 'formData') {
        const field = formSchema.fields.find((f: any) => f.name === fieldNameForLookup);
        if (field?.label) {
          fieldLabel = field.label;
        }
      }
      
      // For reference fields, try to find the target schema and field
      if (context === 'reference') {
        // Extract the property name if it's a nested reference like reference.quotation-items.totalPrice.sum
        const parts = fieldNameForLookup.split('.');
        const sectionName = parts[0]; // e.g., "quotation-items"
        const propertyName = parts[1]; // e.g., "totalPrice"
        
        // Try to find the repeating section
        const section = formSchema.sections?.find((s: any) => 
          s.isRepeatingSection && 
          (s.repeatingConfig?.targetSchema === sectionName || 
           s.repeatingConfig?.targetSchema?.replace(/-/g, '') === sectionName.replace(/-/g, ''))
        );
        
        if (section?.repeatingConfig?.targetSchema && propertyName) {
          // We could fetch the target schema here, but for now use the property name
          fieldLabel = `${sectionName}.${propertyName}`;
        } else {
          fieldLabel = fieldNameForLookup;
        }
      }
    }
    
    // Fallback to fieldName if no label found
    if (!fieldLabel) {
      fieldLabel = variable.replace(/[{}]/g, '').replace(/^[^.]+\./, '');
    }
    
    // Add aggregation to label if present (will be converted to KaTeX notation later)
    // Put aggregation before field name
    if (aggregation) {
      // Keep aggregation as text for now, will be converted to KaTeX in formulaWithFieldNamesToKaTeX
      const aggLabel: Record<string, string> = {
        'sum': 'sum',
        'avg': 'avg',
        'average': 'avg',
        'min': 'min',
        'max': 'max',
        'count': 'count',
        'countdistinct': 'count distinct',
        'stdev': 'stdev'
      };
      fieldLabel = `${aggLabel[aggregation] || aggregation} ${fieldLabel}`;
    }
    
    // Replace the variable with [fieldName: value] format
    substituted = substituted.replace(variable, `[${fieldLabel}: ${displayValue}]`);
  }
  
  return substituted;
}

/**
 * Convert formula to KaTeX-friendly format
 * Replaces operators and formats for mathematical display
 */
export function formulaToKaTeX(formula: string): string {
  if (!formula) return '';
  
  // Replace operators with LaTeX equivalents
  let katexFormula = formula
    .replace(/\*/g, ' \\times ')
    .replace(/\//g, ' \\div ')
    .replace(/\^/g, '^')
    .replace(/%/g, ' \\% ');
  
  // Ensure proper spacing around operators (but preserve existing spaces)
  katexFormula = katexFormula.replace(/(\d)\s*([+\-])\s*(\d)/g, '$1 $2 $3');
  katexFormula = katexFormula.replace(/(\))\s*([+\-])\s*(\()/g, '$1 $2 $3');
  katexFormula = katexFormula.replace(/(\))\s*([+\-])\s*(\d)/g, '$1 $2 $3');
  katexFormula = katexFormula.replace(/(\d)\s*([+\-])\s*(\()/g, '$1 $2 $3');
  
  // Clean up multiple spaces
  katexFormula = katexFormula.replace(/\s+/g, ' ');
  
  return katexFormula.trim();
}

/**
 * Convert formula with field names to KaTeX-friendly format
 * Handles [fieldName: value] format and converts to LaTeX
 * Also handles aggregations like sum, avg, etc. in mathematical notation
 */
export function formulaWithFieldNamesToKaTeX(formula: string): string {
  if (!formula) return '';
  
  // Replace [fieldName: value] with LaTeX \left[\text{fieldName: } value\right]
  // This preserves the bracket format visually in KaTeX
  // Also handles aggregations in field names (e.g., "sum quotation-items.totalPrice")
  let katexFormula = formula.replace(/\[([^\]:]+):\s*([^\]]+)\]/g, (match, fieldName, value) => {
    // Check if field name starts with an aggregation
    const aggregationTypes = ['sum', 'avg', 'average', 'min', 'max', 'count', 'count distinct', 'stdev'];
    let baseFieldName = fieldName;
    let aggregation = '';
    
    // Extract aggregation from the beginning of field name
    for (const agg of aggregationTypes) {
      const regex = new RegExp(`^${agg.replace(/\s+/g, '\\s+')}\\s+`, 'i');
      if (regex.test(fieldName)) {
        aggregation = agg;
        baseFieldName = fieldName.replace(regex, '').trim();
        break;
      }
    }
    
    // Escape special LaTeX characters in base field name
    const escapedFieldName = baseFieldName
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/#/g, '\\#')
      .replace(/\$/g, '\\$')
      .replace(/%/g, '\\%')
      .replace(/\^/g, '\\^{}')
      .replace(/_/g, '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}');
    
    // Format aggregation as mathematical notation
    let aggNotation = '';
    if (aggregation) {
      switch (aggregation.toLowerCase()) {
        case 'sum':
          aggNotation = '\\sum';
          break;
        case 'avg':
        case 'average':
          aggNotation = '\\text{avg}';
          break;
        case 'min':
          aggNotation = '\\min';
          break;
        case 'max':
          aggNotation = '\\max';
          break;
        case 'count':
          aggNotation = '\\text{count}';
          break;
        case 'count distinct':
          aggNotation = '\\text{count distinct}';
          break;
        case 'stdev':
          aggNotation = '\\sigma';
          break;
        default:
          aggNotation = `\\text{${aggregation}}`;
      }
    }
    
    // Format as: \left[\text{fieldName: } value\right] or \left[\sum\text{ fieldName: } value\right]
    if (aggregation) {
      return `\\left[${aggNotation}\\text{ ${escapedFieldName}: }${value}\\right]`;
    } else {
      return `\\left[\\text{${escapedFieldName}: }${value}\\right]`;
    }
  });
  
  // Replace operators with LaTeX equivalents
  katexFormula = katexFormula
    .replace(/\*/g, ' \\times ')
    .replace(/\//g, ' \\div ')
    .replace(/\^/g, '^')
    .replace(/%/g, ' \\% ');
  
  // Ensure proper spacing around operators
  katexFormula = katexFormula.replace(/(\d)\s*([+\-])\s*(\d)/g, '$1 $2 $3');
  katexFormula = katexFormula.replace(/(\))\s*([+\-])\s*(\()/g, '$1 $2 $3');
  katexFormula = katexFormula.replace(/(\))\s*([+\-])\s*(\d)/g, '$1 $2 $3');
  katexFormula = katexFormula.replace(/(\d)\s*([+\-])\s*(\()/g, '$1 $2 $3');
  // Handle spacing around brackets
  katexFormula = katexFormula.replace(/(\])\s*([+\-])\s*(\[)/g, '$1 $2 $3');
  katexFormula = katexFormula.replace(/(\])\s*([+\-])\s*(\d)/g, '$1 $2 $3');
  katexFormula = katexFormula.replace(/(\d)\s*([+\-])\s*(\[)/g, '$1 $2 $3');
  
  // Clean up multiple spaces
  katexFormula = katexFormula.replace(/\s+/g, ' ');
  
  return katexFormula.trim();
}

/**
 * Create a breakdown string showing the calculation step by step
 */
export function createCalculationBreakdown(
  formula: string,
  variableValues: VariableValue[],
  result: number | string | null
): string {
  let breakdown = formula;
  
  // Replace variables with their values
  for (const { variable, displayValue } of variableValues) {
    breakdown = breakdown.replace(variable, displayValue);
  }
  
  // Add result at the end
  if (result !== null && result !== undefined) {
    const resultStr = typeof result === 'number' ? result.toFixed(2) : String(result);
    breakdown = `${breakdown} = ${resultStr}`;
  }
  
  return breakdown;
}

/**
 * Create a breakdown string with field names and values in math notation format
 */
export function createCalculationBreakdownWithFieldNames(
  formula: string,
  variableValues: VariableValue[],
  result: number | string | null,
  formSchema?: any
): string {
  // Use the field names format
  const breakdown = substituteVariablesWithFieldNames(formula, variableValues, formSchema);
  
  // Add result at the end
  if (result !== null && result !== undefined) {
    const resultStr = typeof result === 'number' ? result.toFixed(2) : String(result);
    return `${breakdown} = ${resultStr}`;
  }
  
  return breakdown;
}

