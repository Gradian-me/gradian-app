# Complex Rules Examples

Advanced patterns with nested conditions, complex logical expressions, and multiple effects.

## Table of Contents

- [Nested Groups](#nested-groups)
- [Complex AND/OR Combinations](#complex-andor-combinations)
- [NOT Operator](#not-operator)
- [Multiple Rules with Conflicting Effects](#multiple-rules-with-conflicting-effects)
- [Section-Level Effects](#section-level-effects)
- [Real-World Scenarios](#real-world-scenarios)

## Nested Groups

### AND with nested OR

Show field when (condition1 AND (condition2 OR condition3))

```json
{
  "id": "complex-nested-and-or",
  "name": "Complex Nested AND/OR Rule",
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
        "fixedValue": "premium",
        "propertyReference": null
      }
    ],
    "groups": [
      {
        "id": "nested-or-group",
        "logicalOperator": "or",
        "conditions": [
          {
            "id": "condition-2",
            "property": {
              "id": "status",
              "name": "status",
              "schemaName": "user",
              "path": "status",
              "fieldId": "status",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "active",
            "propertyReference": null
          },
          {
            "id": "condition-3",
            "property": {
              "id": "status",
              "name": "status",
              "schemaName": "user",
              "path": "status",
              "fieldId": "status",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "verified",
            "propertyReference": null
          }
        ],
        "groups": []
      }
    ]
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "advanced-features",
        "type": "field"
      }
    ]
  }
}
```

**Logic**: `userType == "premium" AND (status == "active" OR status == "verified")`

### OR with nested AND

Show field when (condition1 OR (condition2 AND condition3))

```json
{
  "id": "complex-nested-or-and",
  "name": "Complex Nested OR/AND Rule",
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
      }
    ],
    "groups": [
      {
        "id": "nested-and-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-2",
            "property": {
              "id": "amount",
              "name": "amount",
              "schemaName": "order",
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
            "id": "condition-3",
            "property": {
              "id": "payment-status",
              "name": "paymentStatus",
              "schemaName": "order",
              "path": "paymentStatus",
              "fieldId": "payment-status",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "pending",
            "propertyReference": null
          }
        ],
        "groups": []
      }
    ]
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "priority-processing",
        "type": "field"
      }
    ]
  }
}
```

**Logic**: `userType == "admin" OR (amount > 1000 AND paymentStatus == "pending")`

## Complex AND/OR Combinations

### Multiple nested groups

Show field when complex multi-level conditions are met

```json
{
  "id": "multi-level-nested",
  "name": "Multi-Level Nested Conditions",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "account-type",
          "name": "accountType",
          "schemaName": "account",
          "path": "accountType",
          "fieldId": "account-type",
          "type": "string"
        },
        "operator": {
          "id": "equals",
          "name": "equals",
          "title": "Equals",
          "symbol": "=="
        },
        "valueType": "fixed",
        "fixedValue": "enterprise",
        "propertyReference": null
      }
    ],
    "groups": [
      {
        "id": "level-1-group",
        "logicalOperator": "or",
        "conditions": [
          {
            "id": "condition-2",
            "property": {
              "id": "subscription-status",
              "name": "subscriptionStatus",
              "schemaName": "account",
              "path": "subscriptionStatus",
              "fieldId": "subscription-status",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "active",
            "propertyReference": null
          }
        ],
        "groups": [
          {
            "id": "level-2-group",
            "logicalOperator": "and",
            "conditions": [
              {
                "id": "condition-3",
                "property": {
                  "id": "user-count",
                  "name": "userCount",
                  "schemaName": "account",
                  "path": "userCount",
                  "fieldId": "user-count",
                  "type": "number"
                },
                "operator": {
                  "id": "greater_than",
                  "name": "greater_than",
                  "title": "Greater Than",
                  "symbol": ">"
                },
                "valueType": "fixed",
                "fixedValue": 50,
                "propertyReference": null
              },
              {
                "id": "condition-4",
                "property": {
                  "id": "trial-ended",
                  "name": "trialEnded",
                  "schemaName": "account",
                  "path": "trialEnded",
                  "fieldId": "trial-ended",
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
          }
        ]
      }
    ]
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "enterprise-features",
        "type": "field"
      }
    ],
    "requiredObjects": [
      {
        "id": "enterprise-features",
        "type": "field"
      }
    ]
  }
}
```

**Logic**: `accountType == "enterprise" AND (subscriptionStatus == "active" OR (userCount > 50 AND trialEnded == true))`

## NOT Operator

### Negate a condition

Hide field when condition is NOT met

```json
{
  "id": "not-operator-example",
  "name": "Hide Field When NOT Condition",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "not",
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
      }
    ],
    "groups": []
  },
  "effects": {
    "hiddenObjects": [
      {
        "id": "admin-settings",
        "type": "field"
      }
    ]
  }
}
```

**Logic**: `NOT (userType == "admin")` → Hide when user is NOT admin

### NOT with nested groups

```json
{
  "id": "not-with-nested",
  "name": "NOT with Nested Groups",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "not",
    "conditions": [],
    "groups": [
      {
        "id": "nested-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-1",
            "property": {
              "id": "status",
              "name": "status",
              "schemaName": "order",
              "path": "status",
              "fieldId": "status",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "completed",
            "propertyReference": null
          },
          {
            "id": "condition-2",
            "property": {
              "id": "paid",
              "name": "paid",
              "schemaName": "order",
              "path": "paid",
              "fieldId": "paid",
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
      }
    ]
  },
  "effects": {
    "visibleObjects": [
      {
        "id": "edit-order",
        "type": "field"
      }
    ]
  }
}
```

**Logic**: `NOT (status == "completed" AND paid == true)` → Show edit when order is NOT completed and paid

## Multiple Rules with Conflicting Effects

### Two rules affecting the same field

When multiple rules affect the same field, effects are merged:

```json
{
  "businessRules": [
    {
      "id": "hide-language-when-not-translate",
      "name": "Hide Language When Not Translate",
      "rootGroup": {
        "id": "root-group-1",
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
    },
    {
      "id": "show-language-when-translate",
      "name": "Show Language When Translate",
      "rootGroup": {
        "id": "root-group-2",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-2",
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

**Effect Resolution**:
- When `writingStyle != "translate"`: Rule 1 passes → field is hidden
- When `writingStyle == "translate"`: Rule 2 passes → field is visible and required
- `visibleObjects` in the same rule override `hiddenObjects` in the same rule

## Section-Level Effects

### Hide entire section

```json
{
  "id": "hide-section",
  "name": "Hide Advanced Options Section",
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
    ]
  }
}
```

**Effect**: All fields in the "advanced-options" section are hidden when `userType == "basic"`

### Require entire section

```json
{
  "id": "require-section",
  "name": "Require Payment Section",
  "rootGroup": {
    "id": "root-group",
    "logicalOperator": "and",
    "conditions": [
      {
        "id": "condition-1",
        "property": {
          "id": "payment-required",
          "name": "paymentRequired",
          "schemaName": "order",
          "path": "paymentRequired",
          "fieldId": "payment-required",
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
    "requiredObjects": [
      {
        "id": "payment-details",
        "type": "section"
      }
    ]
  }
}
```

**Effect**: All fields in the "payment-details" section become required when `paymentRequired == true`

## Real-World Scenarios

### Scenario 1: E-commerce Order Form

Show shipping options only for physical products, require express shipping for orders over $100

```json
{
  "businessRules": [
    {
      "id": "show-shipping-for-physical",
      "name": "Show Shipping for Physical Products",
      "rootGroup": {
        "id": "root-group-1",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-1",
            "property": {
              "id": "product-type",
              "name": "productType",
              "schemaName": "order",
              "path": "productType",
              "fieldId": "product-type",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "physical",
            "propertyReference": null
          }
        ],
        "groups": []
      },
      "effects": {
        "visibleObjects": [
          {
            "id": "shipping-options",
            "type": "section"
          }
        ]
      }
    },
    {
      "id": "require-express-over-100",
      "name": "Require Express Shipping Over $100",
      "rootGroup": {
        "id": "root-group-2",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-2",
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
            "valueType": "fixed",
            "fixedValue": 100,
            "propertyReference": null
          },
          {
            "id": "condition-3",
            "property": {
              "id": "product-type",
              "name": "productType",
              "schemaName": "order",
              "path": "productType",
              "fieldId": "product-type",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "physical",
            "propertyReference": null
          }
        ],
        "groups": []
      },
      "effects": {
        "requiredObjects": [
          {
            "id": "express-shipping",
            "type": "field"
          }
        ]
      }
    }
  ]
}
```

### Scenario 2: User Registration with Conditional Fields

Show different fields based on user type and registration method

```json
{
  "businessRules": [
    {
      "id": "show-company-for-business",
      "name": "Show Company Fields for Business Users",
      "rootGroup": {
        "id": "root-group-1",
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
            "fixedValue": "business",
            "propertyReference": null
          }
        ],
        "groups": []
      },
      "effects": {
        "visibleObjects": [
          {
            "id": "company-name",
            "type": "field"
          },
          {
            "id": "tax-id",
            "type": "field"
          },
          {
            "id": "business-details",
            "type": "section"
          }
        ],
        "requiredObjects": [
          {
            "id": "company-name",
            "type": "field"
          },
          {
            "id": "tax-id",
            "type": "field"
          }
        ]
      }
    },
    {
      "id": "show-phone-for-email-registration",
      "name": "Show Phone for Email Registration",
      "rootGroup": {
        "id": "root-group-2",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-2",
            "property": {
              "id": "registration-method",
              "name": "registrationMethod",
              "schemaName": "user",
              "path": "registrationMethod",
              "fieldId": "registration-method",
              "type": "string"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
              "title": "Equals",
              "symbol": "=="
            },
            "valueType": "fixed",
            "fixedValue": "email",
            "propertyReference": null
          }
        ],
        "groups": []
      },
      "effects": {
        "visibleObjects": [
          {
            "id": "phone-number",
            "type": "field"
          }
        ],
        "requiredObjects": [
          {
            "id": "phone-number",
            "type": "field"
          }
        ]
      }
    }
  ]
}
```

### Scenario 3: Conditional Pricing with Multiple Conditions

Show discount field when user is premium AND (order amount > 500 OR has referral code)

```json
{
  "id": "complex-discount-rule",
  "name": "Complex Discount Rule",
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
        "fixedValue": "premium",
        "propertyReference": null
      }
    ],
    "groups": [
      {
        "id": "nested-or-group",
        "logicalOperator": "or",
        "conditions": [
          {
            "id": "condition-2",
            "property": {
              "id": "order-amount",
              "name": "orderAmount",
              "schemaName": "order",
              "path": "orderAmount",
              "fieldId": "order-amount",
              "type": "number"
            },
            "operator": {
              "id": "greater_than",
              "name": "greater_than",
              "title": "Greater Than",
              "symbol": ">"
            },
            "valueType": "fixed",
            "fixedValue": 500,
            "propertyReference": null
          },
          {
            "id": "condition-3",
            "property": {
              "id": "has-referral-code",
              "name": "hasReferralCode",
              "schemaName": "order",
              "path": "hasReferralCode",
              "fieldId": "has-referral-code",
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
      }
    ]
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

**Logic**: `userType == "premium" AND (orderAmount > 500 OR hasReferralCode == true)`

