# Real-World Examples

Complete, production-ready examples from actual use cases.

## Table of Contents

- [AI Agent Form (Professional Writing)](#ai-agent-form-professional-writing)
- [User Registration Form](#user-registration-form)
- [E-commerce Order Form](#e-commerce-order-form)
- [Expense Report Form](#expense-report-form)
- [Multi-Step Wizard](#multi-step-wizard)

## AI Agent Form (Professional Writing)

### Scenario

A form for configuring an AI writing assistant where:
- Language field is hidden unless "translate" writing style is selected
- Language field is required when "translate" is selected
- User prompt field is always visible

### Complete Implementation

```json
{
  "id": "professional-writing",
  "label": "Professional Writing Assistant",
  "renderComponents": [
    {
      "id": "writing-style",
      "name": "writingStyle",
      "label": "Writing Style",
      "component": "select",
      "options": [
        { "id": "professional", "label": "Professional" },
        { "id": "casual", "label": "Casual" },
        { "id": "translate", "label": "Translate" },
        { "id": "extended", "label": "Extended" }
      ],
      "validation": {
        "required": true
      }
    },
    {
      "id": "language",
      "name": "language",
      "label": "Language",
      "component": "select",
      "options": [
        { "id": "en", "label": "English" },
        { "id": "fa", "label": "Persian" },
        { "id": "ar", "label": "Arabic" }
      ],
      "validation": {
        "required": false
      }
    },
    {
      "id": "user-prompt",
      "name": "userPrompt",
      "label": "Write your text to improve",
      "component": "textarea",
      "validation": {
        "required": true,
        "minLength": 10
      }
    }
  ],
  "businessRules": [
    {
      "id": "hide-language-when-not-translate",
      "name": "Hide Language Field When Not Translate",
      "rootGroup": {
        "id": "language-hide-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "language-hide-condition",
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
      "id": "require-language-when-translate",
      "name": "Require Language Field When Translate Selected",
      "rootGroup": {
        "id": "language-require-group",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "language-require-condition",
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

### React Component Usage

```typescript
import { useBusinessRuleEffects, getFieldEffects } from '@/domains/business-rule-engine';

function ProfessionalWritingForm({ agent, formValues, onChange }) {
  const fieldIds = agent.renderComponents.map(f => f.id);
  const sectionIds = ['basic-info']; // Assuming single section
  
  const ruleEffects = useBusinessRuleEffects(
    agent.businessRules,
    formValues,
    fieldIds,
    sectionIds
  );
  
  return (
    <form>
      <SelectField
        field={agent.renderComponents.find(f => f.id === 'writing-style')}
        value={formValues.writingStyle}
        onChange={(value) => onChange('writingStyle', value)}
      />
      
      {(() => {
        const languageField = agent.renderComponents.find(f => f.id === 'language');
        const fieldEffects = getFieldEffects('language', 'basic-info', ruleEffects);
        
        if (!fieldEffects.isVisible) return null;
        
        return (
          <SelectField
            field={languageField}
            value={formValues.language}
            onChange={(value) => onChange('language', value)}
            required={fieldEffects.isRequired}
          />
        );
      })()}
      
      <TextareaField
        field={agent.renderComponents.find(f => f.id === 'user-prompt')}
        value={formValues.userPrompt}
        onChange={(value) => onChange('userPrompt', value)}
      />
    </form>
  );
}
```

## User Registration Form

### Scenario

A registration form where:
- Company fields shown only for business users
- Phone number required for email registration
- Password confirmation shown when password is entered
- Terms acceptance required for all users

### Complete Implementation

```json
{
  "id": "user-registration",
  "sections": [
    {
      "id": "account-info",
      "title": "Account Information",
      "fields": [
        {
          "id": "email",
          "name": "email",
          "label": "Email",
          "component": "text",
          "validation": { "required": true, "type": "email" }
        },
        {
          "id": "registration-method",
          "name": "registrationMethod",
          "label": "Registration Method",
          "component": "select",
          "options": [
            { "id": "email", "label": "Email" },
            { "id": "phone", "label": "Phone" },
            { "id": "social", "label": "Social Media" }
          ],
          "validation": { "required": true }
        },
        {
          "id": "phone-number",
          "name": "phoneNumber",
          "label": "Phone Number",
          "component": "text",
          "validation": { "required": false }
        }
      ]
    },
    {
      "id": "password-section",
      "title": "Password",
      "fields": [
        {
          "id": "password",
          "name": "password",
          "label": "Password",
          "component": "password",
          "validation": { "required": true, "minLength": 8 }
        },
        {
          "id": "confirm-password",
          "name": "confirmPassword",
          "label": "Confirm Password",
          "component": "password",
          "validation": { "required": false }
        }
      ]
    },
    {
      "id": "business-info",
      "title": "Business Information",
      "fields": [
        {
          "id": "company-name",
          "name": "companyName",
          "label": "Company Name",
          "component": "text",
          "validation": { "required": false }
        },
        {
          "id": "tax-id",
          "name": "taxId",
          "label": "Tax ID",
          "component": "text",
          "validation": { "required": false }
        }
      ]
    },
    {
      "id": "terms-section",
      "title": "Terms and Conditions",
      "fields": [
        {
          "id": "accept-terms",
          "name": "acceptTerms",
          "label": "I accept the terms and conditions",
          "component": "checkbox",
          "validation": { "required": true }
        }
      ]
    }
  ],
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
          { "id": "business-info", "type": "section" },
          { "id": "company-name", "type": "field" },
          { "id": "tax-id", "type": "field" }
        ],
        "requiredObjects": [
          { "id": "company-name", "type": "field" },
          { "id": "tax-id", "type": "field" }
        ]
      }
    },
    {
      "id": "require-phone-for-email",
      "name": "Require Phone for Email Registration",
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
          { "id": "phone-number", "type": "field" }
        ],
        "requiredObjects": [
          { "id": "phone-number", "type": "field" }
        ]
      }
    },
    {
      "id": "show-confirm-password",
      "name": "Show Confirm Password When Password Entered",
      "rootGroup": {
        "id": "root-group-3",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-3",
            "property": {
              "id": "password",
              "name": "password",
              "schemaName": "user",
              "path": "password",
              "fieldId": "password",
              "type": "string"
            },
            "operator": {
              "id": "is_not_blank",
              "name": "is_not_blank",
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
          { "id": "confirm-password", "type": "field" }
        ],
        "requiredObjects": [
          { "id": "confirm-password", "type": "field" }
        ]
      }
    }
  ]
}
```

## E-commerce Order Form

### Scenario

An order form where:
- Shipping section shown only for physical products
- Express shipping required for orders over $100
- Discount code shown for premium users with orders over $500
- Gift message shown when gift option is selected

### Complete Implementation

```json
{
  "id": "order-form",
  "sections": [
    {
      "id": "product-info",
      "title": "Product Information",
      "fields": [
        {
          "id": "product-type",
          "name": "productType",
          "label": "Product Type",
          "component": "select",
          "options": [
            { "id": "physical", "label": "Physical" },
            { "id": "digital", "label": "Digital" }
          ],
          "validation": { "required": true }
        },
        {
          "id": "total-amount",
          "name": "totalAmount",
          "label": "Total Amount",
          "component": "number",
          "validation": { "required": true, "min": 0 }
        }
      ]
    },
    {
      "id": "shipping-section",
      "title": "Shipping Options",
      "fields": [
        {
          "id": "standard-shipping",
          "name": "standardShipping",
          "label": "Standard Shipping",
          "component": "radio",
          "validation": { "required": false }
        },
        {
          "id": "express-shipping",
          "name": "expressShipping",
          "label": "Express Shipping",
          "component": "radio",
          "validation": { "required": false }
        }
      ]
    },
    {
      "id": "discount-section",
      "title": "Discount",
      "fields": [
        {
          "id": "discount-code",
          "name": "discountCode",
          "label": "Discount Code",
          "component": "text",
          "validation": { "required": false }
        }
      ]
    },
    {
      "id": "gift-section",
      "title": "Gift Options",
      "fields": [
        {
          "id": "is-gift",
          "name": "isGift",
          "label": "This is a gift",
          "component": "checkbox",
          "validation": { "required": false }
        },
        {
          "id": "gift-message",
          "name": "giftMessage",
          "label": "Gift Message",
          "component": "textarea",
          "validation": { "required": false }
        }
      ]
    }
  ],
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
          { "id": "shipping-section", "type": "section" }
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
          { "id": "express-shipping", "type": "field" }
        ]
      }
    },
    {
      "id": "show-discount-for-premium",
      "name": "Show Discount for Premium Users",
      "rootGroup": {
        "id": "root-group-3",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-4",
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
                "id": "condition-5",
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
                  "symbol": ">"
                },
                "valueType": "fixed",
                "fixedValue": 500,
                "propertyReference": null
              },
              {
                "id": "condition-6",
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
          { "id": "discount-section", "type": "section" }
        ]
      }
    },
    {
      "id": "show-gift-message",
      "name": "Show Gift Message When Gift Selected",
      "rootGroup": {
        "id": "root-group-4",
        "logicalOperator": "and",
        "conditions": [
          {
            "id": "condition-7",
            "property": {
              "id": "is-gift",
              "name": "isGift",
              "schemaName": "order",
              "path": "isGift",
              "fieldId": "is-gift",
              "type": "boolean"
            },
            "operator": {
              "id": "equals",
              "name": "equals",
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
        "visibleObjects": [
          { "id": "gift-message", "type": "field" }
        ]
      }
    }
  ]
}
```

## Summary

These examples demonstrate:

- ✅ **Real-world scenarios**: Common form patterns
- ✅ **Complete implementations**: Full JSON schemas
- ✅ **React integration**: How to use in components
- ✅ **Best practices**: Proper rule structure and effects
- ✅ **Complex logic**: Nested conditions and multiple rules

Use these as templates for your own implementations!

