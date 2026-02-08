/**
 * Gradian Table Embed - CDN Version
 * 
 * This version provides a simple way to embed and display tables in third-party applications
 * 
 * Usage (simple columns array):
 * <script src="https://cdn.yourapp.com/gradian-table-embed.min.js"></script>
 * <script>
 *   GradianTableEmbed.loadAndRenderTable('container-id', {
 *     baseUrl: 'https://yourapp.com',
 *     schemaId: 'tags',
 *     columns: ['id', 'name', 'description']
 *   });
 * </script>
 * 
 * Usage (with column configuration):
 * <script>
 *   GradianTableEmbed.loadAndRenderTable('container-id', {
 *     baseUrl: 'https://yourapp.com',
 *     schemaId: 'tags',
 *     columnConfig: [
 *       { id: 'id', label: 'ID', accessor: 'id' },
 *       { id: 'name', label: 'Name', accessor: 'name', render: (value) => value.toUpperCase() },
 *       { id: 'status', label: 'Status', accessor: 'status', align: 'center' }
 *     ],
 *     tableActions: ['edit', 'delete'],
 *     onEdit: (row) => console.log('Edit:', row),
 *     onDelete: (row) => console.log('Delete:', row)
 *   });
 * </script>
 */

(function (global) {
  'use strict';

  /**
   * Format a key to display name
   */
  function formatKey(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, function(str) { return str.toUpperCase(); })
      .trim();
  }

  /**
   * Format a value for display
   */
  function formatValue(value) {
    if (value === null || value === undefined) {
      return '—';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 0 ? value.length + ' items' : 'Empty';
      }
      return 'Object';
    }

    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }

    return String(value);
  }

  /**
   * Create table skeleton
   */
  function createTableSkeleton(container, rowCount, columnCount) {
    const skeletonWidths = ['w-16', 'w-24', 'w-32', 'w-20', 'w-28', 'w-36', 'w-40', 'w-24', 'w-20', 'w-32'];
    
    const table = document.createElement('div');
    table.className = 'overflow-x-auto';
    
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'border border-gray-200 dark:border-gray-700 rounded-lg';
    
    const tableEl = document.createElement('table');
    tableEl.className = 'w-full border-collapse';
    
    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700';
    
    for (let i = 0; i <= columnCount; i++) {
      const th = document.createElement('th');
      th.className = 'px-4 py-3 text-start text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider';
      const skeleton = document.createElement('div');
      skeleton.className = 'h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse ' + skeletonWidths[i % skeletonWidths.length];
      th.appendChild(skeleton);
      headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    tableEl.appendChild(thead);
    
    // Body
    const tbody = document.createElement('tbody');
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-200 dark:border-gray-700 transition-colors ' +
        (rowIndex % 2 === 0
          ? 'bg-white dark:bg-gray-800'
          : 'bg-gray-100 dark:bg-gray-700');
      
      for (let colIndex = 0; colIndex <= columnCount; colIndex++) {
        const td = document.createElement('td');
        td.className = 'px-4 py-3';
        const skeleton = document.createElement('div');
        skeleton.className = 'h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse ' + skeletonWidths[colIndex % skeletonWidths.length];
        td.appendChild(skeleton);
        tr.appendChild(td);
      }
      
      tbody.appendChild(tr);
    }
    
    tableEl.appendChild(tbody);
    tableWrapper.appendChild(tableEl);
    table.appendChild(tableWrapper);
    
    return table;
  }

  /**
   * Get value from row using accessor (string key or function)
   */
  function getValue(row, accessor) {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    if (typeof accessor === 'string') {
      return row[accessor];
    }
    return null;
  }

  /**
   * Normalize column config - convert simple string array to column config objects
   */
  function normalizeColumnConfig(columns, columnConfig, data) {
    // If columnConfig is provided, use it
    if (columnConfig && Array.isArray(columnConfig) && columnConfig.length > 0) {
      return columnConfig.map(function(col) {
        // Support both object format and simple string
        if (typeof col === 'string') {
          return {
            id: col,
            label: formatKey(col),
            accessor: col
          };
        }
        // Ensure required fields
        return {
          id: col.id || col.accessor || String(col),
          label: col.label || formatKey(col.id || col.accessor || String(col)),
          accessor: col.accessor || col.id || col,
          render: col.render,
          align: col.align || 'left',
          width: col.width,
          minWidth: col.minWidth,
          maxWidth: col.maxWidth,
          cellClassName: col.cellClassName,
        };
      });
    }

    // If simple columns array is provided, convert to config
    if (columns && Array.isArray(columns) && columns.length > 0) {
      return columns.map(function(key) {
        return {
          id: key,
          label: formatKey(key),
          accessor: key
        };
      });
    }

    // Auto-detect from data
    if (data && data.length > 0) {
      const allKeys = new Set();
      data.forEach(function(item) {
        Object.keys(item).forEach(function(key) {
          if (!key.startsWith('_') && key !== 'password' && key !== 'token') {
            allKeys.add(key);
          }
        });
      });

      const sortedKeys = Array.from(allKeys).sort(function(a, b) {
        if (a === 'id') return -1;
        if (b === 'id') return 1;
        if (a === 'name' || a === 'title') return -1;
        if (b === 'name' || b === 'title') return 1;
        return a.localeCompare(b);
      });

      return sortedKeys.slice(0, 10).map(function(key) {
        return {
          id: key,
          label: formatKey(key),
          accessor: key
        };
      });
    }

    return [];
  }

  /**
   * Render table with data
   */
  function renderTable(container, data, columns, options) {
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    
    if (!containerEl) {
      console.error('Table container not found:', container);
      return;
    }

    // Clear container
    containerEl.innerHTML = '';

    if (!data || data.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'text-center py-20 text-gray-500 dark:text-gray-400';
      emptyDiv.innerHTML = `
        <h3 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">No data found</h3>
        <p>No items to display</p>
      `;
      containerEl.appendChild(emptyDiv);
      return;
    }

    // Normalize column configuration
    const columnConfig = normalizeColumnConfig(
      columns, 
      options && options.columnConfig ? options.columnConfig : null,
      data
    );

    // Get tableActions from options
    const tableActions = options && options.tableActions ? options.tableActions : [];

    // Create table
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'overflow-x-auto';

    const borderDiv = document.createElement('div');
    borderDiv.className = 'border border-gray-200 dark:border-gray-700 rounded-lg';

    const table = document.createElement('table');
    table.className = 'w-full border-collapse';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'bg-gray-100 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700';

    // Add actions column first if tableActions is provided
    if (tableActions.length > 0) {
      const th = document.createElement('th');
      th.className = 'px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider';
      th.style.width = '120px';
      th.textContent = 'Actions';
      headerRow.appendChild(th);
    }

    columnConfig.forEach(function(col) {
      const th = document.createElement('th');
      const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-start';
      th.className = 'px-4 py-3 ' + alignClass + ' text-xs font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider';
      if (col.width) {
        th.style.width = typeof col.width === 'number' ? col.width + 'px' : col.width;
      }
      if (col.minWidth) {
        th.style.minWidth = col.minWidth + 'px';
      }
      if (col.maxWidth) {
        th.style.maxWidth = col.maxWidth + 'px';
      }
      th.textContent = col.label;
      headerRow.appendChild(th);
    });


    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    data.forEach(function(item, index) {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-200 dark:border-gray-700 transition-colors ' +
        (index % 2 === 0
          ? 'bg-white dark:bg-gray-800'
          : 'bg-gray-100 dark:bg-gray-700') +
        (options && options.onRowClick ? ' hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer' : '');

      if (options && options.onRowClick) {
        tr.addEventListener('click', function() {
          options.onRowClick(item, index);
        });
      }

      // Add actions cell first if tableActions is provided
      if (tableActions.length > 0) {
        const td = document.createElement('td');
        td.className = 'px-4 py-3 text-center';
        td.style.width = '120px';
        td.style.verticalAlign = 'middle';
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex items-center justify-center gap-1';
        
        tableActions.forEach(function(action) {
          if (action === 'edit' && options && options.onEdit) {
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'h-8 w-8 p-0 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 dark:hover:bg-violet-900/20 dark:hover:border-violet-600 dark:hover:text-violet-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2';
            editButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            editButton.title = 'Edit';
            editButton.addEventListener('click', function(e) {
              e.stopPropagation();
              options.onEdit(item);
            });
            actionsContainer.appendChild(editButton);
          } else if (action === 'delete' && options && options.onDelete) {
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'h-8 w-8 p-0 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-600 dark:hover:text-red-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2';
            deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            deleteButton.title = 'Delete';
            deleteButton.addEventListener('click', function(e) {
              e.stopPropagation();
              options.onDelete(item);
            });
            actionsContainer.appendChild(deleteButton);
          }
        });
        
        td.appendChild(actionsContainer);
        tr.appendChild(td);
      }

      columnConfig.forEach(function(col) {
        const td = document.createElement('td');
        const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-start';
        let cellClassName = 'px-4 py-3 text-sm text-gray-900 dark:text-gray-200 ' + alignClass;
        
        // Apply custom cell className if provided
        if (col.cellClassName) {
          if (typeof col.cellClassName === 'function') {
            cellClassName += ' ' + col.cellClassName(item, index);
          } else {
            cellClassName += ' ' + col.cellClassName;
          }
        }
        
        td.className = cellClassName;
        
        // Get value using accessor
        const rawValue = getValue(item, col.accessor);
        
        // Apply render function if provided
        if (col.render && typeof col.render === 'function') {
          try {
            const rendered = col.render(rawValue, item, index);
            if (typeof rendered === 'string') {
              // SECURITY: Use textContent instead of innerHTML to prevent XSS
              td.textContent = rendered;
            } else if (rendered && rendered.nodeType) {
              // DOM node
              td.appendChild(rendered);
            } else {
              // SECURITY: Use textContent instead of innerHTML to prevent XSS
              // Convert to string and use textContent to safely display the value
              td.textContent = String(rendered);
            }
          } catch (e) {
            console.error('Error in render function for column', col.id, ':', e);
            td.textContent = formatValue(rawValue);
          }
        } else {
          td.textContent = formatValue(rawValue);
        }
        
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    borderDiv.appendChild(table);
    tableWrapper.appendChild(borderDiv);

    // Count footer
    const footer = document.createElement('div');
    footer.className = 'mt-4 text-sm text-gray-600 dark:text-gray-400';
    footer.textContent = 'Showing ' + data.length + ' ' + (data.length === 1 ? 'item' : 'items');

    containerEl.appendChild(tableWrapper);
    containerEl.appendChild(footer);
  }

  /**
   * Load and render table
   */
  function loadAndRenderTable(containerId, options) {
    const container = typeof containerId === 'string' 
      ? document.getElementById(containerId) 
      : containerId;
    
    if (!container) {
      console.error('Table container not found:', containerId);
      return Promise.reject(new Error('Container not found'));
    }

    const baseUrl = options.baseUrl || window.location.origin;
    const schemaId = options.schemaId;
    const columns = options.columns || [];
    const columnConfig = options.columnConfig || null;
    
    // Determine column count for skeleton
    const tableActions = options && options.tableActions ? options.tableActions : [];
    let columnCount = 5;
    if (columnConfig && Array.isArray(columnConfig) && columnConfig.length > 0) {
      columnCount = columnConfig.length;
    } else if (columns && columns.length > 0) {
      columnCount = columns.length;
    }
    // Add 1 for actions column if present
    if (tableActions.length > 0) {
      columnCount += 1;
    }
    
    const rowCount = options.skeletonRowCount || 6;

    if (!schemaId) {
      console.error('Schema ID is required');
      return Promise.reject(new Error('Schema ID is required'));
    }

    // Show skeleton
    const skeleton = createTableSkeleton(container, rowCount, columnCount);
    container.innerHTML = '';
    container.appendChild(skeleton);

    // Load data
    return fetch(baseUrl + '/api/data/' + schemaId)
      .then(function(response) {
        return response.json();
      })
      .then(function(result) {
        let data = [];
        if (result.success && Array.isArray(result.data)) {
          data = result.data;
        } else if (result.success && result.data) {
          data = [result.data];
        }

        // If no columnConfig provided and we have data, auto-detect columns from first item
        let finalColumnConfig = columnConfig;
        if (!finalColumnConfig && data.length > 0) {
          // Auto-detect columns from the first data item
          const firstItem = data[0];
          const allKeys = Object.keys(firstItem).filter(function(key) {
            return !key.startsWith('_') && key !== 'password' && key !== 'token';
          });
          
          const sortedKeys = allKeys.sort(function(a, b) {
            if (a === 'id') return -1;
            if (b === 'id') return 1;
            if (a === 'name' || a === 'title') return -1;
            if (b === 'name' || b === 'title') return 1;
            return a.localeCompare(b);
          });

          finalColumnConfig = sortedKeys.slice(0, 10).map(function(key) {
            return {
              id: key,
              label: formatKey(key),
              accessor: key
            };
          });
        }

        // Render table
        renderTable(container, data, columns, {
          ...options,
          columnConfig: finalColumnConfig
        });

        return {
          success: true,
          data: data,
          count: data.length
        };
      })
      .catch(function(error) {
        container.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-center py-10 text-red-500 dark:text-red-400';
        errorDiv.textContent = 'Error loading data: ' + (error.message || 'Unknown error');
        container.appendChild(errorDiv);
        
        return {
          success: false,
          error: error.message || 'Unknown error',
          data: []
        };
      });
  }

  /**
   * Expose API globally
   */
  var GradianTableEmbed = {
    renderTable: function(container, data, columns, options) {
      // Support both old API (columns as 3rd param) and new API (columns in options)
      if (arguments.length === 2 || (arguments.length === 3 && typeof arguments[2] === 'object' && !Array.isArray(arguments[2]))) {
        // New API: renderTable(container, data, options)
        options = arguments[2] || {};
        columns = options.columns || [];
        return renderTable(container, data, columns, options);
      }
      // Old API: renderTable(container, data, columns, options)
      return renderTable(container, data, columns, options);
    },
    loadAndRenderTable: loadAndRenderTable,
    formatKey: formatKey,
    formatValue: formatValue,
    version: '1.0.0',
  };

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GradianTableEmbed;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return GradianTableEmbed;
    });
  } else {
    global.GradianTableEmbed = GradianTableEmbed;
  }

  if (typeof window !== 'undefined') {
    window.GradianTableEmbed = GradianTableEmbed;
  }
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);

