# Third-Party App Integration Example

This guide shows how to integrate the embeddable form system in a third-party application.

## Setup

### Option 1: Copy the Standalone Helper (Recommended)

Since third-party apps don't have access to your internal paths, copy the standalone helper file:

1. Copy `src/gradian-ui/form-builder/utils/form-embed-helper.standalone.ts` to your third-party app
2. Rename it to `form-embed-helper.ts` (or keep the name)
3. Import and use it:

```typescript
import { createData, editData, openFormEmbed } from './utils/form-embed-helper';

// Use the generic functions
await createData('tags', { initialValues: { name: 'New Tag' } });
await editData('tags', 'tag-id-123');
```

The standalone version includes everything needed and has no dependencies on your internal code.

### Option 2: Manual Implementation (No Dependencies)

If you prefer not to copy files, implement it manually using the postMessage API (see examples below).

### Option 3: CDN Script (Recommended for Production)

Host the helper as a standalone script on a CDN for easy integration. See [CDN Implementation Guide](./CDN_IMPLEMENTATION.md) for details.

#### Popup Version (Default)

```html
<!-- Include the CDN script -->
<script src="https://cdn.yourapp.com/form-embed-helper.min.js"></script>

<script>
  // Use the global object
  GradianFormEmbed.createData('tags', {
    baseUrl: 'https://yourapp.com',
    initialValues: { name: 'New Tag' },
  });
</script>
```

#### Modal Version (No Popup, No Iframe)

The modal version creates a dialog directly in your page instead of opening a popup:

```html
<!-- Include the modal version CDN script -->
<script src="https://cdn.yourapp.com/form-embed-helper-modal.min.js"></script>

<script>
  // Opens a modal dialog in the current page (no popup!)
  const result = await GradianFormEmbedModal.createData('tags', {
    baseUrl: 'https://yourapp.com',
    initialValues: { name: 'New Tag' },
  });
</script>
```

**React Example:**

See the complete React implementation at `/tests/third_party_form_usage_modal` in this codebase, or check the example below:

```tsx
'use client';

import { useEffect, useState } from 'react';

// Declare global type for CDN script
declare global {
  interface Window {
    GradianFormEmbedModal?: {
      createData: (schemaId: string, options?: {
        baseUrl?: string;
        initialValues?: Record<string, any>;
      }) => Promise<{ success: boolean; data?: any; entityId?: string; error?: string }>;
      editData: (schemaId: string, entityId: string, options?: {
        baseUrl?: string;
      }) => Promise<{ success: boolean; data?: any; entityId?: string; error?: string }>;
    };
  }
}

export default function MyComponent() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load CDN script
  useEffect(() => {
    const cdnUrl = 'https://cdn.yourapp.com/form-embed-helper-modal.min.js';
    
    if (window.GradianFormEmbedModal) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = cdnUrl;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleCreate = async () => {
    if (!window.GradianFormEmbedModal) return;

    const result = await window.GradianFormEmbedModal.createData('tags', {
      baseUrl: 'https://yourapp.com',
    });

    if (result.success) {
      console.log('Created:', result.entityId);
    }
  };

  return (
    <button onClick={handleCreate} disabled={!scriptLoaded}>
      Create Tag
    </button>
  );
}
```

**Full React Example:**

A complete working example is available at:
- **Route**: `/tests/third_party_form_usage_modal`
- **File**: `src/app/tests/third_party_form_usage_modal/page.tsx`

This example includes:
- Dynamic CDN script loading
- Schema selection
- Create and Edit functionality
- Data table display
- Error handling
- Loading states

## Example 1: Generic Create Data Function

```typescript
// Generic function to create data for any schema
async function createData(schemaId: string, initialValues?: Record<string, any>) {
  try {
    const result = await openFormEmbed({
      baseUrl: 'https://yourapp.com', // Your Gradian app URL
      schemaId: schemaId,
      mode: 'create',
      initialValues: initialValues,
    });

    if (result.success) {
      console.log(`${schemaId} created successfully!`);
      console.log('Entity ID:', result.entityId);
      console.log('Full data:', result.data);
      return result;
    } else {
      console.error(`Failed to create ${schemaId}:`, result.error);
      throw new Error(result.error || `Failed to create ${schemaId}`);
    }
  } catch (error) {
    console.error('Error opening form:', error);
    if (error.message.includes('popup blocker')) {
      alert('Please allow popups for this site');
    }
    throw error;
  }
}

// Usage examples:
// Create a tag
await createData('tags', { name: 'New Tag', color: '#3b82f6' });

// Create a vendor
await createData('vendors', { name: 'Acme Corp', email: 'contact@acme.com' });

// Create any other schema
await createData('tenders', { title: 'New Tender', description: '...' });
```

## Example 2: Generic Edit Data Function

```typescript
// Generic function to edit data for any schema
async function editData(schemaId: string, entityId: string) {
  try {
    const result = await openFormEmbed({
      baseUrl: 'https://yourapp.com',
      schemaId: schemaId,
      mode: 'edit',
      entityId: entityId,
    });

    if (result.success) {
      console.log(`${schemaId} updated successfully!`);
      console.log('Updated data:', result.data);
      return result;
    } else {
      console.error(`Failed to update ${schemaId}:`, result.error);
      throw new Error(result.error || `Failed to update ${schemaId}`);
    }
  } catch (error) {
    console.error('Error opening form:', error);
    throw error;
  }
}

// Usage examples:
// Edit a tag
await editData('tags', 'tag-id-123');

// Edit a vendor
await editData('vendors', 'vendor-id-456');

// Edit any other schema
await editData('tenders', 'tender-id-789');
```

## Example 3: React Component with Generic Functions

```tsx
import React, { useState } from 'react';
import { openFormEmbed } from './utils/form-embed-helper'; // Copied helper

interface DataItem {
  id: string;
  [key: string]: any;
}

interface DataManagerProps {
  schemaId: string;
  title: string;
}

export function DataManager({ schemaId, title }: DataManagerProps) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await openFormEmbed({
        baseUrl: 'https://yourapp.com',
        schemaId: schemaId,
        mode: 'create',
      });

      if (result.success && result.data) {
        setItems((prev) => [...prev, result.data as DataItem]);
        alert(`${title} created successfully!`);
      } else {
        alert(result.error || `Failed to create ${title}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to open form. Please check popup blocker settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (itemId: string) => {
    setLoading(true);
    try {
      const result = await openFormEmbed({
        baseUrl: 'https://yourapp.com',
        schemaId: schemaId,
        mode: 'edit',
        entityId: itemId,
      });

      if (result.success && result.data) {
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? (result.data as DataItem) : item))
        );
        alert(`${title} updated successfully!`);
      } else {
        alert(result.error || `Failed to update ${title}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to open form. Please check popup blocker settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>{title} Manager</h1>
      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Loading...' : `Create New ${title}`}
      </button>

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name || item.title || item.id}</span>
            <button onClick={() => handleEdit(item.id)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Usage:
// <DataManager schemaId="tags" title="Tag" />
// <DataManager schemaId="vendors" title="Vendor" />
// <DataManager schemaId="tenders" title="Tender" />
```

## Example 4: Vue.js Component with Generic Functions

```vue
<template>
  <div>
    <h1>{{ title }} Manager</h1>
    <button @click="createData" :disabled="loading">
      {{ loading ? 'Loading...' : `Create New ${title}` }}
    </button>

    <ul>
      <li v-for="item in items" :key="item.id">
        <span>{{ item.name || item.title || item.id }}</span>
        <button @click="editData(item.id)">Edit</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { openFormEmbed } from './utils/form-embed-helper'; // Copied helper

const props = defineProps({
  schemaId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
});

const items = ref([]);
const loading = ref(false);

const createData = async () => {
  loading.value = true;
  try {
    const result = await openFormEmbed({
      baseUrl: 'https://yourapp.com',
      schemaId: props.schemaId,
      mode: 'create',
    });

    if (result.success && result.data) {
      items.value.push(result.data);
      alert(`${props.title} created successfully!`);
    } else {
      alert(result.error || `Failed to create ${props.title}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to open form. Please check popup blocker settings.');
  } finally {
    loading.value = false;
  }
};

const editData = async (itemId) => {
  loading.value = true;
  try {
    const result = await openFormEmbed({
      baseUrl: 'https://yourapp.com',
      schemaId: props.schemaId,
      mode: 'edit',
      entityId: itemId,
    });

    if (result.success && result.data) {
      const index = items.value.findIndex((item) => item.id === itemId);
      if (index !== -1) {
        items.value[index] = result.data;
      }
      alert(`${props.title} updated successfully!`);
    } else {
      alert(result.error || `Failed to update ${props.title}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to open form. Please check popup blocker settings.');
  } finally {
    loading.value = false;
  }
};
</script>
```

## Example 5: Manual Implementation (Without Helper) - Generic Function

If you can't use the helper function, here's how to implement it manually:

```typescript
// Generic function to open form for any schema
function openFormForSchema(options: {
  schemaId: string;
  mode: 'create' | 'edit';
  entityId?: string;
  initialValues?: Record<string, any>;
  baseUrl?: string;
}): Promise<{ success: boolean; data?: any; entityId?: string; error?: string }> {
  return new Promise((resolve, reject) => {
    const baseUrl = options.baseUrl || 'https://yourapp.com';
    
    // Build URL
    const url = new URL(`${baseUrl}/forms/embed`);
    url.searchParams.set('schemaId', options.schemaId);
    url.searchParams.set('mode', options.mode);
    
    if (options.entityId) {
      url.searchParams.set('entityId', options.entityId);
    }
    
    if (options.initialValues) {
      url.searchParams.set('initialValues', JSON.stringify(options.initialValues));
    }
    
    url.searchParams.set('returnOrigin', window.location.origin);

    // Open popup
    const popup = window.open(
      url.toString(),
      'formEmbed',
      'width=900,height=700,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for messages
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (event.origin !== baseUrl) {
        return;
      }

      const message = event.data;

      if (message.type === 'form-submitted') {
        window.removeEventListener('message', handleMessage);
        if (message.payload.success) {
          resolve({
            success: true,
            data: message.payload.data,
            entityId: message.payload.entityId,
          });
        } else {
          resolve({
            success: false,
            error: message.payload.error,
          });
        }
        popup.close();
      } else if (message.type === 'form-closed') {
        window.removeEventListener('message', handleMessage);
        resolve({
          success: false,
          error: 'Form was closed without submission',
        });
      } else if (message.type === 'form-error') {
        window.removeEventListener('message', handleMessage);
        reject(new Error(message.payload.error));
        popup.close();
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        resolve({
          success: false,
          error: 'Form window was closed',
        });
      }
    }, 500);
  });
}

// Generic create function
async function createData(schemaId: string, initialValues?: Record<string, any>) {
  return openFormForSchema({
    schemaId,
    mode: 'create',
    initialValues,
  });
}

// Generic edit function
async function editData(schemaId: string, entityId: string) {
  return openFormForSchema({
    schemaId,
    mode: 'edit',
    entityId,
  });
}

// Usage examples:
await createData('tags', { name: 'New Tag', color: '#3b82f6' });
await createData('vendors', { name: 'Acme Corp' });
await editData('tags', 'tag-id-123');
await editData('vendors', 'vendor-id-456');
```

## Example 6: Generic Function with Custom Popup Size

```typescript
async function createData(
  schemaId: string,
  initialValues?: Record<string, any>,
  popupSize?: { width?: number; height?: number }
) {
  return openFormEmbed({
    baseUrl: 'https://yourapp.com',
    schemaId: schemaId,
    mode: 'create',
    initialValues: initialValues,
    popupFeatures: popupSize,
  });
}

// Usage:
await createData('tags', { name: 'New Tag' }, { width: 1200, height: 800 });
```

## Example 7: With Timeout

```typescript
const result = await openFormEmbed({
  baseUrl: 'https://yourapp.com',
  schemaId: 'tags',
  mode: 'create',
  timeout: 60000, // 1 minute timeout
});
```

## Example 8: Handling Multiple Forms for Different Schemas

```typescript
async function createMultipleItems() {
  const items = [
    { schemaId: 'tags', data: { name: 'Tag 1', color: '#3b82f6' } },
    { schemaId: 'vendors', data: { name: 'Vendor 1', email: 'v1@example.com' } },
    { schemaId: 'tenders', data: { title: 'Tender 1', description: '...' } },
  ];

  for (const item of items) {
    try {
      const result = await createData(item.schemaId, item.data);
      if (result.success) {
        console.log(`Created ${item.schemaId}:`, result.entityId);
      } else {
        console.error(`Failed to create ${item.schemaId}:`, result.error);
      }
    } catch (error) {
      console.error(`Error creating ${item.schemaId}:`, error);
    }
  }
}
```

## Example 9: With Error Handling and Retry

```typescript
async function createTagWithRetry(maxRetries = 3) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const result = await openFormEmbed({
        baseUrl: 'https://yourapp.com',
        schemaId: 'tags',
        mode: 'create',
      });

      if (result.success) {
        return result;
      } else {
        attempts++;
        if (attempts < maxRetries) {
          console.log(`Retry attempt ${attempts}...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          throw new Error(result.error || 'Failed after retries');
        }
      }
    } catch (error) {
      attempts++;
      if (attempts >= maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
```

## Example 10: Integration with Your API - Generic Function

```typescript
async function syncDataWithYourApp(schemaId: string) {
  // First, create data in Gradian app
  const result = await createData(schemaId);

  if (result.success && result.data) {
    // Then, sync it to your own API
    try {
      const response = await fetch(`https://your-api.com/${schemaId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gradianId: result.entityId,
          ...result.data,
        }),
      });

      if (response.ok) {
        console.log(`${schemaId} synced successfully!`);
      }
    } catch (error) {
      console.error(`Failed to sync ${schemaId}:`, error);
    }
  }
}

// Usage:
await syncDataWithYourApp('tags');
await syncDataWithYourApp('vendors');
```

## Complete HTML Example - Generic Implementation

```html
<!DOCTYPE html>
<html>
<head>
  <title>Data Manager - Third Party App</title>
</head>
<body>
  <h1>Data Manager</h1>
  <select id="schemaSelect">
    <option value="tags">Tags</option>
    <option value="vendors">Vendors</option>
    <option value="tenders">Tenders</option>
  </select>
  <button id="createBtn">Create New</button>
  <div id="dataList"></div>

  <script>
    const BASE_URL = 'https://yourapp.com';

    // Generic function to create data for any schema
    async function createData(schemaId, initialValues) {
      try {
        const url = new URL(`${BASE_URL}/forms/embed`);
        url.searchParams.set('schemaId', schemaId);
        url.searchParams.set('mode', 'create');
        url.searchParams.set('returnOrigin', window.location.origin);
        
        if (initialValues) {
          url.searchParams.set('initialValues', JSON.stringify(initialValues));
        }

        const popup = window.open(url.toString(), 'formEmbed', 'width=900,height=700');

        if (!popup) {
          alert('Please allow popups for this site');
          return;
        }

        return new Promise((resolve, reject) => {
          const handleMessage = (event) => {
            if (event.origin !== BASE_URL) return;

            if (event.data.type === 'form-submitted') {
              window.removeEventListener('message', handleMessage);
              if (event.data.payload.success) {
                resolve(event.data.payload);
                alert(`${schemaId} created successfully!`);
              } else {
                reject(new Error(event.data.payload.error));
              }
              popup.close();
            } else if (event.data.type === 'form-closed') {
              window.removeEventListener('message', handleMessage);
              reject(new Error('Form was closed without submission'));
            }
          };

          window.addEventListener('message', handleMessage);
        });
      } catch (error) {
        console.error('Error:', error);
        throw error;
      }
    }

    document.getElementById('createBtn').addEventListener('click', async () => {
      const schemaId = document.getElementById('schemaSelect').value;
      try {
        const result = await createData(schemaId);
        console.log('Created:', result);
        // Refresh your data list
        loadData(schemaId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });
  </script>
</body>
</html>
```

## Key Points

1. **Base URL**: Replace `'https://yourapp.com'` with your actual Gradian app URL
2. **Schema ID**: Pass any schema ID (e.g., `'tags'`, `'vendors'`, `'tenders'`, etc.)
3. **Generic Functions**: Use `createData(schemaId, initialValues?)` and `editData(schemaId, entityId)` for any schema
4. **Helper Access**: Copy `form-embed-helper.ts` and `embed-messages.ts` to your third-party app, or use manual implementation
5. **Initial Values**: Pre-fill form fields by passing `initialValues`
6. **Error Handling**: Always handle errors and popup blockers
7. **User Experience**: Show loading states and success/error messages
8. **Security**: The helper function validates origins automatically

## Next Steps

1. Test the integration in your development environment
2. Configure CORS settings if needed
3. Set up API key authentication (when implemented)
4. Customize popup size and behavior as needed
5. Integrate with your existing tag management system

