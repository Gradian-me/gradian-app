// Operator Utilities

import { Operator, Property } from '../types';

/**
 * Filter operators by property type
 */
export function getOperatorsForPropertyType(
  operators: Operator[],
  propertyType: string | null
): Operator[] {
  if (!propertyType) return operators;

  return operators.filter((op) => {
    // If operator has supportedTypes, check if property type is included
    if (op.supportedTypes && op.supportedTypes.length > 0) {
      return op.supportedTypes.includes(propertyType);
    }
    // If no supportedTypes specified, include all operators
    return true;
  });
}

/**
 * Group operators by category
 */
export function groupOperatorsByCategory(operators: Operator[]): Record<string, Operator[]> {
  const categories: Record<string, Operator[]> = {
    Comparison: [],
    Text: [],
    Membership: [],
    Null: [],
    Other: [],
  };

  operators.forEach((op) => {
    const name = op.name.toLowerCase();
    if (['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(name)) {
      categories.Comparison.push(op);
    } else if (['contains', 'starts_with', 'ends_with', 'regex'].includes(name)) {
      categories.Text.push(op);
    } else if (['in', 'not_in'].includes(name)) {
      categories.Membership.push(op);
    } else if (['is_null', 'is_not_null', 'is_blank', 'is_not_blank'].includes(name)) {
      categories.Null.push(op);
    } else {
      categories.Other.push(op);
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach((key) => {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  });

  return categories;
}

/**
 * Check if operator requires a value
 */
export function operatorRequiresValue(operator: Operator | null): boolean {
  if (!operator) return true;

  const noValueOperators = ['is_null', 'is_not_null', 'is_blank', 'is_not_blank'];
  return !noValueOperators.includes(operator.name);
}

/**
 * Check if operator works with property type
 */
export function isOperatorCompatibleWithType(operator: Operator, propertyType: string): boolean {
  if (operator.supportedTypes && operator.supportedTypes.length > 0) {
    return operator.supportedTypes.includes(propertyType);
  }
  return true;
}

