# Business Rule Engine Types

Complete reference of all TypeScript types and interfaces used in the Business Rule Engine.

## Table of Contents

- [Core Types](#core-types)
- [Property](#property)
- [Operator](#operator)
- [Condition](#condition)
- [ConditionGroup](#conditiongroup)
- [BusinessRule](#businessrule)
- [BusinessRuleWithEffects](#businessrulewitheffects)
- [RuleTarget](#ruletarget)
- [BusinessRuleEffects](#businessruleeffects)

## Core Types

### ValueType

```typescript
type ValueType = 'fixed' | 'property';
```

- `'fixed'`: Compare against a fixed value
- `'property'`: Compare against another field's value

### LogicalOperator

```typescript
type LogicalOperator = 'and' | 'or' | 'not';
```

- `'and'`: All conditions must be true
- `'or'`: At least one condition must be true
- `'not'`: Negates the result

### ObjectType

```typescript
type ObjectType = 'field' | 'section';
```

- `'field'`: Target is a form field
- `'section'`: Target is a form section (affects all fields in the section)

## Property

Represents a form field that can be referenced in conditions.

```typescript
interface Property {
  id: string;                    // Unique identifier
  name: string;                   // Field name (camelCase)
  schemaName: string;             // Schema name
  schemaId?: string;              // Optional schema ID
  type: 'string' | 'number' | 'boolean' | 'array' | 'date' | 'object' | 'email';
  description?: string;           // Optional description
  path: string;                   // Dot notation path (e.g., "user.profile.email")
  fieldId?: string;               // Optional field ID (most specific identifier)
}
```

### Example

```typescript
const property: Property = {
  id: "writing-style",
  name: "writingStyle",
  schemaName: "ai-agent",
  path: "writingStyle",
  fieldId: "writing-style",
  type: "string"
};
```

## Operator

Represents a comparison operator.

```typescript
interface Operator {
  id: string;                     // Unique identifier
  name: string;                   // Operator name (e.g., "equals", "not_equals")
  title: string;                   // Display title
  symbol: string;                  // Symbol (e.g., "==", "!=", ">")
  color?: string;                  // Optional color for UI
  sqlEquivalent?: string;          // SQL equivalent
  cypherEquivalent?: string;      // Cypher equivalent
  supportedTypes?: string[];       // Property types this operator supports
  requiresArray?: boolean;         // For 'in' and 'not_in' operators
}
```

### Example

```typescript
const operator: Operator = {
  id: "equals",
  name: "equals",
  title: "Equals",
  symbol: "=="
};
```

## Condition

A single condition that compares a property value.

```typescript
interface Condition {
  id: string;                     // Unique identifier
  property: Property | null;      // Property to compare
  operator: Operator | null;      // Comparison operator
  valueType: ValueType;            // 'fixed' or 'property'
  fixedValue: any;                 // Fixed value (if valueType is 'fixed')
  propertyReference: Property | null; // Reference property (if valueType is 'property')
  aggregationType?: string | null; // Aggregation type (e.g., 'sum', 'avg')
  description?: string;           // Optional description
}
```

### Example: Fixed Value Comparison

```typescript
const condition: Condition = {
  id: "condition-1",
  property: {
    id: "writing-style",
    name: "writingStyle",
    schemaName: "ai-agent",
    path: "writingStyle",
    fieldId: "writing-style",
    type: "string"
  },
  operator: {
    id: "equals",
    name: "equals",
    title: "Equals",
    symbol: "=="
  },
  valueType: "fixed",
  fixedValue: "translate",
  propertyReference: null
};
```

### Example: Property-to-Property Comparison

```typescript
const condition: Condition = {
  id: "condition-2",
  property: {
    id: "age",
    name: "age",
    schemaName: "user",
    path: "age",
    fieldId: "age",
    type: "number"
  },
  operator: {
    id: "greater_than",
    name: "greater_than",
    title: "Greater Than",
    symbol: ">"
  },
  valueType: "property",
  fixedValue: null,
  propertyReference: {
    id: "minimum-age",
    name: "minimumAge",
    schemaName: "user",
    path: "minimumAge",
    fieldId: "minimum-age",
    type: "number"
  }
};
```

## ConditionGroup

A group of conditions with a logical operator. Supports nested groups.

```typescript
interface ConditionGroup {
  id: string;                      // Unique identifier
  logicalOperator: LogicalOperator; // 'and', 'or', or 'not'
  conditions: Condition[];         // Array of conditions
  groups: ConditionGroup[];        // Nested groups (recursive)
}
```

### Example: Simple Group

```typescript
const group: ConditionGroup = {
  id: "root-group",
  logicalOperator: "and",
  conditions: [
    {
      id: "condition-1",
      property: { /* ... */ },
      operator: { /* ... */ },
      valueType: "fixed",
      fixedValue: "translate",
      propertyReference: null
    }
  ],
  groups: []
};
```

### Example: Nested Groups

```typescript
const nestedGroup: ConditionGroup = {
  id: "root-group",
  logicalOperator: "and",
  conditions: [
    {
      id: "condition-1",
      property: { /* ... */ },
      operator: { /* ... */ },
      valueType: "fixed",
      fixedValue: "premium",
      propertyReference: null
    }
  ],
  groups: [
    {
      id: "nested-group-1",
      logicalOperator: "or",
      conditions: [
        {
          id: "condition-2",
          property: { /* ... */ },
          operator: { /* ... */ },
          valueType: "fixed",
          fixedValue: "active",
          propertyReference: null
        },
        {
          id: "condition-3",
          property: { /* ... */ },
          operator: { /* ... */ },
          valueType: "fixed",
          fixedValue: "verified",
          propertyReference: null
        }
      ],
      groups: []
    }
  ]
};
```

## BusinessRule

Base business rule structure (without effects).

```typescript
interface BusinessRule {
  id?: string;                    // Optional unique identifier
  name?: string;                  // Optional rule name
  description?: string;           // Optional description
  context?: string;                // Optional context
  rootGroup: ConditionGroup;       // Root condition group
  createdAt?: Date;               // Optional creation date
  updatedAt?: Date;               // Optional update date
}
```

### Example

```typescript
const rule: BusinessRule = {
  id: "show-language-when-translate",
  name: "Show Language Field When Translate Selected",
  description: "Displays the language field when writing style is set to translate",
  rootGroup: {
    id: "root-group",
    logicalOperator: "and",
    conditions: [/* ... */],
    groups: []
  }
};
```

## RuleTarget

Target object for rule effects (field or section).

```typescript
interface RuleTarget {
  id: string;                      // Field or section ID
  type: ObjectType;                // 'field' or 'section'
}
```

### Example

```typescript
const fieldTarget: RuleTarget = {
  id: "language",
  type: "field"
};

const sectionTarget: RuleTarget = {
  id: "advanced-options",
  type: "section"
};
```

## BusinessRuleEffects

Effects to apply when a rule's conditions pass.

```typescript
interface BusinessRuleEffects {
  requiredObjects?: RuleTarget[];  // Fields/sections to make required
  hiddenObjects?: RuleTarget[];    // Fields/sections to hide
  visibleObjects?: RuleTarget[];    // Fields/sections to show
  disabledObjects?: RuleTarget[];  // Fields/sections to disable
}
```

### Example

```typescript
const effects: BusinessRuleEffects = {
  visibleObjects: [
    {
      id: "language",
      type: "field"
    }
  ],
  requiredObjects: [
    {
      id: "language",
      type: "field"
    }
  ],
  hiddenObjects: [
    {
      id: "advanced-options",
      type: "section"
    }
  ]
};
```

## BusinessRuleWithEffects

Business rule with effects (push-based model).

```typescript
interface BusinessRuleWithEffects extends BusinessRule {
  effects: BusinessRuleEffects;    // Effects to apply when rule passes
}
```

### Complete Example

```typescript
const ruleWithEffects: BusinessRuleWithEffects = {
  id: "require-language-when-translate",
  name: "Require Language Field When Translate Selected",
  description: "Makes the language field visible and required when writing style is translate",
  rootGroup: {
    id: "root-group",
    logicalOperator: "and",
    conditions: [
      {
        id: "condition-1",
        property: {
          id: "writing-style",
          name: "writingStyle",
          schemaName: "ai-agent",
          path: "writingStyle",
          fieldId: "writing-style",
          type: "string"
        },
        operator: {
          id: "equals",
          name: "equals",
          title: "Equals",
          symbol: "=="
        },
        valueType: "fixed",
        fixedValue: "translate",
        propertyReference: null
      }
    ],
    groups: []
  },
  effects: {
    visibleObjects: [
      {
        id: "language",
        type: "field"
      }
    ],
    requiredObjects: [
      {
        id: "language",
        type: "field"
      }
    ]
  }
};
```

## Type Utilities

### RuleValidationError

```typescript
interface RuleValidationError {
  field: string;                  // Field name
  message: string;                 // Error message
  conditionId?: string;           // Optional condition ID
  groupId?: string;                // Optional group ID
}
```

### RuleTestResult

```typescript
interface RuleTestResult {
  passed: boolean;                // Whether the rule passed
  details: {                       // Details for each condition
    conditionId: string;
    passed: boolean;
    message: string;
    actualValue?: any;
    expectedValue?: any;
  }[];
  error?: string;                  // Optional error message
}
```

### RuleTemplate

```typescript
interface RuleTemplate {
  id: string;                      // Template ID
  name: string;                    // Template name
  description: string;             // Template description
  rule: BusinessRule;             // Rule structure
  category?: string;               // Optional category
}
```

