// Business Rule Field Extractor
// Extracts field names/paths referenced in business rules

import { BusinessRule, Condition, ConditionGroup, Property } from '../types';

/**
 * Extract field identifiers from a property
 * Returns an array of possible field identifiers (fieldId, name, or first path segment)
 */
function extractFieldFromProperty(property: Property | null): string[] {
  if (!property) return [];

  const fields: string[] = [];

  // Add fieldId if available (most specific)
  if (property.fieldId) {
    fields.push(property.fieldId);
  }

  // Add name if available (camelCase field name)
  if (property.name) {
    fields.push(property.name);
  }

  // Extract first segment from path (e.g., "user.profile.email" -> "user")
  if (property.path) {
    const firstSegment = property.path.split('.')[0];
    if (firstSegment && !fields.includes(firstSegment)) {
      fields.push(firstSegment);
    }
  }

  return fields;
}

/**
 * Extract field references from a condition
 */
function extractFieldsFromCondition(condition: Condition): string[] {
  const fields: string[] = [];

  // Extract from property
  if (condition.property) {
    fields.push(...extractFieldFromProperty(condition.property));
  }

  // Extract from propertyReference (for property-to-property comparisons)
  if (condition.propertyReference) {
    fields.push(...extractFieldFromProperty(condition.propertyReference));
  }

  return fields;
}

/**
 * Extract field references from a condition group recursively
 */
function extractFieldsFromGroup(group: ConditionGroup): string[] {
  const fields: string[] = [];

  // Extract from all conditions in this group
  group.conditions.forEach((condition) => {
    fields.push(...extractFieldsFromCondition(condition));
  });

  // Extract from nested groups
  group.groups.forEach((nestedGroup) => {
    fields.push(...extractFieldsFromGroup(nestedGroup));
  });

  return fields;
}

/**
 * Extract all field references from a business rule
 * @param rule The business rule to analyze
 * @returns Array of unique field identifiers (fieldId, name, or path segments)
 */
export function extractFieldsFromRule(rule: BusinessRule | undefined | null): string[] {
  if (!rule || !rule.rootGroup) {
    return [];
  }

  const fields = extractFieldsFromGroup(rule.rootGroup);

  // Return unique fields
  return Array.from(new Set(fields));
}

/**
 * Extract all field references from multiple business rules
 * @param rules Object containing visibleRule, requiredRule, disabledRule
 * @returns Array of unique field identifiers
 */
export function extractFieldsFromRules(rules: {
  visibleRule?: BusinessRule;
  requiredRule?: BusinessRule;
  disabledRule?: BusinessRule;
}): string[] {
  const fields: string[] = [];

  if (rules.visibleRule) {
    fields.push(...extractFieldsFromRule(rules.visibleRule));
  }

  if (rules.requiredRule) {
    fields.push(...extractFieldsFromRule(rules.requiredRule));
  }

  if (rules.disabledRule) {
    fields.push(...extractFieldsFromRule(rules.disabledRule));
  }

  // Return unique fields
  return Array.from(new Set(fields));
}

