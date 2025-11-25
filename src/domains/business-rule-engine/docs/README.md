# Business Rule Engine Documentation

The Business Rule Engine is a powerful, flexible system for defining and evaluating conditional logic in forms. It allows you to dynamically control field visibility, required status, and disabled state based on form values.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Architecture](#architecture)
- [Documentation Files](#documentation-files)

## Overview

The Business Rule Engine provides two models for defining rules:

1. **Push-Based Model (Recommended)**: Rules are defined at the schema/agent level and push effects to target fields/sections
2. **Pull-Based Model (Legacy)**: Rules are defined directly on fields and pull their own behavior

### Key Features

- ✅ **Conditional Field Visibility**: Show/hide fields based on conditions
- ✅ **Dynamic Required Fields**: Make fields required based on other field values
- ✅ **Conditional Disabling**: Disable fields based on business logic
- ✅ **Nested Conditions**: Support for complex logical expressions with AND/OR/NOT
- ✅ **Property Comparisons**: Compare field values to fixed values or other fields
- ✅ **Performance Optimized**: Only watches fields referenced in rules
- ✅ **Type-Safe**: Full TypeScript support

## Quick Start

### Basic Example: Show field when another field equals a value

```json
{
  "businessRules": [
    {
      "id": "show-language-when-translate",
      "name": "Show Language Field When Translate Selected",
      "rootGroup": {
        "id": "root-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-1",
            "property": {
              "id": "writing-style",
              "name": "writingStyle",
              "schemaName": "ai-agent",
              "path": "writingStyle",
              "fieldId": "writing-style",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "translate",
            "propertyReference": null
          }
        ],
        "groups": []
      },
      "effects": {
        "visibleObjects": [
          {
            "id": "language",
            "type": "field"
          }
        ],
        "requiredObjects": [
          {
            "id": "language",
            "type": "field"
          }
        ]
      }
    }
  ]
}
```

### Using in React Components

```typescript
import { useBusinessRuleEffects, getFieldEffects } from '@/domains/business-rule-engine';

function MyForm({ schema, formValues }) {
  const fieldIds = schema.fields.map(f => f.id);
  const sectionIds = schema.sections.map(s => s.id);
  
  // Evaluate all business rules
  const ruleEffects = useBusinessRuleEffects(
    schema.businessRules,
    formValues,
    fieldIds,
    sectionIds
  );
  
  // Get effects for a specific field
  const fieldEffects = getFieldEffects(
    'language',
    'basic-info',
    ruleEffects
  );
  
  // Use effects
  if (!fieldEffects.isVisible) {
    return null; // Hide field
  }
  
  return (
    <input
      required={fieldEffects.isRequired}
      disabled={fieldEffects.isDisabled}
      // ... other props
    />
  );
}
```

## Core Concepts

### 1. Business Rule

A business rule consists of:
- **Conditions**: Logical expressions that evaluate to true/false
- **Effects**: Actions to apply when conditions are met (show, hide, require, disable)

### 2. Condition

A condition compares a property (field) value with:
- A fixed value (`valueType: "fixed"`)
- Another property value (`valueType: "property"`)

### 3. Condition Group

Groups multiple conditions with logical operators:
- `and`: All conditions must be true
- `or`: At least one condition must be true
- `not`: Negates the result

### 4. Effects

When a rule's conditions pass, it applies effects to target objects:
- `visibleObjects`: Show fields/sections
- `hiddenObjects`: Hide fields/sections
- `requiredObjects`: Make fields/sections required
- `disabledObjects`: Disable fields/sections

## Architecture

```
Business Rule Engine
├── Types (TypeScript interfaces)
├── Hooks (React hooks for evaluation)
├── Utils (Evaluation and extraction utilities)
└── Components (UI components for rule building)
```

### Evaluation Flow

1. **Extract Fields**: Identify which fields are referenced in rules
2. **Watch Values**: Only track values of referenced fields (performance optimization)
3. **Evaluate Rules**: Check if conditions pass
4. **Apply Effects**: Update field/section states based on passing rules
5. **Merge Effects**: Combine effects from multiple rules

## Documentation Files

- **[TYPES.md](./TYPES.md)**: Complete type definitions and interfaces
- **[SIMPLE_RULES.md](./SIMPLE_RULES.md)**: Simple rule examples for common scenarios
- **[COMPLEX_RULES.md](./COMPLEX_RULES.md)**: Complex nested rules with multiple conditions
- **[PUSH_VS_PULL.md](./PUSH_VS_PULL.md)**: Push-based vs pull-based models explained
- **[OPERATORS.md](./OPERATORS.md)**: All available operators with examples
- **[PERFORMANCE.md](./PERFORMANCE.md)**: Performance considerations and optimization
- **[EXAMPLES.md](./EXAMPLES.md)**: Real-world examples and use cases

## Next Steps

1. Read [TYPES.md](./TYPES.md) to understand the data structures
2. Check [SIMPLE_RULES.md](./SIMPLE_RULES.md) for common patterns
3. Review [COMPLEX_RULES.md](./COMPLEX_RULES.md) for advanced scenarios
4. See [EXAMPLES.md](./EXAMPLES.md) for real-world implementations

