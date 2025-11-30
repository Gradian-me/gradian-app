# Gradian CDN Embed Guide for Third-Party Developers

This guide explains how to integrate Gradian forms and tables into your application using our CDN scripts.

## Overview

Gradian provides two CDN scripts for embedding forms and tables:

- **`gradian-form-embed.min.js`** - Embed forms as modal dialogs
- **`gradian-table-embed.min.js`** - Display and manage data tables

Both scripts are lightweight, standalone, and work in any HTML/JavaScript environment (React, Vue, Angular, vanilla JS, etc.).

## Quick Start

### 1. Load the CDN Scripts

Add the scripts to your HTML page:

```html
<!-- Form Embed Script -->
<script src="https://your-gradian-app.com/cdn/gradian-form-embed.min.js"></script>

<!-- Table Embed Script -->
<script src="https://your-gradian-app.com/cdn/gradian-table-embed.min.js"></script>
```

### 2. Basic Usage

```javascript
// Create a new record
const result = await GradianFormEmbedModal.createData('tags', {
  baseUrl: 'https://your-gradian-app.com'
});

// Display a table
GradianTableEmbed.loadAndRenderTable('my-table-container', {
  baseUrl: 'https://your-gradian-app.com',
  schemaId: 'tags',
  tableActions: ['edit', 'delete'],
  onEdit: (row) => {
    // Handle edit
  },
  onDelete: (row) => {
    // Handle delete
  }
});
```

## Form Embed API

### Loading the Script

```javascript
// Check if already loaded
if (window.GradianFormEmbedModal) {
  // Ready to use
} else {
  // Load script dynamically
  const script = document.createElement('script');
  script.src = 'https://your-gradian-app.com/cdn/gradian-form-embed.min.js';
  script.async = true;
  script.onload = () => {
    // Script loaded, ready to use
  };
  document.body.appendChild(script);
}
```

### Create New Record

```javascript
const result = await GradianFormEmbedModal.createData('tags', {
  baseUrl: 'https://your-gradian-app.com',
  initialValues: {
    name: 'New Tag',
    description: 'Optional description'
  }
});

if (result.success) {
  console.log('Created:', result.entityId);
  // Refresh your table or update UI
} else {
  console.error('Error:', result.error);
}
```

### Edit Existing Record

```javascript
const result = await GradianFormEmbedModal.editData('tags', 'entity-id-123', {
  baseUrl: 'https://your-gradian-app.com'
});

if (result.success) {
  console.log('Updated:', result.entityId);
  // Refresh your table or update UI
} else {
  console.error('Error:', result.error);
}
```

### Response Format

```typescript
{
  success: boolean;
  data?: any;           // The created/updated entity data
  entityId?: string;    // The ID of the entity
  error?: string;       // Error message if success is false
}
```

## Table Embed API

### Loading the Script

```javascript
// Check if already loaded
if (window.GradianTableEmbed) {
  // Ready to use
} else {
  // Load script dynamically
  const script = document.createElement('script');
  script.src = 'https://your-gradian-app.com/cdn/gradian-table-embed.min.js';
  script.async = true;
  script.onload = () => {
    // Script loaded, ready to use
  };
  document.body.appendChild(script);
}
```

### Basic Table Display

```javascript
GradianTableEmbed.loadAndRenderTable('table-container', {
  baseUrl: 'https://your-gradian-app.com',
  schemaId: 'tags',
  columns: ['id', 'name', 'description'] // Optional: specify columns
});
```

### Table with Actions

```javascript
GradianTableEmbed.loadAndRenderTable('table-container', {
  baseUrl: 'https://your-gradian-app.com',
  schemaId: 'tags',
  tableActions: ['edit', 'delete'], // Show edit and delete buttons
  onEdit: async (row) => {
    // Handle edit - opens form modal
    const result = await GradianFormEmbedModal.editData('tags', row.id, {
      baseUrl: 'https://your-gradian-app.com'
    });
    if (result.success) {
      // Refresh table
      GradianTableEmbed.loadAndRenderTable('table-container', {
        baseUrl: 'https://your-gradian-app.com',
        schemaId: 'tags',
        tableActions: ['edit', 'delete'],
        onEdit: handleEdit,
        onDelete: handleDelete
      });
    }
  },
  onDelete: async (row) => {
    // Handle delete
    if (confirm(`Delete ${row.name}?`)) {
      const response = await fetch(
        `https://your-gradian-app.com/api/data/tags/${row.id}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (result.success) {
        // Refresh table
        GradianTableEmbed.loadAndRenderTable('table-container', {
          baseUrl: 'https://your-gradian-app.com',
          schemaId: 'tags',
          tableActions: ['edit', 'delete'],
          onEdit: handleEdit,
          onDelete: handleDelete
        });
      }
    }
  }
});
```

### Custom Column Configuration

```javascript
GradianTableEmbed.loadAndRenderTable('table-container', {
  baseUrl: 'https://your-gradian-app.com',
  schemaId: 'tags',
  columnConfig: [
    {
      id: 'id',
      label: 'ID',
      accessor: 'id',
      width: 100
    },
    {
      id: 'name',
      label: 'Tag Name',
      accessor: 'name',
      render: (value) => value.toUpperCase()
    },
    {
      id: 'status',
      label: 'Status',
      accessor: 'status',
      align: 'center',
      render: (value) => value === 'active' ? '✅ Active' : '❌ Inactive'
    },
    {
      id: 'fullName',
      label: 'Full Name',
      accessor: (row) => `${row.firstName} ${row.lastName}`,
      minWidth: 200
    }
  ],
  tableActions: ['edit', 'delete'],
  onEdit: handleEdit,
  onDelete: handleDelete
});
```

### Sample Table Output

Here's an example of what a rendered table looks like:

| Actions | ID | Tag Name | Status | Created At |
|---------|----|----------|--------|------------|
| ✏️ 🗑️ | 1 | FEATURE | ✅ Active | 2024-01-15 |
| ✏️ 🗑️ | 2 | BUG | ✅ Active | 2024-01-16 |
| ✏️ 🗑️ | 3 | ENHANCEMENT | ❌ Inactive | 2024-01-17 |
| ✏️ 🗑️ | 4 | REFACTOR | ✅ Active | 2024-01-18 |

The table includes:
- **Actions column** (first column) - Edit and Delete buttons when `tableActions` is configured
- **Auto-styled rows** - Zebra striping for better readability
- **Responsive design** - Adapts to different screen sizes
- **Dark mode support** - Automatically matches your theme

### Table Options

```typescript
{
  baseUrl: string;                    // Required: Your Gradian app URL
  schemaId: string;                   // Required: Schema ID (e.g., 'tags', 'users')
  columns?: string[];                  // Optional: Simple column array ['id', 'name']
  columnConfig?: ColumnConfig[];       // Optional: Advanced column configuration
  tableActions?: ('edit' | 'delete')[]; // Optional: Show action buttons
  onRowClick?: (row: any, index: number) => void;
  onEdit?: (row: any) => void;        // Called when edit button clicked
  onDelete?: (row: any) => void;       // Called when delete button clicked
  skeletonRowCount?: number;           // Optional: Loading skeleton rows (default: 6)
  skeletonColumnCount?: number;        // Optional: Loading skeleton columns
}
```

### Column Configuration

```typescript
interface ColumnConfig {
  id: string;                          // Unique column identifier
  label: string;                       // Display label
  accessor: string | ((row: any) => any); // Field accessor or function
  render?: (value: any, row: any, index: number) => string | HTMLElement | any;
  align?: 'left' | 'center' | 'right'; // Text alignment
  width?: string | number;              // Column width
  minWidth?: number;                   // Minimum width
  maxWidth?: number;                   // Maximum width
  cellClassName?: string | ((row: any, index: number) => string);
}
```

## Complete React Example

```tsx
'use client';

import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    GradianFormEmbedModal?: {
      createData: (schemaId: string, options?: {
        baseUrl?: string;
        initialValues?: Record<string, any>;
      }) => Promise<{
        success: boolean;
        data?: any;
        entityId?: string;
        error?: string;
      }>;
      editData: (schemaId: string, entityId: string, options?: {
        baseUrl?: string;
      }) => Promise<{
        success: boolean;
        data?: any;
        entityId?: string;
        error?: string;
      }>;
    };
    GradianTableEmbed?: {
      loadAndRenderTable: (containerId: string, options: {
        baseUrl: string;
        schemaId: string;
        columns?: string[];
        columnConfig?: Array<{
          id: string;
          label: string;
          accessor: string | ((row: any) => any);
          render?: (value: any, row: any, index: number) => string | HTMLElement | any;
          align?: 'left' | 'center' | 'right';
          width?: string | number;
          minWidth?: number;
          maxWidth?: number;
          cellClassName?: string | ((row: any, index: number) => string);
        }>;
        tableActions?: ('edit' | 'delete')[];
        onRowClick?: (row: any, index: number) => void;
        onEdit?: (row: any) => void;
        onDelete?: (row: any) => void;
        skeletonRowCount?: number;
        skeletonColumnCount?: number;
      }) => Promise<{
        success: boolean;
        data?: any[];
        count?: number;
        error?: string;
      }>;
    };
  }
}

export default function MyComponent() {
  const [baseUrl] = useState('https://your-gradian-app.com');
  const [schemaId] = useState('tags');
  const [formScriptLoaded, setFormScriptLoaded] = useState(false);
  const [tableScriptLoaded, setTableScriptLoaded] = useState(false);

  // Load form embed script
  useEffect(() => {
    if (window.GradianFormEmbedModal) {
      setFormScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `${baseUrl}/cdn/gradian-form-embed.min.js`;
    script.async = true;
    script.onload = () => setFormScriptLoaded(true);
    document.body.appendChild(script);
  }, [baseUrl]);

  // Load table embed script
  useEffect(() => {
    if (window.GradianTableEmbed) {
      setTableScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `${baseUrl}/cdn/gradian-table-embed.min.js`;
    script.async = true;
    script.onload = () => setTableScriptLoaded(true);
    document.body.appendChild(script);
  }, [baseUrl]);

  // Load table when script is ready
  useEffect(() => {
    if (tableScriptLoaded && window.GradianTableEmbed) {
      window.GradianTableEmbed.loadAndRenderTable('table-container', {
        baseUrl: baseUrl,
        schemaId: schemaId,
        tableActions: ['edit', 'delete'],
        onEdit: handleEdit,
        onDelete: handleDelete,
      });
    }
  }, [tableScriptLoaded, baseUrl, schemaId]);

  const handleCreate = async () => {
    if (!window.GradianFormEmbedModal) return;

    const result = await window.GradianFormEmbedModal.createData(schemaId, {
      baseUrl: baseUrl,
    });

    if (result.success) {
      // Refresh table
      window.GradianTableEmbed?.loadAndRenderTable('table-container', {
        baseUrl: baseUrl,
        schemaId: schemaId,
        tableActions: ['edit', 'delete'],
        onEdit: handleEdit,
        onDelete: handleDelete,
      });
    }
  };

  const handleEdit = async (row: any) => {
    if (!window.GradianFormEmbedModal || !row.id) return;

    const result = await window.GradianFormEmbedModal.editData(schemaId, row.id, {
      baseUrl: baseUrl,
    });

    if (result.success) {
      // Refresh table
      window.GradianTableEmbed?.loadAndRenderTable('table-container', {
        baseUrl: baseUrl,
        schemaId: schemaId,
        tableActions: ['edit', 'delete'],
        onEdit: handleEdit,
        onDelete: handleDelete,
      });
    }
  };

  const handleDelete = async (row: any) => {
    if (!row.id || !confirm(`Delete this ${schemaId.slice(0, -1)}?`)) return;

    const response = await fetch(`${baseUrl}/api/data/${schemaId}/${row.id}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    if (result.success) {
      // Refresh table
      window.GradianTableEmbed?.loadAndRenderTable('table-container', {
        baseUrl: baseUrl,
        schemaId: schemaId,
        tableActions: ['edit', 'delete'],
        onEdit: handleEdit,
        onDelete: handleDelete,
      });
    }
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={!formScriptLoaded}>
        Create New
      </button>
      <div id="table-container"></div>
    </div>
  );
}
```

## Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Gradian Embed Example</title>
</head>
<body>
  <button id="create-btn">Create New</button>
  <div id="table-container"></div>

  <!-- Load CDN Scripts -->
  <script src="https://your-gradian-app.com/cdn/gradian-form-embed.min.js"></script>
  <script src="https://your-gradian-app.com/cdn/gradian-table-embed.min.js"></script>

  <script>
    const baseUrl = 'https://your-gradian-app.com';
    const schemaId = 'tags';

    // Wait for scripts to load
    window.addEventListener('load', () => {
      // Load table
      if (window.GradianTableEmbed) {
        window.GradianTableEmbed.loadAndRenderTable('table-container', {
          baseUrl: baseUrl,
          schemaId: schemaId,
          tableActions: ['edit', 'delete'],
          onEdit: handleEdit,
          onDelete: handleDelete,
        });
      }

      // Setup create button
      document.getElementById('create-btn').addEventListener('click', handleCreate);
    });

    async function handleCreate() {
      if (!window.GradianFormEmbedModal) return;

      const result = await window.GradianFormEmbedModal.createData(schemaId, {
        baseUrl: baseUrl,
      });

      if (result.success) {
        // Refresh table
        window.GradianTableEmbed.loadAndRenderTable('table-container', {
          baseUrl: baseUrl,
          schemaId: schemaId,
          tableActions: ['edit', 'delete'],
          onEdit: handleEdit,
          onDelete: handleDelete,
        });
      }
    }

    async function handleEdit(row) {
      if (!window.GradianFormEmbedModal || !row.id) return;

      const result = await window.GradianFormEmbedModal.editData(schemaId, row.id, {
        baseUrl: baseUrl,
      });

      if (result.success) {
        // Refresh table
        window.GradianTableEmbed.loadAndRenderTable('table-container', {
          baseUrl: baseUrl,
          schemaId: schemaId,
          tableActions: ['edit', 'delete'],
          onEdit: handleEdit,
          onDelete: handleDelete,
        });
      }
    }

    async function handleDelete(row) {
      if (!row.id || !confirm(`Delete this ${schemaId.slice(0, -1)}?`)) return;

      const response = await fetch(`${baseUrl}/api/data/${schemaId}/${row.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        // Refresh table
        window.GradianTableEmbed.loadAndRenderTable('table-container', {
          baseUrl: baseUrl,
          schemaId: schemaId,
          tableActions: ['edit', 'delete'],
          onEdit: handleEdit,
          onDelete: handleDelete,
        });
      }
    }
  </script>
</body>
</html>
```

## Features

### Form Embed Features

- ✅ **Modal Dialog** - Forms open in a modal, not a popup
- ✅ **No Iframe** - Direct integration, no iframe limitations
- ✅ **Promise-based API** - Easy async/await usage
- ✅ **Initial Values** - Pre-fill forms with data
- ✅ **Error Handling** - Comprehensive error messages
- ✅ **Auto-styling** - Matches your Gradian app theme

### Table Embed Features

- ✅ **Auto-detection** - Automatically detects columns from data
- ✅ **Custom Columns** - Full control over column configuration
- ✅ **Actions Column** - Built-in edit/delete buttons
- ✅ **Loading States** - Skeleton loading during data fetch
- ✅ **Responsive** - Works on all screen sizes
- ✅ **Dark Mode** - Automatically adapts to dark mode
- ✅ **Zebra Striping** - Alternating row colors
- ✅ **Custom Rendering** - Render functions for custom cell content

## API Reference

### `GradianFormEmbedModal.createData(schemaId, options)`

Creates a new record using a form modal.

**Parameters:**
- `schemaId` (string) - The schema ID (e.g., 'tags', 'users')
- `options` (object, optional):
  - `baseUrl` (string) - Your Gradian app URL
  - `initialValues` (object) - Pre-fill form fields

**Returns:** Promise with result object

### `GradianFormEmbedModal.editData(schemaId, entityId, options)`

Edits an existing record using a form modal.

**Parameters:**
- `schemaId` (string) - The schema ID
- `entityId` (string) - The ID of the entity to edit
- `options` (object, optional):
  - `baseUrl` (string) - Your Gradian app URL

**Returns:** Promise with result object

### `GradianTableEmbed.loadAndRenderTable(containerId, options)`

Loads data from API and renders a table.

**Parameters:**
- `containerId` (string) - ID of the container element
- `options` (object) - Configuration object (see Table Options above)

**Returns:** Promise with result object

### `GradianTableEmbed.renderTable(containerId, data, columns, options)`

Renders a table with provided data (doesn't fetch from API).

**Parameters:**
- `containerId` (string) - ID of the container element
- `data` (array) - Array of data objects
- `columns` (array, optional) - Array of column keys
- `options` (object, optional) - Configuration object

## Styling

The CDN scripts include all necessary styles. They automatically:
- Match your Gradian app's theme
- Support dark mode
- Use responsive design
- Include hover effects and transitions

No additional CSS is required, but you can override styles if needed.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Error Handling

All API calls return a result object with a `success` boolean:

```javascript
const result = await GradianFormEmbedModal.createData('tags', {
  baseUrl: 'https://your-app.com'
});

if (result.success) {
  // Success - use result.entityId or result.data
} else {
  // Error - check result.error
  console.error(result.error);
}
```

## Security

- All communication uses HTTPS
- CORS is handled by your Gradian app
- No sensitive data is stored in the CDN scripts
- Forms validate data before submission

## Troubleshooting

### Script not loading
- Check the CDN URL is correct
- Verify CORS is enabled on your Gradian app
- Check browser console for errors

### Table not displaying
- Ensure the container element exists
- Check that `schemaId` is valid
- Verify API endpoint is accessible

### Forms not opening
- Ensure `GradianFormEmbedModal` is loaded
- Check `baseUrl` is correct
- Verify the schema exists

## Support

For issues or questions:
- Check the browser console for errors
- Verify your API endpoints are working
- Ensure CORS is properly configured
- Contact your Gradian administrator

## Version

Current CDN version: Check `window.GradianFormEmbedModal.version` and `window.GradianTableEmbed.version`

