'use client';

import React, { useState, useEffect, useRef } from 'react';

// Declare global type for CDN script
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
  }
}

interface DataItem {
  id: string;
  [key: string]: any;
}

export default function ThirdPartyFormUsageModalPage() {
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [schemaId, setSchemaId] = useState('tags');
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Load CDN script
  useEffect(() => {
    // Replace with your actual CDN URL
    const cdnUrl = 'http://localhost:3000/cdn/form-embed-helper-modal.min.js';
    // For development, you can use the local path:
    // const cdnUrl = '/cdn/form-embed-helper-modal.min.js';

    // Check if script is already loaded
    if (window.GradianFormEmbedModal) {
      setScriptLoaded(true);
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector(`script[src="${cdnUrl}"]`);
    if (existingScript) {
      // Wait a bit for script to load
      const checkInterval = setInterval(() => {
        if (window.GradianFormEmbedModal) {
          setScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = cdnUrl;
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      setMessage({ text: 'Failed to load form embed helper script. Please check the CDN URL.', type: 'error' });
    };
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Cleanup: remove script if component unmounts
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, []);

  // Load data on mount and when schema/baseUrl changes
  useEffect(() => {
    loadData();
  }, [schemaId, baseUrl]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    if (type === 'success') {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/data/${schemaId}`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setData(result.data);
      } else if (result.success && result.data) {
        setData([result.data]);
      } else {
        setData([]);
        showMessage(`Failed to load data: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error: any) {
      setData([]);
      showMessage(`Error loading data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!window.GradianFormEmbedModal) {
      showMessage('Form embed modal helper not loaded. Please check the script path.', 'error');
      return;
    }

    setCreateLoading(true);

    try {
      const result = await window.GradianFormEmbedModal.createData(schemaId, {
        baseUrl: baseUrl,
      });

      if (result.success) {
        showMessage(`${schemaId} created successfully! ID: ${result.entityId}`, 'success');
        
        // If we have the created data, add it to the list immediately
        if (result.data) {
          setData(prevData => {
            // Check if item already exists (by id)
            const existingIndex = prevData.findIndex(item => item.id === result.entityId);
            if (existingIndex >= 0) {
              // Update existing item
              const newData = [...prevData];
              newData[existingIndex] = { ...result.data, id: result.entityId };
              return newData;
            } else {
              // Add new item at the beginning
              return [{ ...result.data, id: result.entityId }, ...prevData];
            }
          });
        } else {
          // Reload all data if we don't have the created item data
          await loadData();
        }
      } else {
        showMessage(`Failed to create ${schemaId}: ${result.error}`, 'error');
      }
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async (entityId: string) => {
    if (!window.GradianFormEmbedModal) {
      showMessage('Form embed modal helper not loaded.', 'error');
      return;
    }

    try {
      const result = await window.GradianFormEmbedModal.editData(schemaId, entityId, {
        baseUrl: baseUrl,
      });

      if (result.success) {
        showMessage(`${schemaId} updated successfully!`, 'success');
        
        // If we have the updated data, update it in the list immediately
        if (result.data) {
          setData(prevData => {
            const existingIndex = prevData.findIndex(item => item.id === entityId);
            if (existingIndex >= 0) {
              // Update existing item
              const newData = [...prevData];
              newData[existingIndex] = { ...result.data, id: entityId };
              return newData;
            } else {
              // Item not found, reload all data
              loadData();
              return prevData;
            }
          });
        } else {
          // Reload all data if we don't have the updated item data
          await loadData();
        }
      } else {
        showMessage(`Failed to update ${schemaId}: ${result.error}`, 'error');
      }
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    }
  };

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '—';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.length > 0 ? `${value.length} items` : 'Empty';
      }
      return 'Object';
    }

    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }

    return String(value);
  };

  const allKeys = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (!key.startsWith('_') && key !== 'password' && key !== 'token') {
        allKeys.add(key);
      }
    });
  });

  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    if (a === 'id') return -1;
    if (b === 'id') return 1;
    if (a === 'name' || a === 'title') return -1;
    if (b === 'name' || b === 'title') return 1;
    return a.localeCompare(b);
  });

  const displayKeys = sortedKeys.slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 text-center">
          <h1 className="text-3xl font-bold mb-2">🚀 Gradian Form Embed - Modal Version</h1>
          <p className="opacity-90">No popup, no iframe - embedded modal dialog (React Example)</p>
        </div>

        {/* Controls */}
        <div className="p-8 bg-gray-50 border-b border-gray-200">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
            <p className="text-sm">
              <strong>Base URL:</strong> {baseUrl}
              <br />
              <small className="text-gray-600">This version uses a modal dialog instead of a popup window</small>
              <br />
              <small className="text-gray-600">
                Script Status: {scriptLoaded ? '✅ Loaded' : '⏳ Loading...'}
              </small>
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-2 font-semibold text-gray-700 text-sm">
                Base URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://yourapp.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block mb-2 font-semibold text-gray-700 text-sm">
                Schema
              </label>
              <select
                value={schemaId}
                onChange={(e) => setSchemaId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="tags">Tags</option>
                <option value="companies">Companies</option>
                <option value="users">Users</option>
              </select>
            </div>

            <div>
              <button
                onClick={handleCreate}
                disabled={createLoading || !scriptLoaded}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap"
              >
                {createLoading ? '⏳ Opening form...' : '➕ Create New'}
              </button>
            </div>

            <div>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? '⏳ Loading...' : '🔄 Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-10 text-gray-500">Loading data...</div>
          )}

          {/* Data Table */}
          {!loading && data.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <h3 className="text-xl font-semibold mb-2">No {schemaId} found</h3>
              <p>Click &quot;Create New&quot; to add your first {schemaId.slice(0, -1)}</p>
            </div>
          )}

          {!loading && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white shadow-md">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    {displayKeys.map(key => (
                      <th key={key} className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider">
                        {formatKey(key)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      {displayKeys.map(key => (
                        <td key={key} className="px-4 py-3 text-sm">
                          {formatValue(item[key])}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEdit(item.id)}
                          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-600">
                Showing {data.length} {data.length === 1 ? schemaId.slice(0, -1) : schemaId}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

