// Business Rule Operations Utilities

import { Condition, ConditionGroup, BusinessRule, RuleValidationError } from '../types';

/**
 * Generate a unique ID for conditions and groups
 */
export function generateId(): string {
  return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new empty condition
 */
export function createEmptyCondition(): Condition {
  return {
    id: generateId(),
    property: null,
    operator: null,
    valueType: 'fixed',
    fixedValue: null,
    propertyReference: null,
    description: '',
  };
}

/**
 * Create a new empty condition group
 */
export function createEmptyGroup(logicalOperator: 'and' | 'or' = 'and'): ConditionGroup {
  return {
    id: generateId(),
    logicalOperator,
    conditions: [],
    groups: [],
  };
}

/**
 * Validate a condition
 */
export function validateCondition(condition: Condition): RuleValidationError[] {
  const errors: RuleValidationError[] = [];

  if (!condition.property) {
    errors.push({
      field: 'property',
      message: 'Property is required',
      conditionId: condition.id,
    });
  }

  if (!condition.operator) {
    errors.push({
      field: 'operator',
      message: 'Operator is required',
      conditionId: condition.id,
    });
  }

  if (condition.valueType === 'fixed') {
    if (condition.fixedValue === null || condition.fixedValue === undefined || condition.fixedValue === '') {
      errors.push({
        field: 'value',
        message: 'Value is required',
        conditionId: condition.id,
      });
    }

    // Validate operator compatibility
    if (condition.operator?.requiresArray && !Array.isArray(condition.fixedValue)) {
      errors.push({
        field: 'value',
        message: `Operator '${condition.operator.title}' requires an array value`,
        conditionId: condition.id,
      });
    }
  } else if (condition.valueType === 'property') {
    if (!condition.propertyReference) {
      errors.push({
        field: 'propertyReference',
        message: 'Property reference is required',
        conditionId: condition.id,
      });
    }
  }

  return errors;
}

/**
 * Validate a condition group recursively
 */
export function validateGroup(group: ConditionGroup): RuleValidationError[] {
  const errors: RuleValidationError[] = [];

  // Validate all conditions in the group
  group.conditions.forEach((condition) => {
    errors.push(...validateCondition(condition));
  });

  // Validate nested groups
  group.groups.forEach((nestedGroup) => {
    errors.push(...validateGroup(nestedGroup));
  });

  // Check if group has at least one condition or nested group
  if (group.conditions.length === 0 && group.groups.length === 0) {
    errors.push({
      field: 'group',
      message: 'Group must contain at least one condition or nested group',
      groupId: group.id,
    });
  }

  return errors;
}

/**
 * Validate a complete business rule
 */
export function validateRule(rule: BusinessRule): RuleValidationError[] {
  const errors: RuleValidationError[] = [];

  if (!rule.rootGroup) {
    errors.push({
      field: 'rootGroup',
      message: 'Root group is required',
    });
    return errors;
  }

  errors.push(...validateGroup(rule.rootGroup));

  return errors;
}

/**
 * Find a condition by ID in a group recursively
 */
export function findConditionById(
  group: ConditionGroup,
  conditionId: string
): { condition: Condition; group: ConditionGroup } | null {
  // Check conditions in current group
  const condition = group.conditions.find((c) => c.id === conditionId);
  if (condition) {
    return { condition, group };
  }

  // Check nested groups
  for (const nestedGroup of group.groups) {
    const result = findConditionById(nestedGroup, conditionId);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Find a group by ID recursively
 */
export function findGroupById(
  group: ConditionGroup,
  groupId: string
): ConditionGroup | null {
  if (group.id === groupId) {
    return group;
  }

  for (const nestedGroup of group.groups) {
    const result = findGroupById(nestedGroup, groupId);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Remove a condition from a group
 */
export function removeCondition(group: ConditionGroup, conditionId: string): boolean {
  const index = group.conditions.findIndex((c) => c.id === conditionId);
  if (index !== -1) {
    group.conditions.splice(index, 1);
    return true;
  }

  // Try nested groups
  for (const nestedGroup of group.groups) {
    if (removeCondition(nestedGroup, conditionId)) {
      return true;
    }
  }

  return false;
}

/**
 * Remove a group from its parent
 */
export function removeGroup(parentGroup: ConditionGroup, groupId: string): boolean {
  const index = parentGroup.groups.findIndex((g) => g.id === groupId);
  if (index !== -1) {
    parentGroup.groups.splice(index, 1);
    return true;
  }

  // Try nested groups
  for (const nestedGroup of parentGroup.groups) {
    if (removeGroup(nestedGroup, groupId)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a human-readable preview of a rule
 */
export function generateRulePreview(group: ConditionGroup, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);
  const lines: string[] = [];

  group.conditions.forEach((condition, index) => {
    if (index > 0 || group.groups.length > 0) {
      lines.push(`${indentStr}${group.logicalOperator.toUpperCase()}`);
    }

    const propertyName = condition.property?.path || '?';
    const operatorSymbol = condition.operator?.symbol || '?';
    let valueStr = '?';

    if (condition.valueType === 'fixed') {
      if (Array.isArray(condition.fixedValue)) {
        valueStr = `[${condition.fixedValue.join(', ')}]`;
      } else {
        valueStr = String(condition.fixedValue);
      }
    } else if (condition.valueType === 'property') {
      valueStr = condition.propertyReference?.path || '?';
    }

    lines.push(`${indentStr}${propertyName} ${operatorSymbol} ${valueStr}`);
  });

  group.groups.forEach((nestedGroup, index) => {
    if (index > 0 || group.conditions.length > 0) {
      lines.push(`${indentStr}${group.logicalOperator.toUpperCase()}`);
    }
    lines.push(`${indentStr}(`);
    lines.push(generateRulePreview(nestedGroup, indent + 1));
    lines.push(`${indentStr})`);
  });

  return lines.join('\n');
}

/**
 * Clone a condition
 */
export function cloneCondition(condition: Condition): Condition {
  return {
    ...condition,
    id: generateId(),
    property: condition.property ? { ...condition.property } : null,
    operator: condition.operator ? { ...condition.operator } : null,
    propertyReference: condition.propertyReference ? { ...condition.propertyReference } : null,
  };
}

/**
 * Clone a group recursively
 */
export function cloneGroup(group: ConditionGroup): ConditionGroup {
  return {
    ...group,
    id: generateId(),
    conditions: group.conditions.map(cloneCondition),
    groups: group.groups.map(cloneGroup),
  };
}

