/**
 * Secure Formula Parser
 * 
 * This parser evaluates mathematical expressions and formula strings WITHOUT using eval()
 * to prevent code injection attacks. It uses a tokenizer and recursive descent parser
 * to safely evaluate expressions.
 * 
 * SECURITY: No eval(), Function(), or any dynamic code execution is used.
 */

import { safeGetProperty, isPrototypePollutionKey } from '@/gradian-ui/shared/utils/security-utils';

export interface FormulaContext {
  formData?: Record<string, any>;
  formSchema?: any;
  pageData?: Record<string, any>;
  userData?: Record<string, any>;
  referenceData?: Record<string, any>;
}

export interface FormulaParseResult {
  success: boolean;
  value?: number | string;
  error?: string;
  dependencies?: string[]; // Field names this formula depends on
}

// Token types for the parser
type TokenType = 
  | 'NUMBER'
  | 'VARIABLE'
  | 'OPERATOR'
  | 'FUNCTION'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'DOT'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number;
  position: number;
}

/**
 * Tokenize the formula string into tokens
 * SECURITY: Only allows safe characters and patterns
 */
function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  const length = formula.length;

  while (position < length) {
    const char = formula[position];

    // Skip whitespace
    if (/\s/.test(char)) {
      position++;
      continue;
    }

    // Numbers (including decimals)
    if (/\d/.test(char)) {
      let numStr = '';
      while (position < length && /[\d.]/.test(formula[position])) {
        numStr += formula[position];
        position++;
      }
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        tokens.push({ type: 'NUMBER', value: num, position: position - numStr.length });
      }
      continue;
    }

    // Variables: {{contextKey.path}} or {{reference.field.aggregation}}
    if (char === '{' && position + 1 < length && formula[position + 1] === '{') {
      let varStr = '{{';
      position += 2;
      
      while (position < length) {
        if (formula[position] === '}' && position + 1 < length && formula[position + 1] === '}') {
          varStr += '}}';
          position += 2;
          break;
        }
        varStr += formula[position];
        position++;
      }
      
      tokens.push({ type: 'VARIABLE', value: varStr, position: position - varStr.length });
      continue;
    }

    // Operators
    if (['+', '-', '*', '/', '^', '%'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char, position });
      position++;
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char, position });
      position++;
      continue;
    }
    
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char, position });
      position++;
      continue;
    }

    // Comma
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: char, position });
      position++;
      continue;
    }

    // Dot (for property access like .avg, .sum)
    if (char === '.') {
      tokens.push({ type: 'DOT', value: char, position });
      position++;
      continue;
    }

    // Functions (like SUM, AVG, etc. - but we'll handle aggregations differently)
    // For now, skip unknown characters (they might be part of variable names)
    position++;
  }

  tokens.push({ type: 'EOF', value: '', position });
  return tokens;
}

/**
 * Resolve a variable reference from context
 * Supports: {{formData.field}}, {{formData.field.aggregation}}, {{reference.field.aggregation}}
 * SECURITY: Uses safe property access to prevent prototype pollution
 */
function resolveVariable(
  variable: string,
  context: FormulaContext,
  referenceData?: Record<string, any[]>
): { value: number | string | null; dependencies: string[] } {
  const dependencies: string[] = [];
  
  // Extract variable content: {{contextKey.path}} or {{reference.field.aggregation}}
  const match = variable.match(/\{\{([^}]+)\}\}/);
  if (!match) {
    return { value: null, dependencies };
  }

  const path = match[1].trim();
  const parts = path.split('.');
  
  if (parts.length === 0) {
    return { value: null, dependencies };
  }

  const contextKey = parts[0];
  let current: any = null;

  // Handle special 'reference' context for picker field aggregations
  if (contextKey === 'reference' && parts.length >= 2) {
    // Format: {{reference.fieldName.aggregation}} or {{reference.fieldName.field.aggregation}}
    const fieldName = parts[1];
    let propertyName: string | null = null;
    let aggregation: string | null = null;
    
    // Check if we have a property name (e.g., totalPrice) before aggregation
    if (parts.length >= 4) {
      // Format: {{reference.fieldName.propertyName.aggregation}}
      propertyName = parts[2];
      aggregation = parts[3];
    } else if (parts.length >= 3) {
      // Could be either {{reference.fieldName.aggregation}} or {{reference.fieldName.propertyName}}
      // Check if parts[2] is an aggregation type
      const possibleAggregation = parts[2];
      const aggregationTypes = ['sum', 'avg', 'average', 'min', 'max', 'count', 'countdistinct', 'stdev'];
      if (aggregationTypes.includes(possibleAggregation)) {
        aggregation = possibleAggregation;
      } else {
        propertyName = possibleAggregation;
      }
    }
    
    dependencies.push(fieldName);
    
    if (referenceData && referenceData[fieldName] && Array.isArray(referenceData[fieldName])) {
      const values = referenceData[fieldName];
      
      // Extract numeric values from reference items
      // If propertyName is specified, extract that specific field from each item
      const numericValues = values
        .map(item => {
          if (typeof item === 'number') return item;
          if (typeof item === 'string') {
            const parsed = parseFloat(item.replace(/[^0-9.-]/g, ''));
            return isNaN(parsed) ? null : parsed;
          }
          if (typeof item === 'object' && item !== null) {
            // If propertyName is specified, get that specific field
            if (propertyName) {
              const fieldValue = safeGetProperty(item, propertyName);
              if (fieldValue !== undefined && fieldValue !== null) {
                if (typeof fieldValue === 'number') return fieldValue;
                if (typeof fieldValue === 'string') {
                  const parsed = parseFloat(String(fieldValue).replace(/[^0-9.-]/g, ''));
                  return isNaN(parsed) ? null : parsed;
                }
              }
              return null;
            }
            
            // No propertyName specified, try to find a numeric field in the object
            // Common patterns: value, amount, quantity, price, etc.
            const numericFields = ['value', 'amount', 'quantity', 'price', 'totalPrice', 'total', 'netPrice', 'net_price', 'fee'];
            for (const field of numericFields) {
              const fieldValue = safeGetProperty(item, field);
              if (fieldValue !== undefined && fieldValue !== null) {
                const val = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue));
                if (!isNaN(val)) return val;
              }
            }
            // Fallback: try to parse the first numeric property
            for (const key in item) {
              if (!isPrototypePollutionKey(key) && typeof item[key] === 'number') {
                return item[key];
              }
            }
          }
          return null;
        })
        .filter(v => v !== null && !isNaN(v)) as number[];

      if (numericValues.length === 0) {
        return { value: 0, dependencies };
      }

      // Apply aggregation (if specified, otherwise return sum)
      if (!aggregation) {
        // No aggregation specified, return sum of all values
        return { value: numericValues.reduce((a, b) => a + b, 0), dependencies };
      }

      switch (aggregation) {
        case 'sum':
          return { value: numericValues.reduce((a, b) => a + b, 0), dependencies };
        case 'avg':
        case 'average':
          return { value: numericValues.reduce((a, b) => a + b, 0) / numericValues.length, dependencies };
        case 'min':
          return { value: Math.min(...numericValues), dependencies };
        case 'max':
          return { value: Math.max(...numericValues), dependencies };
        case 'count':
          return { value: numericValues.length, dependencies };
        case 'countdistinct': {
          const distinct = new Set(numericValues);
          return { value: distinct.size, dependencies };
        }
        case 'stdev': {
          if (numericValues.length === 0) return { value: 0, dependencies };
          const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          const squaredDiffs = numericValues.map(v => Math.pow(v - avg, 2));
          const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length;
          return { value: Math.sqrt(avgSquaredDiff), dependencies };
        }
        default:
          // If no aggregation specified, return first value or sum
          return { value: numericValues[0] || 0, dependencies };
      }
    }
    
    return { value: 0, dependencies };
  }

  // Handle standard context keys: formData, formSchema, pageData, userData
  switch (contextKey) {
    case 'formData':
      current = context.formData;
      break;
    case 'formSchema':
      current = context.formSchema;
      break;
    case 'pageData':
      current = context.pageData;
      break;
    case 'userData':
      current = context.userData;
      break;
    default:
      return { value: null, dependencies };
  }

  if (!current) {
    return { value: null, dependencies };
  }

  // Navigate through path parts (skip first part which is contextKey)
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // SECURITY: Prevent prototype pollution
    if (isPrototypePollutionKey(part)) {
      return { value: null, dependencies };
    }

    // Handle array access like [0]
    const arrayMatch = part.match(/^\[(\d+)\]$/);
    if (arrayMatch) {
      const index = parseInt(arrayMatch[1], 10);
      if (Array.isArray(current) && index >= 0 && index < current.length) {
        current = current[index];
      } else {
        return { value: null, dependencies };
      }
    } else {
      // SECURITY: Use safe property access
      let nextValue = safeGetProperty(current, part);
      
      // Handle picker field values: if current is an array (picker multi-select), try first item
      if (nextValue === undefined && Array.isArray(current) && current.length > 0) {
        // If current is an array (picker with selections), try first item
        const firstItem = current[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          nextValue = safeGetProperty(firstItem, part);
        }
      }
      
      if (nextValue === undefined) {
        return { value: null, dependencies };
      }
      
      current = nextValue;
      
      // If we got an array from a picker field and there are more parts to navigate, access the first item
      if (Array.isArray(current) && current.length > 0 && i < parts.length - 1) {
        // This is a picker field value (array of selections), get the first item for further navigation
        const firstItem = current[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
          current = firstItem;
        } else {
          return { value: null, dependencies };
        }
      }
    }
  }

  // Track dependency (field name from formData)
  if (contextKey === 'formData' && parts.length > 1) {
    dependencies.push(parts[1]); // First field name after formData
  }

  // Convert to number if possible, otherwise return as string
  if (typeof current === 'number') {
    return { value: current, dependencies };
  }
  
  if (typeof current === 'string') {
    // Try to parse as number
    const parsed = parseFloat(current.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed)) {
      return { value: parsed, dependencies };
    }
    return { value: current, dependencies };
  }

  if (typeof current === 'boolean') {
    return { value: current ? 1 : 0, dependencies };
  }

  if (current === null || current === undefined) {
    return { value: 0, dependencies };
  }

  // For objects/arrays, try to extract a numeric value
  if (typeof current === 'object') {
    if (Array.isArray(current) && current.length > 0) {
      // For arrays, try to get first numeric value
      for (const item of current) {
        if (typeof item === 'number') {
          return { value: item, dependencies };
        }
      }
    }
    return { value: 0, dependencies };
  }

  return { value: 0, dependencies };
}

/**
 * Recursive descent parser for mathematical expressions
 * SECURITY: Only evaluates mathematical operations, no code execution
 */
class FormulaParser {
  private tokens: Token[];
  private position: number;
  private context: FormulaContext;
  private referenceData?: Record<string, any[]>;
  private dependencies: Set<string>;

  constructor(tokens: Token[], context: FormulaContext, referenceData?: Record<string, any[]>) {
    this.tokens = tokens;
    this.position = 0;
    this.context = context;
    this.referenceData = referenceData;
    this.dependencies = new Set<string>();
  }

  private currentToken(): Token {
    return this.tokens[this.position] || this.tokens[this.tokens.length - 1];
  }

  private consume(type?: TokenType): Token {
    const token = this.currentToken();
    if (type && token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type} at position ${token.position}`);
    }
    this.position++;
    return token;
  }

  // Expression: term (('+' | '-') term)*
  private parseExpression(): number {
    let result = this.parseTerm();
    
    while (this.currentToken().type === 'OPERATOR' && 
           (this.currentToken().value === '+' || this.currentToken().value === '-')) {
      const op = this.consume().value as string;
      const term = this.parseTerm();
      
      if (op === '+') {
        result += term;
      } else {
        result -= term;
      }
    }
    
    return result;
  }

  // Term: factor (('*' | '/' | '%' | '^') factor)*
  private parseTerm(): number {
    let result = this.parseFactor();
    
    while (this.currentToken().type === 'OPERATOR' && 
           ['*', '/', '%', '^'].includes(this.currentToken().value as string)) {
      const op = this.consume().value as string;
      const factor = this.parseFactor();
      
      if (op === '*') {
        result *= factor;
      } else if (op === '/') {
        if (factor === 0) {
          throw new Error('Division by zero');
        }
        result /= factor;
      } else if (op === '%') {
        result %= factor;
      } else if (op === '^') {
        result = Math.pow(result, factor);
      }
    }
    
    return result;
  }

  // Factor: number | variable | '(' expression ')' | '-' factor
  private parseFactor(): number {
    const token = this.currentToken();
    
    if (token.type === 'NUMBER') {
      this.consume();
      return token.value as number;
    }
    
    if (token.type === 'VARIABLE') {
      this.consume();
      const { value, dependencies: deps } = resolveVariable(
        token.value as string,
        this.context,
        this.referenceData
      );
      
      // Track dependencies
      deps.forEach(dep => this.dependencies.add(dep));
      
      if (value === null) {
        return 0; // Default to 0 for missing values
      }
      
      if (typeof value === 'number') {
        return value;
      }
      
      // Try to convert string to number
      const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    
    if (token.type === 'OPERATOR' && token.value === '-') {
      this.consume();
      return -this.parseFactor();
    }
    
    if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const result = this.parseExpression();
      this.consume('RPAREN');
      return result;
    }
    
    throw new Error(`Unexpected token: ${token.type} at position ${token.position}`);
  }

  parse(): { value: number; dependencies: string[] } {
    try {
      const value = this.parseExpression();
      
      // Check for EOF
      if (this.currentToken().type !== 'EOF') {
        throw new Error(`Unexpected token after expression: ${this.currentToken().type}`);
      }
      
      return {
        value,
        dependencies: Array.from(this.dependencies)
      };
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Parse and evaluate a formula string
 * SECURITY: No eval() or code execution - uses safe parser
 * 
 * @param formula - Formula string (e.g., "{{formData.price}} * {{formData.quantity}}")
 * @param context - Context object with formData, formSchema, pageData, userData
 * @param referenceData - Optional reference data for picker field aggregations
 * @returns Parse result with value, dependencies, and any errors
 */
export function parseFormula(
  formula: string,
  context: FormulaContext,
  referenceData?: Record<string, any[]>
): FormulaParseResult {
  if (!formula || typeof formula !== 'string') {
    return { success: false, error: 'Formula is required', dependencies: [] };
  }

  // SECURITY: Validate formula contains only safe characters
  // Allow: numbers, operators, parentheses, whitespace, and {{variable}} patterns
  const variablePattern = /\{\{[^}]+\}\}/g;
  
  // Remove all valid variable patterns first
  let cleaned = formula;
  let variableMatch;
  const variablePatternFull = /\{\{[^}]+\}\}/g;
  
  // Validate each variable pattern
  while ((variableMatch = variablePatternFull.exec(formula)) !== null) {
    const varContent = variableMatch[0].slice(2, -2).trim(); // Remove {{ and }}
    // Validate variable content: allow alphanumeric, dots, brackets for array access, hyphens, and spaces
    // Hyphens are needed for schema names like "quotation-items"
    if (!/^[a-zA-Z0-9._\[\]\s-]+$/.test(varContent)) {
      return {
        success: false,
        error: `Invalid variable format: ${variableMatch[0]}`,
        dependencies: []
      };
    }
  }
  
  // Remove all variable patterns to check remaining characters
  cleaned = formula.replace(variablePattern, '');
  
  // Validate remaining characters (should only be operators, numbers, whitespace, parentheses)
  // Note: removed {} from pattern since variables are already removed
  const safePattern = /^[\d\s+\-*\/%^().,]*$/;
  if (!safePattern.test(cleaned)) {
    // Find the first invalid character for better error message
    const invalidChar = cleaned.match(/[^\d\s+\-*\/%^().,]/);
    return {
      success: false,
      error: invalidChar 
        ? `Formula contains invalid character: "${invalidChar[0]}". Only numbers, operators (+, -, *, /, %, ^), parentheses, and variables are allowed.`
        : 'Formula contains invalid characters. Only numbers, operators (+, -, *, /, %, ^), parentheses, and variables are allowed.',
      dependencies: []
    };
  }

  try {
    const tokens = tokenize(formula);
    
    if (tokens.length === 0 || (tokens.length === 1 && tokens[0].type === 'EOF')) {
      return { success: false, error: 'Empty formula', dependencies: [] };
    }

    const parser = new FormulaParser(tokens, context, referenceData);
    const result = parser.parse();

    return {
      success: true,
      value: result.value,
      dependencies: result.dependencies
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Formula parsing error',
      dependencies: []
    };
  }
}

/**
 * Extract all variable dependencies from a formula without evaluating it
 * Useful for dependency tracking
 */
export function extractFormulaDependencies(formula: string): string[] {
  if (!formula || typeof formula !== 'string') {
    return [];
  }

  const dependencies = new Set<string>();
  const variablePattern = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = variablePattern.exec(formula)) !== null) {
    const path = match[1].trim();
    const parts = path.split('.');
    
    if (parts.length > 0) {
      const contextKey = parts[0];
      
      // Track formData field dependencies
      if (contextKey === 'formData' && parts.length > 1) {
        dependencies.add(parts[1]);
      }
      
      // Track reference field dependencies (e.g., {{reference.quotationItems.totalPrice.sum}})
      // The dependency is the field name (quotationItems), not the property (totalPrice)
      if (contextKey === 'reference' && parts.length > 1) {
        dependencies.add(parts[1]);
      }
    }
  }

  return Array.from(dependencies);
}

