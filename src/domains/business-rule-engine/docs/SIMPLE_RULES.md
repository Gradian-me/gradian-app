# Simple Rules Examples

Common patterns and simple rule examples for everyday use cases.

## Table of Contents

- [Show/Hide Field](#showhide-field)
- [Require Field](#require-field)
- [Disable Field](#disable-field)
- [Multiple Effects](#multiple-effects)
- [Property Comparisons](#property-comparisons)
- [Multiple Conditions (AND)](#multiple-conditions-and)
- [Multiple Conditions (OR)](#multiple-conditions-or)

## Show/Hide Field

### Show field when another field equals a value

```json
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
    ]
  }
}
```

### Hide field when another field equals a value

```json
{
  "id": "hide-language-when-not-translate",
  "name": "Hide Language Field When Not Translate",
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
          "id": "not_equals",
          "name": "not_equals",
          "title": "Not Equals",
          "symbol": "!="
        },
        "valueType": "fixed",
        "fixedValue": "translate",
        "propertyReference": null
      }
    ],
    "groups": []
  },
  "effects": {
    "hiddenObjects": [
      {
        "id": "language",
        "type": "field"
      }
    ]
  }
}
```

## Require Field

### Make field required when condition is met

```json
{
  "id": "require-language-when-translate",
  "name": "Require Language Field When Translate Selected",
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
    "requiredObjects": [
      {
        "id": "language",
        "type": "field"
      }
    ]
  }
}
```

### Make field required when value is greater than threshold

```json
{
  "id": "require-approval-when-amount-high",
  "name": "Require Approval When Amount is High",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "amount",
          "name": "amount",
          "schemaName": "expense",
          "path": "amount",
          "fieldId": "amount",
          "type": "number"
        },
        "operator": {
          "id": "greater_than",
          "name": "greater_than",
          "title": "Greater Than",
          "symbol": ">"
        },
        "valueType": "fixed",
        "fixedValue": 1000,
        "propertyReference": null
      }
    ],
    "groups": []
  },
  "effects": {
    "requiredObjects": [
      {
        "id": "approval-notes",
        "type": "field"
      }
    ]
  }
}
```

## Disable Field

### Disable field when another field has a value

```json
{
  "id": "disable-edit-when-locked",
  "name": "Disable Edit Field When Form is Locked",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "is-locked",
          "name": "isLocked",
          "schemaName": "document",
          "path": "isLocked",
          "fieldId": "is-locked",
          "type": "boolean"
        },
        "operator": {
          "id": "equals",
          "name": "equals",
          "title": "Equals",
          "symbol": "=="
        },
        "valueType": "fixed",
        "fixedValue": true,
        "propertyReference": null
      }
    ],
    "groups": []
  },
  "effects": {
    "disabledObjects": [
      {
        "id": "content",
        "type": "field"
      }
    ]
  }
}
```

## Multiple Effects

### Show and require field simultaneously

```json
{
  "id": "show-and-require-language",
  "name": "Show and Require Language Field",
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
```

### Hide and disable field

```json
{
  "id": "hide-and-disable-advanced",
  "name": "Hide and Disable Advanced Options",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "user-type",
          "name": "userType",
          "schemaName": "user",
          "path": "userType",
          "fieldId": "user-type",
          "type": "string"
        },
        "operator": {
          "id": "equals",
          "name": "equals",
          "title": "Equals",
          "symbol": "=="
        },
        "valueType": "fixed",
        "fixedValue": "basic",
        "propertyReference": null
      }
    ],
    "groups": []
  },
  "effects": {
    "hiddenObjects": [
      {
        "id": "advanced-options",
        "type": "section"
      }
    ],
    "disabledObjects": [
      {
        "id": "advanced-options",
        "type": "section"
      }
    ]
  }
}
```

## Property Comparisons

### Compare two fields

```json
{
  "id": "require-confirm-when-different",
  "name": "Require Confirmation When Passwords Differ",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "password",
          "name": "password",
          "schemaName": "user",
          "path": "password",
          "fieldId": "password",
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
          "schemaName": "user",
          "path": "confirmPassword",
          "fieldId": "confirm-password",
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

### Show field when one field is greater than another

```json
{
  "id": "show-discount-when-amount-high",
  "name": "Show Discount Field When Amount Exceeds Threshold",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "total-amount",
          "name": "totalAmount",
          "schemaName": "order",
          "path": "totalAmount",
          "fieldId": "total-amount",
          "type": "number"
        },
        "operator": {
          "id": "greater_than",
          "name": "greater_than",
          "title": "Greater Than",
          "symbol": ">"
        },
        "valueType": "property",
        "fixedValue": null,
        "propertyReference": {
          "id": "discount-threshold",
          "name": "discountThreshold",
          "schemaName": "order",
          "path": "discountThreshold",
          "fieldId": "discount-threshold",
          "type": "number"
        }
      }
    ],
    "groups": []
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "discount-code",
        "type": "field"
      }
    ]
  }
}
```

## Multiple Conditions (AND)

### Require field when multiple conditions are met

```json
{
  "id": "require-approval-multiple-conditions",
  "name": "Require Approval When Multiple Conditions Met",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "amount",
          "name": "amount",
          "schemaName": "expense",
          "path": "amount",
          "fieldId": "amount",
          "type": "number"
        },
        "operator": {
          "id": "greater_than",
          "name": "greater_than",
          "title": "Greater Than",
          "symbol": ">"
        },
        "valueType": "fixed",
        "fixedValue": 1000,
        "propertyReference": null
      },
      {
        "id": "condition-2",
        "property": {
          "id": "category",
          "name": "category",
          "schemaName": "expense",
          "path": "category",
          "fieldId": "category",
          "type": "string"
        },
        "operator": {
          "id": "equals",
          "name": "equals",
          "title": "Equals",
          "symbol": "=="
        },
        "valueType": "fixed",
        "fixedValue": "travel",
        "propertyReference": null
      }
    ],
    "groups": []
  },
  "effects": {
    "requiredObjects": [
      {
        "id": "manager-approval",
        "type": "field"
      }
    ]
  }
}
```

## Multiple Conditions (OR)

### Show field when any condition is met

```json
{
  "id": "show-field-any-condition",
  "name": "Show Field When Any Condition is Met",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "or",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "user-type",
          "name": "userType",
          "schemaName": "user",
          "path": "userType",
          "fieldId": "user-type",
          "type": "string"
        },
        "operator": {
          "id": "equals",
          "name": "equals",
          "title": "Equals",
          "symbol": "=="
        },
        "valueType": "fixed",
        "fixedValue": "admin",
        "propertyReference": null
      },
      {
        "id": "condition-2",
        "property": {
          "id": "user-type",
          "name": "userType",
          "schemaName": "user",
          "path": "userType",
          "fieldId": "user-type",
          "type": "string"
        },
        "operator": {
          "id": "equals",
          "name": "equals",
          "title": "Equals",
          "symbol": "=="
        },
        "valueType": "fixed",
        "fixedValue": "manager",
        "propertyReference": null
      }
    ],
    "groups": []
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "advanced-settings",
        "type": "field"
      }
    ]
  }
}
```

## Common Patterns

### Pattern 1: Show when value is in list

```json
{
  "id": "show-when-in-list",
  "name": "Show Field When Value is in List",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "country",
          "name": "country",
          "schemaName": "address",
          "path": "country",
          "fieldId": "country",
          "type": "string"
        },
        "operator": {
          "id": "in",
          "name": "in",
          "title": "In",
          "symbol": "∈"
        },
        "valueType": "fixed",
        "fixedValue": ["US", "CA", "MX"],
        "propertyReference": null
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

### Pattern 2: Show when field is not blank

```json
{
  "id": "show-when-not-blank",
  "name": "Show Field When Another Field Has Value",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "email",
          "name": "email",
          "schemaName": "user",
          "path": "email",
          "fieldId": "email",
          "type": "string"
        },
        "operator": {
          "id": "is_not_blank",
          "name": "is_not_blank",
          "title": "Is Not Blank",
          "symbol": "≠ ''"
        },
        "valueType": "fixed",
        "fixedValue": null,
        "propertyReference": null
      }
    ],
    "groups": []
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "email-verification",
        "type": "field"
      }
    ]
  }
}
```

### Pattern 3: Disable when value is null

```json
{
  "id": "disable-when-null",
  "name": "Disable Field When Another Field is Null",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "parent-id",
          "name": "parentId",
          "schemaName": "category",
          "path": "parentId",
          "fieldId": "parent-id",
          "type": "string"
        },
        "operator": {
          "id": "is_null",
          "name": "is_null",
          "title": "Is Null",
          "symbol": "= null"
        },
        "valueType": "fixed",
        "fixedValue": null,
        "propertyReference": null
      }
    ],
    "groups": []
  },
  "effects": {
    "disabledObjects": [
      {
        "id": "subcategory",
        "type": "field"
      }
    ]
  }
}
```

