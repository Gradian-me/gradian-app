'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DynamicDetailPageRenderer } from '@/gradian-ui/data-display/components/DynamicDetailPageRenderer';
import { DetailPageMetadataDialog } from '@/gradian-ui/schema-manager/components/DetailPageMetadataDialog';
import { FormSchema, DetailPageMetadata, QuickAction } from '@/gradian-ui/schema-manager/types/form-schema';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { DynamicQuickActions } from '@/gradian-ui/data-display/components/DynamicQuickActions';

interface PageEditorWrapperProps {
  schema: FormSchema;
  data: any;
  onRefreshData?: () => Promise<void>;
  onQuickActionClick?: (action: QuickAction) => void;
}

export function PageEditorWrapper({ schema, data, onRefreshData }: PageEditorWrapperProps) {
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [pageMetadata, setPageMetadata] = useState<DetailPageMetadata | null>(null);

  // Listen for configure-layout events as a fallback
  useEffect(() => {
    const handleConfigureLayout = () => {
      console.log('[PageEditorWrapper] Received configure-layout event');
      setIsMetadataDialogOpen(true);
    };

    window.addEventListener('configure-page-layout', handleConfigureLayout);
    return () => {
      window.removeEventListener('configure-page-layout', handleConfigureLayout);
    };
  }, []);

  // Parse detailPageMetadata from the page entity
  useEffect(() => {
    if (data?.detailPageMetadata) {
      try {
        // If it's a string, parse it; otherwise use as-is
        const metadata = typeof data.detailPageMetadata === 'string'
          ? JSON.parse(data.detailPageMetadata)
          : data.detailPageMetadata;
        setPageMetadata(metadata);
      } catch (err) {
        console.error('Failed to parse detailPageMetadata:', err);
        setPageMetadata({});
      }
    } else {
      setPageMetadata({});
    }
  }, [data]);

  const handleMetadataUpdate = async (updatedMetadata: DetailPageMetadata) => {
    try {
      // Update the page entity with new metadata
      const response = await apiRequest(`/api/data/pages/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          detailPageMetadata: JSON.stringify(updatedMetadata),
        }),
      });

      if (response.success) {
        setPageMetadata(updatedMetadata);
        setIsMetadataDialogOpen(false);
        // Refresh data if callback provided
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        console.error('Failed to update page metadata:', response.error);
      }
    } catch (err) {
      console.error('Error updating page metadata:', err);
    }
  };

  // Create a schema with the metadata for the dialog
  const schemaForDialog = useMemo(() => {
    return {
      ...schema,
      detailPageMetadata: pageMetadata || {},
    };
  }, [schema, pageMetadata]);

  // Create a schema with metadata for the renderer
  const schemaWithMetadata = useMemo(() => {
    // Merge schema's default metadata with page entity's metadata
    const schemaMetadata = schema.detailPageMetadata || {};
    const entityMetadata = pageMetadata || {};
    
    // Combine quick actions from both sources
    const schemaQuickActions = schemaMetadata.quickActions || [];
    const entityQuickActions = entityMetadata.quickActions || [];
    const allQuickActions = [...schemaQuickActions, ...entityQuickActions];
    
    // Ensure the configure-page-layout quick action is present (check by ID or label)
    const hasConfigureAction = allQuickActions.some(
      a => a.id === 'configure-page-layout' || a.label === 'Configure Page Layout'
    );
    
    const metadataWithAction: DetailPageMetadata = {
      ...schemaMetadata,
      ...entityMetadata,
      quickActions: hasConfigureAction 
        ? allQuickActions 
        : [
            ...allQuickActions,
            {
              id: 'configure-page-layout',
              label: 'Configure Page Layout',
              icon: 'Settings',
              variant: 'default',
              action: 'openMetadataEditor',
            } as QuickAction,
          ],
    };

    console.log('[PageEditorWrapper] Schema with metadata:', {
      hasConfigureAction,
      quickActionsCount: metadataWithAction.quickActions?.length,
      quickActions: metadataWithAction.quickActions,
    });

    return {
      ...schema,
      detailPageMetadata: metadataWithAction,
    };
  }, [schema, pageMetadata]);

  // Intercept the configure-page-layout action
  const handleQuickActionClick = useCallback((action: QuickAction) => {
    console.log('[PageEditor] handleQuickActionClick called with action:', {
      id: action.id,
      action: action.action,
      submitRoute: action.submitRoute,
      label: action.label,
    });
    
    // Check if this is the configure page layout action
    // Match by ID or by the specific route pattern
    const isConfigureAction = 
      action.id === 'configure-page-layout' || 
      action.label === 'Configure Page Layout' ||
      (action.action === 'callApi' && action.submitRoute && (
        action.submitRoute === '/api/pages/configure-layout' ||
        action.submitRoute.includes('configure-layout')
      ));
    
    console.log('[PageEditor] Is configure action?', isConfigureAction);
    
    if (isConfigureAction) {
      console.log('[PageEditor] Opening metadata dialog for action:', action.id);
      setIsMetadataDialogOpen(true);
      return true; // Indicate we handled it, skip default handler
    }
    console.log('[PageEditor] Not a configure action, letting default handler process');
    return false; // Let default handler process it
  }, []);

  console.log('[PageEditorWrapper] Rendering with customQuickActionHandler:', !!handleQuickActionClick, handleQuickActionClick);

  return (
    <>
      <DynamicDetailPageRenderer
        schema={schemaWithMetadata}
        data={data}
        onRefreshData={onRefreshData}
        customQuickActionHandler={handleQuickActionClick}
      />

      <DetailPageMetadataDialog
        isOpen={isMetadataDialogOpen}
        onClose={() => setIsMetadataDialogOpen(false)}
        metadata={pageMetadata}
        onUpdate={handleMetadataUpdate}
        schema={schemaForDialog}
        title="Configure Page Layout"
      />
    </>
  );
}

