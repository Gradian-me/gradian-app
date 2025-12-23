# Formula Engine

A secure, eval-free formula evaluation system for form fields in Gradian UI.

## Features

- **Secure**: No `eval()`, `Function()`, or dynamic code execution
- **Dynamic Context**: Access formData, formSchema, pageData, userData
- **Reference Aggregations**: Calculate aggregations on picker field values (sum, avg, min, max, count, etc.)
- **Dependency Tracking**: Automatically tracks and recalculates when dependencies change
- **Mathematical Operations**: Supports +, -, *, /, %, ^ (power)
- **Type Safety**: Full TypeScript support

## Security

The formula engine uses a **safe recursive descent parser** that:
- Only allows mathematical operations and variable references
- Validates all input against safe character patterns
- Uses safe property access to prevent prototype pollution
- Never executes arbitrary code
- Validates all context keys (formData, formSchema, pageData, userData, reference)

### Security Measures

1. **No eval()**: All parsing is done with a tokenizer and recursive descent parser
2. **Input Validation**: Formulas are validated against safe character patterns
3. **Prototype Pollution Protection**: Uses `safeGetProperty` utility for all property access
4. **Context Validation**: Only allows whitelisted context keys
5. **Safe Number Parsing**: All numeric operations are validated

## Usage

### Basic Formula Field

```typescript
// In your schema definition
{
  id: 'total-price',
  name: 'totalPrice',
  label: 'Total Price',
  component: 'formula',
  formula: '{{formData.price}} * {{formData.quantity}}',
  formulaConfig: {
    precision: 2,
    format: 'currency'
  }
}
```

### With Reference Aggregations

```typescript
{
  id: 'avg-fee',
  name: 'avgFee',
  label: 'Average Fee',
  component: 'formula',
  formula: '{{reference.feeItems.avg}} * {{formData.quantity}}',
  formulaConfig: {
    precision: 2,
    format: 'number'
  }
}
```

### Available Context Variables

- `{{formData.fieldName}}` - Access form field values
- `{{reference.fieldName.aggregation}}` - Access picker field aggregations
  - Aggregations: `sum`, `avg`, `min`, `max`, `count`, `countdistinct`, `stdev`
- `{{pageData.query.param}}` - Access URL query parameters
- `{{userData.field}}` - Access current user data
- `{{formSchema.field}}` - Access schema metadata

### Supported Operators

- `+` - Addition
- `-` - Subtraction
- `*` - Multiplication
- `/` - Division
- `%` - Modulo
- `^` - Power
- `()` - Parentheses for grouping

### Formula Configuration

```typescript
formulaConfig?: {
  showEditor?: boolean;  // Allow editing formula (default: false)
  precision?: number;    // Decimal precision (default: 2)
  format?: 'number' | 'currency' | 'percentage' | 'text';  // Display format
}
```

## Components

### FormulaField

The main component for displaying calculated formula values.

```tsx
<FormulaField
  config={fieldConfig}
  value={calculatedValue}
  onChange={handleChange}
  formData={formData}
/>
```

### FormulaInput

Component for editing formula expressions (used in schema builder).

```tsx
<FormulaInput
  value={formula}
  onChange={setFormula}
  fieldName="totalPrice"
  formData={formData}
  showPreview={true}
/>
```

## Hooks

### useFormulaEvaluation

Hook for evaluating formulas with automatic dependency tracking.

```tsx
const evaluation = useFormulaEvaluation({
  formula: '{{formData.price}} * {{formData.quantity}}',
  fieldName: 'totalPrice',
  formData: formData,
  referenceData: referenceData
});

// evaluation.value - calculated result
// evaluation.error - any error message
// evaluation.dependencies - array of field names this formula depends on
```

## Examples

### Simple Calculation

```
{{formData.price}} * {{formData.quantity}}
```

### With Aggregations

```
{{reference.tenderItems.avg}} * {{formData.quantity}}
```

### Complex Formula

```
({{formData.basePrice}} + {{formData.tax}}) * (1 + {{formData.discount}} / 100)
```

### Using Multiple References

```
{{formData.fee}}.avg * {{formData.quantity}}.avg
```

Note: For reference aggregations, use `{{reference.fieldName.aggregation}}` syntax.

## Reference Data Extraction

The formula engine automatically extracts numeric values from picker field selections:

1. **Direct Values**: If picker field value is an array of objects, extracts numeric fields
2. **Relation Fetching**: If entity is saved, fetches related entities via HAS_FIELD_VALUE relations
3. **Field Detection**: Looks for common numeric fields: `value`, `amount`, `quantity`, `price`, `total`, `net_price`, `fee`

## Error Handling

- Invalid formulas return error messages
- Missing dependencies default to 0
- Division by zero is caught and reported
- Circular dependencies are prevented (formula cannot reference itself)

## Performance

- Formulas are memoized based on dependencies
- Only recalculates when dependencies change
- Reference data is fetched once and cached
- Efficient tokenization and parsing

## Best Practices

1. **Always specify precision** for numeric results
2. **Use appropriate format** (currency, percentage, etc.)
3. **Keep formulas simple** - complex logic should be in business rules
4. **Test formulas** with various input values
5. **Handle edge cases** - formulas should work with missing/null values

## Limitations

- No string concatenation (formulas are numeric only)
- No conditional logic (use business rules instead)
- No function calls (except aggregations)
- No loops or iterations
- Reference aggregations require picker fields with numeric values

