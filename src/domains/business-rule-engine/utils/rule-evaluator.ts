// Business Rule Evaluator
// Evaluates business rules against form values

import { BusinessRule, Condition, ConditionGroup, Property } from '../types';

/**
 * Get property value from form values
 */
function getPropertyValue(property: Property | null, formValues: Record<string, any>): any {
  if (!property) return undefined;

  // Try fieldId first (most specific)
  if (property.fieldId && formValues[property.fieldId] !== undefined) {
    return formValues[property.fieldId];
  }

  // Try name (camelCase field name)
  if (property.name && formValues[property.name] !== undefined) {
    return formValues[property.name];
  }

  // Try path (dot notation like "user.profile.email")
  if (property.path) {
    const pathParts = property.path.split('.');
    let value: any = formValues;
    // SECURITY: Prevent prototype pollution by validating keys
    const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];
    
    for (const part of pathParts) {
      if (value === null || value === undefined) return undefined;
      // SECURITY: Skip prototype pollution keys
      if (PROTOTYPE_POLLUTION_KEYS.includes(part)) {
        return undefined;
      }
      // SECURITY: Use hasOwnProperty check for objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!Object.prototype.hasOwnProperty.call(value, part)) {
          return undefined;
        }
        // TypeScript: value is confirmed to be a Record<string, any> here
        value = (value as Record<string, any>)[part];
      } else {
        // For arrays or other types, we can't safely index with string
        return undefined;
      }
    }
    return value;
  }

  return undefined;
}

/**
 * Normalize value for comparison (handle arrays from select components)
 */
function normalizeValue(value: any): any {
  // Handle arrays from select components (NormalizedOption[])
  if (Array.isArray(value) && value.length > 0) {
    // If it's an array of objects with id/label/value, extract the id or value
    if (typeof value[0] === 'object' && value[0] !== null) {
      // Check if it's a NormalizedOption-like object
      if ('id' in value[0]) {
        return value[0].id;
      }
      if ('value' in value[0]) {
        return value[0].value;
      }
    }
    // Otherwise return first element
    return value[0];
  }
  return value;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(condition: Condition, formValues: Record<string, any>): boolean {
  if (!condition.property || !condition.operator) {
    return false;
  }

  const propertyValue = normalizeValue(getPropertyValue(condition.property, formValues));
  const operatorName = condition.operator.name.toLowerCase();

  // Get comparison value
  let comparisonValue: any;
  if (condition.valueType === 'fixed') {
    comparisonValue = condition.fixedValue;
  } else if (condition.valueType === 'property' && condition.propertyReference) {
    comparisonValue = normalizeValue(getPropertyValue(condition.propertyReference, formValues));
  } else {
    return false;
  }

  // Normalize comparison value
  comparisonValue = normalizeValue(comparisonValue);

  // Evaluate based on operator
  switch (operatorName) {
    case 'equals':
    case 'eq':
      // String comparison with type coercion
      return String(propertyValue) === String(comparisonValue);

    case 'not_equals':
    case 'neq':
      return String(propertyValue) !== String(comparisonValue);

    case 'greater_than':
    case 'gt':
      return Number(propertyValue) > Number(comparisonValue);

    case 'greater_than_or_equal':
    case 'gte':
      return Number(propertyValue) >= Number(comparisonValue);

    case 'less_than':
    case 'lt':
      return Number(propertyValue) < Number(comparisonValue);

    case 'less_than_or_equal':
    case 'lte':
      return Number(propertyValue) <= Number(comparisonValue);

    case 'contains':
      const propStr = String(propertyValue);
      const compStr = String(comparisonValue);
      return propStr.includes(compStr);

    case 'not_contains':
      const propStr2 = String(propertyValue);
      const compStr2 = String(comparisonValue);
      return !propStr2.includes(compStr2);

    case 'starts_with':
      return String(propertyValue).startsWith(String(comparisonValue));

    case 'ends_with':
      return String(propertyValue).endsWith(String(comparisonValue));

    case 'in':
      if (!Array.isArray(comparisonValue)) {
        return false;
      }
      return comparisonValue.includes(propertyValue) || comparisonValue.includes(String(propertyValue));

    case 'not_in':
      if (!Array.isArray(comparisonValue)) {
        return true;
      }
      return !comparisonValue.includes(propertyValue) && !comparisonValue.includes(String(propertyValue));

    case 'is_null':
      return propertyValue === null || propertyValue === undefined;

    case 'is_not_null':
      return propertyValue !== null && propertyValue !== undefined;

    case 'is_blank':
      return propertyValue === null || propertyValue === undefined || String(propertyValue).trim() === '';

    case 'is_not_blank':
      return propertyValue !== null && propertyValue !== undefined && String(propertyValue).trim() !== '';

    default:
      console.warn(`Unknown operator: ${operatorName}`);
      return false;
  }
}

/**
 * Evaluate a condition group recursively
 */
function evaluateGroup(group: ConditionGroup, formValues: Record<string, any>): boolean {
  // Evaluate all conditions in this group
  const conditionResults = group.conditions.map((condition) =>
    evaluateCondition(condition, formValues)
  );

  // Evaluate nested groups
  const groupResults = group.groups.map((nestedGroup) =>
    evaluateGroup(nestedGroup, formValues)
  );

  // Combine all results
  const allResults = [...conditionResults, ...groupResults];

  if (allResults.length === 0) {
    return true; // Empty group is considered true
  }

  // Apply logical operator
  switch (group.logicalOperator) {
    case 'and':
      return allResults.every((result) => result === true);

    case 'or':
      return allResults.some((result) => result === true);

    case 'not':
      return !allResults.every((result) => result === true);

    default:
      console.warn(`Unknown logical operator: ${group.logicalOperator}`);
      return false;
  }
}

/**
 * Evaluate a business rule against form values
 * @param rule The business rule to evaluate
 * @param formValues The current form values
 * @returns true if the rule passes, false otherwise
 */
export function evaluateRule(rule: BusinessRule, formValues: Record<string, any>): boolean {
  if (!rule || !rule.rootGroup) {
    return true; // No rule means always true
  }

  return evaluateGroup(rule.rootGroup, formValues);
}

