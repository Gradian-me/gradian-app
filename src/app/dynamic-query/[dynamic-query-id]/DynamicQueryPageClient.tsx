'use client';

import { useState, useCallback, useRef } from 'react';
import { DynamicQueryTableWrapper } from '@/gradian-ui/data-display/dynamic-query-table/components/DynamicQueryTableWrapper';
import { MainLayout } from '@/components/layout/main-layout';
import { DynamicFilterPane } from '@/gradian-ui/shared/components/DynamicFilterPane';
import { FormModal } from '@/gradian-ui/form-builder';
import { DynamicQueryActionsConfig } from '@/gradian-ui/data-display/dynamic-query-table/utils/action-helpers';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

interface DynamicQueryPageClientProps {
  dynamicQueryId: string;
  queryName?: string;
  queryDescription?: string;
  queryParams?: Record<string, any>;
  flattenedSchemas?: string[];
  dynamicQueryActions?: DynamicQueryActionsConfig;
}

export function DynamicQueryPageClient({
  dynamicQueryId,
  queryName,
  queryDescription,
  queryParams,
  flattenedSchemas,
  dynamicQueryActions,
}: DynamicQueryPageClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [flatten, setFlatten] = useState(false);
  const [showIds, setShowIds] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(true); // Default to true to show filter pane initially
  const [editEntityId, setEditEntityId] = useState<{ schemaId: string; entityId: string } | null>(null);
  const refreshFnRef = useRef<(() => Promise<void>) | null>(null);

  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const searchPlaceholder = getT(TRANSLATION_KEYS.PLACEHOLDER_SEARCH_RESULTS, language ?? defaultLang, defaultLang);
  
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

  const handleEditEntity = useCallback((schemaId: string, entityId: string) => {
    // Prevent setting the same entity if already editing it (prevents loops)
    setEditEntityId((current) => {
      if (current && current.schemaId === schemaId && current.entityId === entityId) {
        // Already editing this entity, don't update
        return current;
      }
      return { schemaId, entityId };
    });
  }, []);

  return (
    <MainLayout
      title={queryName || `Dynamic Query: ${dynamicQueryId}`}
      subtitle={queryDescription || `View results for dynamic query: ${dynamicQueryId}`}
      icon="Database"
      showEndLine={false}
    >
      <div className="container mx-auto px-4 py-6 space-y-4">
        {isSuccess && (
          <DynamicFilterPane
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onAddNew={handleAddNew}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            searchPlaceholder={searchPlaceholder}
            addButtonText="Add New"
            showHierarchy={true}
            showOnlyViews={['hierarchy', 'table']}
            showIds={showIds}
            onShowIdsChange={setShowIds}
            onExpandAllHierarchy={handleExpandAll}
            onCollapseAllHierarchy={handleCollapseAll}
            showAddButton={false}
          />
        )}
        <DynamicQueryTableWrapper 
          dynamicQueryId={dynamicQueryId}
          queryParams={queryParams}
          highlightQuery={searchTerm.trim() || undefined}
          flatten={flatten}
          onFlattenChange={setFlatten}
          showIds={showIds}
          onShowIdsChange={setShowIds}
          flattenedSchemas={flattenedSchemas}
          dynamicQueryActions={dynamicQueryActions}
          onEditEntity={handleEditEntity}
          onRefreshReady={(refreshFn) => {
            refreshFnRef.current = refreshFn;
          }}
          onExpandAllReady={(expandFn, collapseFn) => {
            expandAllRef.current = expandFn;
            collapseAllRef.current = collapseFn;
          }}
          onStatusChange={(success) => {
            setIsSuccess(success);
          }}
        />
      </div>

      {/* Edit Modal */}
      {editEntityId && (
        <FormModal
          key={`edit-${editEntityId.schemaId}-${editEntityId.entityId}`}
          schemaId={editEntityId.schemaId}
          entityId={editEntityId.entityId}
          mode="edit"
          onSuccess={async () => {
            // Refresh the query data after successful edit
            if (refreshFnRef.current) {
              await refreshFnRef.current();
            }
            setEditEntityId(null);
          }}
          onClose={() => {
            setEditEntityId(null);
          }}
          getInitialEntityData={(requestedSchemaId, requestedEntityId) => {
            // Return null to force API fetch, but this also allows us to handle 404s
            // The FormModal will handle the error and prevent retries
            return null;
          }}
        />
      )}
    </MainLayout>
  );
}

