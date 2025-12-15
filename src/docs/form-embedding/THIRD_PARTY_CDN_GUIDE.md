# Gradian CDN Embed Guide for Third-Party Developers

This guide explains how to integrate Gradian forms and tables into your application using our CDN scripts.

## Overview

Gradian provides two CDN scripts for embedding forms and tables:

- **`gradian-form-embed.min.js`** - Embed forms as modal dialogs
- **`gradian-table-embed.min.js`** - Display and manage data tables

Both scripts are lightweight, standalone, and work in any HTML/JavaScript environment (React, Vue, Angular, vanilla JS, etc.).

### Math Formula Example

Here's an example of how mathematical formulas are rendered using KaTeX with LaTeX code blocks:

**Display math** (using code blocks with `latex`, `math`, or `katex` language identifier):

```latex
\text{Award Conversion Rate} = \frac{\text{Awards}}{\text{Total Tenders}} \times 100\%
```

For example, if you have 8 awards out of 36 tenders:

```latex
\text{Conversion Rate} = \frac{8}{36} \times 100 = 22.22\%
```

**More complex example** with multiple calculations:

```latex
\begin{aligned}
\text{April:} \quad & \frac{8}{36} \times 100 = 22.22\% \\
\text{May:} \quad & \frac{10}{34} \times 100 = 29.41\% \\
\text{June:} \quad & \frac{9}{32} \times 100 = 28.13\%
\end{aligned}
```

**Matrix example**:

```latex
x^\top \Sigma^{-1} x
```

**Alternative language identifiers**: You can also use `math` or `katex` instead of `latex`:

```math
\int_{a}^{b} f(x) \, dx = F(b) - F(a)
```

## Full Code To Copy To Your Project

Copy this code to your project:

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';

// Declare global types for CDN scripts
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
      version?: string;
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
      renderTable: (containerId: string, data: any[], columns?: string[], options?: {
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
      }) => void;
      version?: string;
    };
  }
}

export default function ThirdPartyFormUsageModalPage() {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [schemaId, setSchemaId] = useState('tags');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [tableScriptLoaded, setTableScriptLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const tableScriptRef = useRef<HTMLScriptElement | null>(null);

  // Set isClient to true after mount (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load form embed modal script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cdnUrl = `${baseUrl}/cdn/gradian-form-embed.min.js`;

    if (window.GradianFormEmbedModal) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${cdnUrl}"]`);
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.GradianFormEmbedModal) {
          setScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement('script');
    script.src = cdnUrl;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      setMessage({ text: 'Failed to load form embed helper script.', type: 'error' });
    };
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [baseUrl]);

  // Load table embed script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tableCdnUrl = `${baseUrl}/cdn/gradian-table-embed.min.js`;

    if (window.GradianTableEmbed) {
      setTableScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${tableCdnUrl}"]`);
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.GradianTableEmbed) {
          setTableScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement('script');
    script.src = tableCdnUrl;
    script.async = true;
    script.onload = () => setTableScriptLoaded(true);
    script.onerror = () => {
      console.warn('Table embed helper script not available, using fallback');
    };
    document.body.appendChild(script);
    tableScriptRef.current = script;

    return () => {
      if (tableScriptRef.current && tableScriptRef.current.parentNode) {
        tableScriptRef.current.parentNode.removeChild(tableScriptRef.current);
      }
    };
  }, [baseUrl]);

  // Load table using CDN helper when available
  useEffect(() => {
    if (isClient && typeof window !== 'undefined' && window.GradianTableEmbed) {
      window.GradianTableEmbed.loadAndRenderTable('table-container', {
        baseUrl: baseUrl,
        schemaId: schemaId,
        tableActions: ['edit', 'delete'],
        onEdit: handleEdit,
        onDelete: handleDelete,
      }).catch((error) => {
        console.error('Error loading table:', error);
        showMessage(`Error loading table: ${error.message || 'Unknown error'}`, 'error');
      });
    }
  }, [schemaId, baseUrl, tableScriptLoaded, isClient]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    if (type === 'success') {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRefresh = () => {
    if (typeof window !== 'undefined' && window.GradianTableEmbed) {
      window.GradianTableEmbed.loadAndRenderTable('table-container', {
        baseUrl: baseUrl,
        schemaId: schemaId,
        tableActions: ['edit', 'delete'],
        onEdit: handleEdit,
        onDelete: handleDelete,
      });
    }
  };

  const handleCreate = async () => {
    if (!window.GradianFormEmbedModal) {
      showMessage('Form embed modal helper not loaded. Please check the script path.', 'error');
      return;
    }

    // Create a promise that wraps the modal call
    const modalPromise = window.GradianFormEmbedModal.createData(schemaId, {
        baseUrl: baseUrl,
    }).catch((error) => {
      // Ensure promise always resolves, never rejects
      console.error('Modal promise rejected:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error occurred',
      };
    });

    try {
      const result = await modalPromise as any;

      if (result && result.success) {
        showMessage(`${schemaId} created successfully! ID: ${result.entityId}`, 'success');
        
        // Reload table using CDN helper
        if (typeof window !== 'undefined' && window.GradianTableEmbed) {
          window.GradianTableEmbed.loadAndRenderTable('table-container', {
            baseUrl: baseUrl,
            schemaId: schemaId,
            tableActions: ['edit', 'delete'],
            onEdit: handleEdit,
            onDelete: handleDelete,
          });
        }
      } else if (result) {
        // Form was closed without saving - this is not an error, just inform the user
        if (result.error && result.error.includes('closed without submission')) {
          // Don't show error message for user-initiated close
          console.log('Form closed by user without submission');
      } else {
          showMessage(`Failed to create ${schemaId}: ${result.error || 'Unknown error'}`, 'error');
        }
      }
    } catch (error: any) {
      console.error('Error in handleCreate:', error);
      showMessage(`Error: ${error.message || 'Unknown error occurred'}`, 'error');
    }
  };

  const handleEdit = async (row: any) => {
    if (typeof window === 'undefined' || !window.GradianFormEmbedModal || !row.id) {
      showMessage('Form embed modal helper not loaded or row ID missing.', 'error');
      return;
    }

    try {
      const result = await window.GradianFormEmbedModal.editData(schemaId, row.id, {
        baseUrl: baseUrl,
      });

      if (result.success) {
        showMessage(`${schemaId} updated successfully!`, 'success');
        
        // Reload table using CDN helper
        if (typeof window !== 'undefined' && window.GradianTableEmbed) {
          window.GradianTableEmbed.loadAndRenderTable('table-container', {
            baseUrl: baseUrl,
            schemaId: schemaId,
            tableActions: ['edit', 'delete'],
            onEdit: handleEdit,
            onDelete: handleDelete,
          });
        }
      } else {
        showMessage(`Failed to update ${schemaId}: ${result.error}`, 'error');
      }
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (row: any) => {
    if (!row.id) {
      showMessage('Row ID is required for deletion.', 'error');
      return;
    }

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete this ${schemaId.slice(0, -1)}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/data/${schemaId}/${row.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showMessage(`${schemaId} deleted successfully!`, 'success');
        
        // Reload table using CDN helper
        if (typeof window !== 'undefined' && window.GradianTableEmbed) {
          window.GradianTableEmbed.loadAndRenderTable('table-container', {
            baseUrl: baseUrl,
            schemaId: schemaId,
            tableActions: ['edit', 'delete'],
            onEdit: handleEdit,
            onDelete: handleDelete,
    });
        }
      } else {
        showMessage(`Failed to delete ${schemaId}: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error: any) {
      showMessage(`Error: ${error.message || 'Unknown error occurred'}`, 'error');
    }
  };


  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --background: 0 0% 100%;
          --foreground: 240 10% 3.9%;
          --card: 0 0% 100%;
          --card-foreground: 240 10% 3.9%;
          --primary: 262 83% 58%;
          --primary-foreground: 0 0% 98%;
          --secondary: 240 4.8% 95.9%;
          --secondary-foreground: 240 5.9% 10%;
          --muted: 240 4.8% 95.9%;
          --muted-foreground: 240 3.8% 46.1%;
          --border: 240 5.9% 90%;
          --input: 240 5.9% 90%;
          --ring: 262 83% 58%;
          --radius: 0.75rem;
        }

        .dark {
          --background: 240 10% 3.9%;
          --foreground: 0 0% 98%;
          --card: 240 10% 3.9%;
          --card-foreground: 0 0% 98%;
          --primary: 262 83% 58%;
          --primary-foreground: 0 0% 98%;
          --secondary: 240 3.7% 15.9%;
          --secondary-foreground: 0 0% 98%;
          --muted: 240 3.7% 15.9%;
          --muted-foreground: 240 5% 64.9%;
          --border: 240 3.7% 15.9%;
          --input: 240 3.7% 15.9%;
          --ring: 262 83% 58%;
        }

        * {
          box-sizing: border-box;
        }

        body {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          font-family: 'Estedad', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        button {
          cursor: pointer;
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
        }

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.2);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.4);
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 md:p-4 lg:p-6">
        <div className="max-w-9xl mx-auto w-full">
        {/* Header */}
          <div className="bg-white dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm mb-4 rounded-lg shadow-sm">
            <div className="px-4 py-6 md:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Gradian Form Embed - Modal Version
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No popup, no iframe - embedded modal dialog (React Example)
                  </p>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold h-11 px-6 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-all duration-200 active:scale-95"
                >
                  {darkMode ? '☀️ Light' : '🌙 Dark'}
                </button>
              </div>
            </div>
        </div>

        {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-4 p-4 md:p-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 dark:border-blue-500/50 p-4 mb-6 rounded">
              <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Base URL:</strong> {baseUrl}
              <br />
                <small className="text-blue-600 dark:text-blue-500">This version uses a modal dialog instead of a popup window</small>
              <br />
                <small className="text-blue-600 dark:text-blue-500">
                  Scripts: {scriptLoaded ? '✅ Form' : '⏳ Form'} | {tableScriptLoaded ? '✅ Table' : '⏳ Table'}
              </small>
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
                <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://yourapp.com"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-600 focus:border-transparent transition-colors"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
                <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                Schema
              </label>
              <select
                value={schemaId}
                onChange={(e) => setSchemaId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-600 focus:border-transparent transition-colors"
              >
                <option value="tags">Tags</option>
                <option value="companies">Companies</option>
                <option value="users">Users</option>
              </select>
            </div>

            <div>
              <button
                onClick={handleCreate}
                  disabled={!scriptLoaded}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold h-11 px-6 py-2 bg-violet-500 text-white shadow-sm hover:bg-violet-600 hover:shadow-md dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95"
              >
                  ➕ Create New
              </button>
            </div>

            <div>
              <button
                onClick={handleRefresh}
                disabled={!tableScriptLoaded}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold h-11 px-6 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow-md dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 md:p-6">
          {/* Message */}
          {message && (
            <div
                className={`p-4 rounded-lg mb-6 border ${
                message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-500/50'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-500/50'
              }`}
            >
              {message.text}
            </div>
          )}

            {/* Table Container - CDN helper will render here */}
            {isClient && typeof window !== 'undefined' && window.GradianTableEmbed ? (
              <div id="table-container"></div>
            ) : (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Table helper not loaded
                </h3>
                <p className="text-sm">
                  Please ensure <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">gradian-table-embed.min.js</code> is loaded from the CDN.
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
```

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

