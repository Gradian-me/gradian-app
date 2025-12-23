/**
 * Formula Engine
 * 
 * A secure formula evaluation system for form fields that supports:
 * - Dynamic context variables (formData, formSchema, pageData, userData)
 * - Reference field aggregations (sum, avg, min, max, count, etc.)
 * - Mathematical operations (+, -, *, /, %, ^)
 * - Dependency tracking and automatic recalculation
 * 
 * SECURITY: No eval() or code execution - uses safe parser
 */

export { parseFormula, extractFormulaDependencies, type FormulaContext, type FormulaParseResult } from './utils/formula-parser';
export { resolveUnit } from './utils/unit-resolver';
export { 
  extractVariableValues, 
  substituteVariables, 
  substituteVariablesWithFieldNames,
  formulaToKaTeX, 
  formulaWithFieldNamesToKaTeX,
  createCalculationBreakdown,
  createCalculationBreakdownWithFieldNames,
  type VariableValue 
} from './utils/formula-visualization';
export { useFormulaEvaluation, type UseFormulaEvaluationOptions, type FormulaEvaluationResult } from './hooks/useFormulaEvaluation';
export { FormulaInput, type FormulaInputProps } from './components/FormulaInput';

