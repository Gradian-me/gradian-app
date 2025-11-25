# Push-Based vs Pull-Based Models

The Business Rule Engine supports two models for defining business rules. This document explains the differences and when to use each.

## Table of Contents

- [Overview](#overview)
- [Push-Based Model (Recommended)](#push-based-model-recommended)
- [Pull-Based Model (Legacy)](#pull-based-model-legacy)
- [Comparison](#comparison)
- [Migration Guide](#migration-guide)

## Overview

### Push-Based Model

Rules are defined at the **schema/agent level** and **push effects** to target fields/sections. This is the recommended approach for new implementations.

### Pull-Based Model

Rules are defined **directly on fields** and fields **pull their own behavior**. This is the legacy approach maintained for backward compatibility.

## Push-Based Model (Recommended)

### Structure

Rules are defined in a `businessRules` array at the schema/agent level:

```json
{
  "id": "my-agent",
  "businessRules": [
    {
      "id": "rule-1",
      "name": "Show Language When Translate",
      "rootGroup": { /* conditions */ },
      "effects": {
        "visibleObjects": [
          { "id": "language", "type": "field" }
        ]
      }
    }
  ]
}
```

### Usage

```typescript
import { useBusinessRuleEffects, getFieldEffects } from '@/domains/business-rule-engine';

function MyForm({ schema, formValues }) {
  const fieldIds = schema.fields.map(f => f.id);
  const sectionIds = schema.sections.map(s => s.id);
  
  // Evaluate all rules at once
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
  if (!fieldEffects.isVisible) return null;
  
  return (
    <input
      required={fieldEffects.isRequired}
      disabled={fieldEffects.isDisabled}
    />
  );
}
```

### Advantages

✅ **Centralized Logic**: All rules in one place  
✅ **Reusable Rules**: One rule can affect multiple fields/sections  
✅ **Better Performance**: Single evaluation pass for all rules  
✅ **Clearer Intent**: Explicit effects on targets  
✅ **Section Support**: Can affect entire sections  
✅ **Easier Testing**: Rules are isolated and testable  

### Example

```json
{
  "id": "professional-writing",
  "businessRules": [
    {
      "id": "hide-language-when-not-translate",
      "name": "Hide Language When Not Translate",
      "rootGroup": {
        "id": "root-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-1",
            "property": {
              "id": "writing-style",
              "name": "writingStyle",
              "type": "string"
            },
            "operator": {
              "id": "not_equals",
              "name": "not_equals",
              "symbol": "!="
            },
            "valueType": "fixed",
            "fixedValue": "translate"
          }
        ],
        "groups": []
      },
      "effects": {
        "hiddenObjects": [
          { "id": "language", "type": "field" }
        ]
      }
    },
    {
      "id": "require-language-when-translate",
      "name": "Require Language When Translate",
      "rootGroup": {
        "id": "root-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-1",
            "property": {
              "id": "writing-style",
              "name": "writingStyle",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "translate"
          }
        ],
        "groups": []
      },
      "effects": {
        "visibleObjects": [
          { "id": "language", "type": "field" }
        ],
        "requiredObjects": [
          { "id": "language", "type": "field" }
        ]
      }
    }
  ]
}
```

## Pull-Based Model (Legacy)

### Structure

Rules are defined directly on fields:

```json
{
  "id": "language",
  "name": "language",
  "businessRules": {
    "visibleRule": {
      "rootGroup": { /* conditions */ }
    },
    "requiredRule": {
      "rootGroup": { /* conditions */ }
    },
    "disabledRule": {
      "rootGroup": { /* conditions */ }
    }
  }
}
```

### Usage

```typescript
import { useFieldRules } from '@/domains/business-rule-engine';

function FieldItem({ field, formValues }) {
  // Each field evaluates its own rules
  const fieldRules = useFieldRules(field, formValues);
  
  if (!fieldRules.isVisible) return null;
  
  return (
    <input
      required={fieldRules.isRequired}
      disabled={fieldRules.isDisabled}
    />
  );
}
```

### Advantages

✅ **Field-Level Control**: Rules are co-located with fields  
✅ **Simple for Single Fields**: Easy for one-off field rules  
✅ **Backward Compatible**: Works with existing implementations  

### Disadvantages

❌ **Scattered Logic**: Rules spread across multiple fields  
❌ **No Section Support**: Can't affect entire sections  
❌ **Less Reusable**: Rules tied to specific fields  
❌ **More Evaluations**: Each field evaluates separately  

### Example

```json
{
  "id": "language",
  "name": "language",
  "label": "Language",
  "businessRules": {
    "visibleRule": {
      "id": "show-language",
      "rootGroup": {
        "id": "root-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-1",
            "property": {
              "id": "writing-style",
              "name": "writingStyle",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "translate"
          }
        ],
        "groups": []
      }
    },
    "requiredRule": {
      "id": "require-language",
      "rootGroup": {
        "id": "root-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-1",
            "property": {
              "id": "writing-style",
              "name": "writingStyle",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "translate"
          }
        ],
        "groups": []
      }
    }
  }
}
```

## Comparison

| Feature | Push-Based | Pull-Based |
|---------|------------|------------|
| **Definition Location** | Schema/Agent level | Field level |
| **Rule Reusability** | ✅ High (affects multiple targets) | ❌ Low (field-specific) |
| **Section Support** | ✅ Yes | ❌ No |
| **Performance** | ✅ Single evaluation pass | ⚠️ Multiple evaluations |
| **Centralization** | ✅ All rules in one place | ❌ Scattered across fields |
| **Complexity** | ⚠️ Slightly more setup | ✅ Simpler for single fields |
| **Backward Compatible** | ✅ Yes | ✅ Yes |
| **Recommended** | ✅ Yes (for new code) | ⚠️ Legacy only |

## Migration Guide

### Step 1: Identify Field-Level Rules

Find fields with `businessRules`:

```json
{
  "id": "language",
  "businessRules": {
    "visibleRule": { /* ... */ },
    "requiredRule": { /* ... */ }
  }
}
```

### Step 2: Extract to Schema Level

Move rules to schema's `businessRules` array:

```json
{
  "id": "my-schema",
  "businessRules": [
    {
      "id": "show-language",
      "rootGroup": { /* from visibleRule */ },
      "effects": {
        "visibleObjects": [
          { "id": "language", "type": "field" }
        ]
      }
    },
    {
      "id": "require-language",
      "rootGroup": { /* from requiredRule */ },
      "effects": {
        "requiredObjects": [
          { "id": "language", "type": "field" }
        ]
      }
    }
  ]
}
```

### Step 3: Update Component Code

**Before (Pull-Based)**:
```typescript
const fieldRules = useFieldRules(field, formValues);
if (!fieldRules.isVisible) return null;
```

**After (Push-Based)**:
```typescript
const ruleEffects = useBusinessRuleEffects(
  schema.businessRules,
  formValues,
  fieldIds,
  sectionIds
);
const fieldEffects = getFieldEffects(field.id, section.id, ruleEffects);
if (!fieldEffects.isVisible) return null;
```

### Step 4: Remove Field-Level Rules

Remove `businessRules` from field definitions:

```json
{
  "id": "language",
  "name": "language"
  // businessRules removed
}
```

## Best Practices

### Use Push-Based When:

- ✅ You have multiple rules affecting multiple fields
- ✅ You need to affect entire sections
- ✅ You want centralized rule management
- ✅ You're building new features

### Use Pull-Based When:

- ✅ You have a simple, one-off field rule
- ✅ You're maintaining legacy code
- ✅ The rule is truly field-specific and won't be reused

### Hybrid Approach

You can use both models simultaneously. The system will:
1. First evaluate push-based rules (schema level)
2. Then evaluate pull-based rules (field level) if no push-based rules exist

```typescript
// In your component
let fieldEffects;
if (schema.businessRules && schema.businessRules.length > 0) {
  // Use push-based
  fieldEffects = getFieldEffects(field.id, section.id, ruleEffects);
} else {
  // Fall back to pull-based
  const fieldRules = useFieldRules(field, formValues);
  fieldEffects = {
    isVisible: fieldRules.isVisible,
    isRequired: fieldRules.isRequired,
    isDisabled: fieldRules.isDisabled,
  };
}
```

## Summary

- **Push-Based**: Recommended for new code, better performance, more flexible
- **Pull-Based**: Legacy support, simpler for single-field rules
- **Migration**: Extract field rules to schema level, update components
- **Hybrid**: Both can coexist, push-based takes precedence

