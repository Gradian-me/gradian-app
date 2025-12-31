'use client';

import { useState, useCallback, useRef } from 'react';
import { DynamicQueryTableWrapper } from '@/gradian-ui/data-display/dynamic-query-table/components/DynamicQueryTableWrapper';
import { MainLayout } from '@/components/layout/main-layout';
import { DynamicFilterPane } from '@/gradian-ui/shared/components/DynamicFilterPane';

interface DynamicQueryPageClientProps {
  dynamicQueryId: string;
  queryName?: string;
  queryDescription?: string;
  queryParams?: Record<string, any>;
}

export function DynamicQueryPageClient({
  dynamicQueryId,
  queryName,
  queryDescription,
  queryParams,
}: DynamicQueryPageClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [flatten, setFlatten] = useState(false);
  const [showIds, setShowIds] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshFnRef = useRef<(() => Promise<void>) | null>(null);
  
  // Sync viewMode with flatten state: hierarchy for flatten=false, table for flatten=true
  const viewMode: 'hierarchy' | 'table' = flatten ? 'table' : 'hierarchy';
  
  const handleViewModeChange = useCallback((mode: 'grid' | 'list' | 'table' | 'hierarchy') => {
    // Only allow hierarchy and table for dynamic queries
    if (mode === 'hierarchy') {
      setFlatten(false);
    } else if (mode === 'table') {
      setFlatten(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshFnRef.current) {
      setIsRefreshing(true);
      try {
        await refreshFnRef.current();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, []);

  const handleAddNew = useCallback(() => {
    // Dynamic queries are read-only, so this can be a no-op or show a message
    console.log('Add new is not available for dynamic queries');
  }, []);

  // Expand/collapse handlers for hierarchy view
  const expandAllRef = useRef<(() => void) | null>(null);
  const collapseAllRef = useRef<(() => void) | null>(null);

  const handleExpandAll = useCallback(() => {
    if (expandAllRef.current) {
      expandAllRef.current();
    }
  }, []);

  const handleCollapseAll = useCallback(() => {
    if (collapseAllRef.current) {
      collapseAllRef.current();
    }
  }, []);

  return (
    <MainLayout
      title={queryName || `Dynamic Query: ${dynamicQueryId}`}
      subtitle={queryDescription || `View results for dynamic query: ${dynamicQueryId}`}
      icon="Database"
      showEndLine={false}
    >
      <div className="container mx-auto px-4 py-6 space-y-4">
        <DynamicFilterPane
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onAddNew={handleAddNew}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          searchPlaceholder="Search results..."
          addButtonText="Add New"
          showHierarchy={true}
          showOnlyViews={['hierarchy', 'table']}
          showIds={showIds}
          onShowIdsChange={setShowIds}
          onExpandAllHierarchy={handleExpandAll}
          onCollapseAllHierarchy={handleCollapseAll}
          showAddButton={false}
        />
        <DynamicQueryTableWrapper 
          dynamicQueryId={dynamicQueryId}
          queryParams={queryParams}
          highlightQuery={searchTerm.trim() || undefined}
          flatten={flatten}
          onFlattenChange={setFlatten}
          showIds={showIds}
          onShowIdsChange={setShowIds}
          onRefreshReady={(refreshFn) => {
            refreshFnRef.current = refreshFn;
          }}
          onExpandAllReady={(expandFn, collapseFn) => {
            expandAllRef.current = expandFn;
            collapseAllRef.current = collapseFn;
          }}
        />
      </div>
    </MainLayout>
  );
}

