# Operators Reference

Complete reference of all available operators in the Business Rule Engine.

## Table of Contents

- [Comparison Operators](#comparison-operators)
- [Text Operators](#text-operators)
- [Membership Operators](#membership-operators)
- [Null/Blank Operators](#nullblank-operators)
- [Operator Usage Examples](#operator-usage-examples)

## Comparison Operators

### equals / eq

Checks if property value equals the comparison value.

**Symbol**: `==`

**Supported Types**: All types

**Example**:
```json
{
  "property": {
    "id": "status",
    "name": "status",
    "type": "string"
  },
  "operator": {
    "id": "equals",
    "name": "equals",
    "title": "Equals",
    "symbol": "=="
  },
  "valueType": "fixed",
  "fixedValue": "active"
}
```

**Evaluates to**: `status == "active"`

### not_equals / neq

Checks if property value does not equal the comparison value.

**Symbol**: `!=`

**Supported Types**: All types

**Example**:
```json
{
  "property": {
    "id": "user-type",
    "name": "userType",
    "type": "string"
  },
  "operator": {
    "id": "not_equals",
    "name": "not_equals",
    "title": "Not Equals",
    "symbol": "!="
  },
  "valueType": "fixed",
  "fixedValue": "guest"
}
```

**Evaluates to**: `userType != "guest"`

### greater_than / gt

Checks if property value is greater than the comparison value.

**Symbol**: `>`

**Supported Types**: `number`, `date`

**Example**:
```json
{
  "property": {
    "id": "age",
    "name": "age",
    "type": "number"
  },
  "operator": {
    "id": "greater_than",
    "name": "greater_than",
    "title": "Greater Than",
    "symbol": ">"
  },
  "valueType": "fixed",
  "fixedValue": 18
}
```

**Evaluates to**: `age > 18`

### greater_than_or_equal / gte

Checks if property value is greater than or equal to the comparison value.

**Symbol**: `>=`

**Supported Types**: `number`, `date`

**Example**:
```json
{
  "property": {
    "id": "score",
    "name": "score",
    "type": "number"
  },
  "operator": {
    "id": "greater_than_or_equal",
    "name": "greater_than_or_equal",
    "title": "Greater Than or Equal",
    "symbol": ">="
  },
  "valueType": "fixed",
  "fixedValue": 70
}
```

**Evaluates to**: `score >= 70`

### less_than / lt

Checks if property value is less than the comparison value.

**Symbol**: `<`

**Supported Types**: `number`, `date`

**Example**:
```json
{
  "property": {
    "id": "quantity",
    "name": "quantity",
    "type": "number"
  },
  "operator": {
    "id": "less_than",
    "name": "less_than",
    "title": "Less Than",
    "symbol": "<"
  },
  "valueType": "fixed",
  "fixedValue": 10
}
```

**Evaluates to**: `quantity < 10`

### less_than_or_equal / lte

Checks if property value is less than or equal to the comparison value.

**Symbol**: `<=`

**Supported Types**: `number`, `date`

**Example**:
```json
{
  "property": {
    "id": "discount-percentage",
    "name": "discountPercentage",
    "type": "number"
  },
  "operator": {
    "id": "less_than_or_equal",
    "name": "less_than_or_equal",
    "title": "Less Than or Equal",
    "symbol": "<="
  },
  "valueType": "fixed",
  "fixedValue": 50
}
```

**Evaluates to**: `discountPercentage <= 50`

## Text Operators

### contains

Checks if property value contains the comparison string.

**Symbol**: `contains`

**Supported Types**: `string`

**Example**:
```json
{
  "property": {
    "id": "description",
    "name": "description",
    "type": "string"
  },
  "operator": {
    "id": "contains",
    "name": "contains",
    "title": "Contains",
    "symbol": "contains"
  },
  "valueType": "fixed",
  "fixedValue": "urgent"
}
```

**Evaluates to**: `description.contains("urgent")`

**Note**: Case-sensitive string matching

### not_contains

Checks if property value does not contain the comparison string.

**Symbol**: `not contains`

**Supported Types**: `string`

**Example**:
```json
{
  "property": {
    "id": "title",
    "name": "title",
    "type": "string"
  },
  "operator": {
    "id": "not_contains",
    "name": "not_contains",
    "title": "Not Contains",
    "symbol": "not contains"
  },
  "valueType": "fixed",
  "fixedValue": "test"
}
```

**Evaluates to**: `title.not_contains("test")`

### starts_with

Checks if property value starts with the comparison string.

**Symbol**: `starts with`

**Supported Types**: `string`

**Example**:
```json
{
  "property": {
    "id": "email",
    "name": "email",
    "type": "string"
  },
  "operator": {
    "id": "starts_with",
    "name": "starts_with",
    "title": "Starts With",
    "symbol": "starts with"
  },
  "valueType": "fixed",
  "fixedValue": "admin@"
}
```

**Evaluates to**: `email.startsWith("admin@")`

### ends_with

Checks if property value ends with the comparison string.

**Symbol**: `ends with`

**Supported Types**: `string`

**Example**:
```json
{
  "property": {
    "id": "filename",
    "name": "filename",
    "type": "string"
  },
  "operator": {
    "id": "ends_with",
    "name": "ends_with",
    "title": "Ends With",
    "symbol": "ends with"
  },
  "valueType": "fixed",
  "fixedValue": ".pdf"
}
```

**Evaluates to**: `filename.endsWith(".pdf")`

## Membership Operators

### in

Checks if property value is in the comparison array.

**Symbol**: `∈`

**Supported Types**: All types

**Requires Array**: `true`

**Example**:
```json
{
  "property": {
    "id": "country",
    "name": "country",
    "type": "string"
  },
  "operator": {
    "id": "in",
    "name": "in",
    "title": "In",
    "symbol": "∈",
    "requiresArray": true
  },
  "valueType": "fixed",
  "fixedValue": ["US", "CA", "MX", "GB"]
}
```

**Evaluates to**: `country in ["US", "CA", "MX", "GB"]`

### not_in

Checks if property value is not in the comparison array.

**Symbol**: `∉`

**Supported Types**: All types

**Requires Array**: `true`

**Example**:
```json
{
  "property": {
    "id": "status",
    "name": "status",
    "type": "string"
  },
  "operator": {
    "id": "not_in",
    "name": "not_in",
    "title": "Not In",
    "symbol": "∉",
    "requiresArray": true
  },
  "valueType": "fixed",
  "fixedValue": ["draft", "archived"]
}
```

**Evaluates to**: `status not in ["draft", "archived"]`

## Null/Blank Operators

### is_null

Checks if property value is null or undefined.

**Symbol**: `= null`

**Supported Types**: All types

**No Value Required**: `true`

**Example**:
```json
{
  "property": {
    "id": "parent-id",
    "name": "parentId",
    "type": "string"
  },
  "operator": {
    "id": "is_null",
    "name": "is_null",
    "title": "Is Null",
    "symbol": "= null"
  },
  "valueType": "fixed",
  "fixedValue": null
}
```

**Evaluates to**: `parentId == null || parentId == undefined`

### is_not_null

Checks if property value is not null and not undefined.

**Symbol**: `≠ null`

**Supported Types**: All types

**No Value Required**: `true`

**Example**:
```json
{
  "property": {
    "id": "user-id",
    "name": "userId",
    "type": "string"
  },
  "operator": {
    "id": "is_not_null",
    "name": "is_not_null",
    "title": "Is Not Null",
    "symbol": "≠ null"
  },
  "valueType": "fixed",
  "fixedValue": null
}
```

**Evaluates to**: `userId != null && userId != undefined`

### is_blank

Checks if property value is null, undefined, or empty string (after trimming).

**Symbol**: `= ''`

**Supported Types**: `string`

**No Value Required**: `true`

**Example**:
```json
{
  "property": {
    "id": "notes",
    "name": "notes",
    "type": "string"
  },
  "operator": {
    "id": "is_blank",
    "name": "is_blank",
    "title": "Is Blank",
    "symbol": "= ''"
  },
  "valueType": "fixed",
  "fixedValue": null
}
```

**Evaluates to**: `notes == null || notes == undefined || notes.trim() == ""`

### is_not_blank

Checks if property value is not null, not undefined, and not empty string (after trimming).

**Symbol**: `≠ ''`

**Supported Types**: `string`

**No Value Required**: `true`

**Example**:
```json
{
  "property": {
    "id": "description",
    "name": "description",
    "type": "string"
  },
  "operator": {
    "id": "is_not_blank",
    "name": "is_not_blank",
    "title": "Is Not Blank",
    "symbol": "≠ ''"
  },
  "valueType": "fixed",
  "fixedValue": null
}
```

**Evaluates to**: `description != null && description != undefined && description.trim() != ""`

## Operator Usage Examples

### Example 1: Number Comparison

```json
{
  "id": "high-value-order",
  "name": "High Value Order",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "order-amount",
          "name": "orderAmount",
          "type": "number"
        },
        "operator": {
          "id": "greater_than",
          "name": "greater_than",
          "title": "Greater Than",
          "symbol": ">"
        },
        "valueType": "fixed",
        "fixedValue": 1000
      }
    ],
    "groups": []
  },
  "effects": {
    "requiredObjects": [
      {
        "id": "approval",
        "type": "field"
      }
    ]
  }
}
```

### Example 2: String Contains

```json
{
  "id": "urgent-task",
  "name": "Urgent Task",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "title",
          "name": "title",
          "type": "string"
        },
        "operator": {
          "id": "contains",
          "name": "contains",
          "title": "Contains",
          "symbol": "contains"
        },
        "valueType": "fixed",
        "fixedValue": "URGENT"
      }
    ],
    "groups": []
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "priority",
        "type": "field"
      }
    ]
  }
}
```

### Example 3: Array Membership

```json
{
  "id": "show-state-for-us-ca-mx",
  "name": "Show State for US/CA/MX",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "country",
          "name": "country",
          "type": "string"
        },
        "operator": {
          "id": "in",
          "name": "in",
          "title": "In",
          "symbol": "∈",
          "requiresArray": true
        },
        "valueType": "fixed",
        "fixedValue": ["US", "CA", "MX"]
      }
    ],
    "groups": []
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "state",
        "type": "field"
      }
    ]
  }
}
```

### Example 4: Null Check

```json
{
  "id": "show-parent-when-null",
  "name": "Show Parent When Null",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "parent-id",
          "name": "parentId",
          "type": "string"
        },
        "operator": {
          "id": "is_null",
          "name": "is_null",
          "title": "Is Null",
          "symbol": "= null"
        },
        "valueType": "fixed",
        "fixedValue": null
      }
    ],
    "groups": []
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "parent-selector",
        "type": "field"
      }
    ]
  }
}
```

### Example 5: Property-to-Property Comparison

```json
{
  "id": "require-confirm-when-different",
  "name": "Require Confirmation When Different",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "password",
          "name": "password",
          "type": "string"
        },
        "operator": {
          "id": "not_equals",
          "name": "not_equals",
          "title": "Not Equals",
          "symbol": "!="
        },
        "valueType": "property",
        "fixedValue": null,
        "propertyReference": {
          "id": "confirm-password",
          "name": "confirmPassword",
          "type": "string"
        }
      }
    ],
    "groups": []
  },
  "effects": {
    "requiredObjects": [
      {
        "id": "password-confirmation",
        "type": "field"
      }
    ]
  }
}
```

## Operator Compatibility

| Operator | String | Number | Boolean | Array | Date | Object |
|----------|--------|--------|---------|-------|------|--------|
| equals | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| not_equals | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| greater_than | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| greater_than_or_equal | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| less_than | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| less_than_or_equal | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| contains | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| not_contains | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| starts_with | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ends_with | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| in | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| not_in | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| is_null | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| is_not_null | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| is_blank | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| is_not_blank | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Notes

1. **Type Coercion**: The `equals` and `not_equals` operators perform string coercion for comparison
2. **Array Handling**: Select components return arrays of `NormalizedOption` objects. The evaluator automatically extracts the `id` or `value` from the first element
3. **Null Operators**: `is_null`, `is_not_null`, `is_blank`, and `is_not_blank` don't require a comparison value (use `null` for `fixedValue`)
4. **Property References**: When `valueType` is `"property"`, use `propertyReference` instead of `fixedValue`
5. **Array Operators**: `in` and `not_in` require the `fixedValue` to be an array

