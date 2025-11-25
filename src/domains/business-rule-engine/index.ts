// Business Rule Engine Domain

export * from './types';
export * from './components';
export * from './hooks';
export * from './utils/rule-operations';
export * from './utils/rule-evaluator';
export * from './utils/rule-field-extractor';
export * from './utils/property-utils';
export * from './utils/operator-utils';
export * from './utils/value-utils';

// Re-export specific types for convenience
export type { BusinessRuleWithEffects, RuleTarget, BusinessRuleEffects } from './types';

// Re-export ConditionGroup type explicitly to avoid conflict with component
export type { ConditionGroup } from './types';

