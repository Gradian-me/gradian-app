// Business Rule Engine Types

export type ValueType = 'fixed' | 'property';

export type LogicalOperator = 'and' | 'or' | 'not';

export interface Property {
  id: string;
  name: string;
  schemaName: string;
  schemaId?: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'date' | 'object' | 'email';
  description?: string;
  path: string; // e.g., "User.age" or "user.profile.email"
  fieldId?: string;
}

export interface Operator {
  id: string;
  name: string;
  title: string;
  symbol: string;
  color?: string;
  sqlEquivalent?: string;
  cypherEquivalent?: string;
  supportedTypes?: string[]; // Property types this operator supports
  requiresArray?: boolean; // For 'in' and 'not_in' operators
}

export interface Condition {
  id: string;
  property: Property | null;
  operator: Operator | null;
  valueType: ValueType;
  fixedValue: any;
  propertyReference: Property | null;
  aggregationType?: string | null; // Aggregation type name (e.g., 'sum', 'avg', 'min', 'max')
  description?: string;
}

export interface ConditionGroup {
  id: string;
  logicalOperator: LogicalOperator;
  conditions: Condition[];
  groups: ConditionGroup[]; // Nested groups
}

export interface BusinessRule {
  id?: string;
  name?: string;
  description?: string;
  context?: string;
  rootGroup: ConditionGroup;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RuleValidationError {
  field: string;
  message: string;
  conditionId?: string;
  groupId?: string;
}

export interface RuleTestResult {
  passed: boolean;
  details: {
    conditionId: string;
    passed: boolean;
    message: string;
    actualValue?: any;
    expectedValue?: any;
  }[];
  error?: string;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  rule: BusinessRule;
  category?: string;
}

