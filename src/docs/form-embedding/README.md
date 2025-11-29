# Form Embedding System

## Overview

The Form Embedding System allows external applications to open your forms in a popup window. The form saves data to your app's backend, and results are communicated back to the parent window via the postMessage API.

## Features

- ✅ **Multiple Embed Modes**: 
  - **Popup Mode** (default): Opens forms in a popup window
  - **Modal Mode**: Embeds forms as a modal dialog directly in your page (no popup, no iframe)
- ✅ **Create & Edit Modes**: Support for both creating new records and editing existing ones
- ✅ **Initial Values**: Pre-fill forms with initial data
- ✅ **Type-Safe Communication**: TypeScript types for all postMessage events
- ✅ **Promise-based API**: Easy-to-use helper function returns a promise
- ✅ **Error Handling**: Comprehensive error handling and communication
- ✅ **CORS Support**: Ready for cross-origin requests
- ✅ **Security**: Origin validation for postMessage communication

## Quick Start

### 1. Popup Mode (Default)

Opens forms in a popup window. Use `GradianFormEmbed`:

### 2. Modal Mode (No Popup, No Iframe)

Embeds forms as a modal dialog directly in your page. Use `GradianFormEmbedModal`:

```html
<!-- Load the modal version -->
<script src="https://cdn.yourapp.com/form-embed-helper-modal.min.js"></script>

<script>
  // Opens a modal dialog in the current page
  const result = await GradianFormEmbedModal.createData('tags', {
    baseUrl: 'https://yourapp.com',
    initialValues: { name: 'New Tag' },
  });
</script>
```

### 3. Using the Helper Function (Popup Mode)

The easiest way to embed forms is using the `openFormEmbed` helper function:

```typescript
import { openFormEmbed } from '@/gradian-ui/form-builder/utils/form-embed-helper';

// Open a form in create mode
const result = await openFormEmbed({
  baseUrl: 'https://yourapp.com',
  schemaId: 'vendors',
  mode: 'create',
  initialValues: {
    name: 'New Vendor',
    email: 'vendor@example.com',
  },
});

if (result.success) {
  console.log('Form submitted:', result.data);
  console.log('Entity ID:', result.entityId);
} else {
  console.error('Form error:', result.error);
}
```

### 2. Manual Implementation

If you prefer to implement it manually:

```typescript
// Open the popup
const popup = window.open(
  'https://yourapp.com/forms/embed?schemaId=vendors&mode=create&initialValues=' + 
  encodeURIComponent(JSON.stringify({ name: 'New Vendor' })),
  'formEmbed',
  'width=900,height=700'
);

// Listen for messages
window.addEventListener('message', (event) => {
  // Validate origin
  if (event.origin !== 'https://yourapp.com') return;

  if (event.data.type === 'form-submitted') {
    if (event.data.payload.success) {
      console.log('Form submitted:', event.data.payload.data);
    }
  }
});
```

## API Reference

### `openFormEmbed(options)`

Opens a form in a popup window and returns a promise that resolves when the form is submitted or closed.

#### Parameters

```typescript
interface OpenFormEmbedOptions {
  // Base URL of the form embed server
  baseUrl?: string; // Default: window.location.origin

  // Schema ID to load
  schemaId: string;

  // Form mode: 'create' or 'edit'
  mode?: 'create' | 'edit'; // Default: 'create'

  // Entity ID (required for edit mode)
  entityId?: string;

  // Initial values to pre-fill the form
  initialValues?: Record<string, any>;

  // Popup window features
  popupFeatures?: {
    width?: number;   // Default: 900
    height?: number;  // Default: 700
    left?: number;    // Default: centered
    top?: number;     // Default: centered
  };

  // Allowed origins for postMessage (security)
  allowedOrigins?: string[];

  // Timeout in milliseconds
  timeout?: number; // Default: 300000 (5 minutes)
}
```

#### Return Value

Returns a `FormEmbedPromise` that resolves with:

```typescript
interface FormEmbedResult {
  success: boolean;
  data?: Record<string, any>;  // Submitted form data
  entityId?: string;            // ID of created/updated entity
  error?: string;               // Error message if failed
}
```

The promise also has a `close()` method to programmatically close the popup:

```typescript
const formPromise = openFormEmbed({ ... });

// Close the popup programmatically
formPromise.close();
```

## Examples

### Create Mode

```typescript
import { openFormEmbed } from '@/gradian-ui/form-builder/utils/form-embed-helper';

async function createVendor() {
  try {
    const result = await openFormEmbed({
      baseUrl: 'https://yourapp.com',
      schemaId: 'vendors',
      mode: 'create',
      initialValues: {
        name: 'Acme Corporation',
        email: 'contact@acme.com',
      },
    });

    if (result.success) {
      console.log('Vendor created:', result.entityId);
      // Refresh your vendor list or update UI
    } else {
      console.error('Failed to create vendor:', result.error);
    }
  } catch (error) {
    console.error('Error opening form:', error);
  }
}
```

### Edit Mode

```typescript
async function editVendor(vendorId: string) {
  try {
    const result = await openFormEmbed({
      baseUrl: 'https://yourapp.com',
      schemaId: 'vendors',
      mode: 'edit',
      entityId: vendorId,
    });

    if (result.success) {
      console.log('Vendor updated:', result.data);
      // Refresh your vendor list or update UI
    } else {
      console.error('Failed to update vendor:', result.error);
    }
  } catch (error) {
    console.error('Error opening form:', error);
  }
}
```

### Custom Popup Size

```typescript
const result = await openFormEmbed({
  baseUrl: 'https://yourapp.com',
  schemaId: 'vendors',
  mode: 'create',
  popupFeatures: {
    width: 1200,
    height: 800,
  },
});
```

### With Timeout

```typescript
const result = await openFormEmbed({
  baseUrl: 'https://yourapp.com',
  schemaId: 'vendors',
  mode: 'create',
  timeout: 60000, // 1 minute timeout
});
```

## PostMessage Events

The embed system uses postMessage for communication. Here are the message types:

### `form-ready`

Sent when the form is ready to be displayed.

```typescript
{
  type: 'form-ready',
  payload: {
    schemaId: string;
    mode: 'create' | 'edit';
    entityId?: string;
  },
  timestamp: number,
  messageId: string
}
```

### `form-loaded`

Sent when the form schema has been loaded.

```typescript
{
  type: 'form-loaded',
  payload: {
    schemaId: string;
    mode: 'create' | 'edit';
  },
  timestamp: number,
  messageId: string
}
```

### `form-submitted`

Sent when the form is successfully submitted.

```typescript
{
  type: 'form-submitted',
  payload: {
    success: boolean;
    data?: Record<string, any>;
    entityId?: string;
    error?: string;
  },
  timestamp: number,
  messageId: string
}
```

### `form-closed`

Sent when the form is closed.

```typescript
{
  type: 'form-closed',
  payload: {
    reason: 'user' | 'success' | 'error';
  },
  timestamp: number,
  messageId: string
}
```

### `form-error`

Sent when an error occurs.

```typescript
{
  type: 'form-error',
  payload: {
    error: string;
    statusCode?: number;
  },
  timestamp: number,
  messageId: string
}
```

## URL Parameters

The embed page accepts the following query parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | string | Yes | The ID of the schema to load |
| `mode` | 'create' \| 'edit' | No | Form mode (default: 'create') |
| `entityId` | string | No | Entity ID (required for edit mode) |
| `initialValues` | string (JSON) | No | JSON-encoded initial values |
| `returnOrigin` | string | No | Origin for postMessage (auto-set by helper) |

### Example URL

```
https://yourapp.com/forms/embed?schemaId=vendors&mode=create&initialValues=%7B%22name%22%3A%22New%20Vendor%22%7D
```

## Security

### Origin Validation

The embed system validates message origins for security. Configure allowed origins using environment variables:

```env
# .env.local
NEXT_PUBLIC_FORM_EMBED_ALLOWED_ORIGINS=https://app1.com,https://app2.com
FORM_EMBED_ALLOWED_ORIGINS=https://app1.com,https://app2.com
```

### API Key Authentication (Future)

The system is designed to support API key authentication. The structure is ready, and you can add API key validation in the schema API endpoint.

## Error Handling

The helper function handles errors gracefully:

```typescript
try {
  const result = await openFormEmbed({
    schemaId: 'vendors',
    mode: 'create',
  });

  if (!result.success) {
    // Handle form submission failure
    console.error(result.error);
  }
} catch (error) {
  // Handle popup opening failure or timeout
  if (error.message.includes('popup blocker')) {
    alert('Please allow popups for this site');
  } else if (error.message.includes('timeout')) {
    alert('Form submission timed out');
  }
}
```

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Note**: Popup blockers may prevent the form from opening. Ensure your users allow popups for your domain.

## Troubleshooting

### Popup Blocked

If the popup is blocked by the browser:

1. Check browser popup blocker settings
2. Ensure the popup is triggered by a user action (button click, etc.)
3. Inform users to allow popups for your domain

### Form Not Loading

1. Verify the `schemaId` is correct
2. Check that the schema exists in your app
3. Verify CORS headers are configured correctly
4. Check browser console for errors

### Messages Not Received

1. Verify `returnOrigin` matches your app's origin
2. Check that `allowedOrigins` includes your origin
3. Ensure popup window is not closed before message is sent
4. Check browser console for postMessage errors

## Advanced Usage

### Custom Message Handler

If you need more control over message handling:

```typescript
const popup = window.open('https://yourapp.com/forms/embed?...', 'formEmbed', '...');

window.addEventListener('message', (event) => {
  // Validate origin
  if (!validateMessageOrigin(event, ['https://yourapp.com'])) {
    return;
  }

  // Check message type
  if (isFormEmbedMessage(event.data)) {
    switch (event.data.type) {
      case 'form-submitted':
        // Handle submission
        break;
      case 'form-error':
        // Handle error
        break;
      // ... other cases
    }
  }
});
```

### Multiple Forms

You can open multiple forms simultaneously:

```typescript
const form1 = openFormEmbed({ schemaId: 'vendors', ... });
const form2 = openFormEmbed({ schemaId: 'tenders', ... });

const [result1, result2] = await Promise.all([form1, form2]);
```

## TypeScript Support

Full TypeScript support is included. Import types:

```typescript
import type {
  FormEmbedMessage,
  FormEmbedMode,
  FormSubmittedMessage,
  FormClosedMessage,
  FormErrorMessage,
} from '@/gradian-ui/form-builder/types/embed-messages';
```

## Third-Party Integration Examples

For detailed examples of how to integrate this system in third-party applications, see:

- **[Third-Party Integration Examples](./THIRD_PARTY_EXAMPLE.md)** - Complete examples for React, Vue, vanilla JavaScript, and more

## Related Documentation

- [Form Builder Documentation](../gradian-ui/form-builder/docs/README.md)
- [Schema System Documentation](../gradian-ui/schema-manager/README.md)
- [API Documentation](../../app/api/README.md)

