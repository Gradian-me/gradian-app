'use client';

import React, { useMemo, useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TableWrapper } from '../table/components/TableWrapper';
import { TableConfig, TableColumn } from '../table/types';
import { useRepeatingTableColumns } from '../table/hooks/useRepeatingTableColumns';
import { useRepeatingTableData } from '../table/hooks/useRepeatingTableData';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Button as UIButton } from '@/components/ui/button';
import { RefreshCw, Plus, List } from 'lucide-react';
import { getValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { cn } from '@/gradian-ui/shared/utils';
import { FormModal } from '@/gradian-ui/form-builder/components/FormModal';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';
import { NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { apiRequest } from '@/gradian-ui/shared/utils/api';

interface RepeatingSectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  schema: FormSchema;
  entityData: any;
  entityId?: string;
}

export const RepeatingSectionDialog: React.FC<RepeatingSectionDialogProps> = ({
  isOpen,
  onClose,
  sectionId,
  sectionTitle,
  schema,
  entityData,
  entityId,
}) => {
  const section = useMemo(
    () => schema.sections?.find((s) => s.id === sectionId),
    [schema.sections, sectionId]
  );

  const tableDataState = useRepeatingTableData({
    config: {
      id: sectionId,
      schemaId: schema.id,
      sectionId,
      title: sectionTitle,
      description: section?.description,
      targetSchema: section?.repeatingConfig?.targetSchema,
      relationTypeId: section?.repeatingConfig?.relationTypeId,
    },
    schema,
    data: entityData,
    sourceSchemaId: schema.id,
    sourceId: entityId,
    initialTargetSchema: null,
  });

  const {
    isRelationBased,
    section: resolvedSection,
    sectionData,
    fieldsToDisplay,
    targetSchemaData,
    isLoadingRelations,
    isLoadingTargetSchema,
    refresh,
  } = tableDataState;

  const effectiveSection = resolvedSection || section;

  const schemaForColumns = isRelationBased ? targetSchemaData : schema;
  const isLoading = isLoadingRelations || (isRelationBased && isLoadingTargetSchema);
  
  // State for edit modal
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Get parent entity title using getValueByRole
  const parentTitle = useMemo(() => {
    if (!entityData) return '';
    return getValueByRole(schema, entityData, 'title') || entityData.name || entityData.title || '';
  }, [schema, entityData]);

  // Get repeating config and addType
  const repeatingConfig = effectiveSection?.repeatingConfig;
  const addType = repeatingConfig?.addType || 'addOnly';
  const isConnectToSchema =
    repeatingConfig?.fieldRelationType === 'connectToSchema';

  const currentEntityId = entityId || entityData?.id;
  const targetSchemaId = isRelationBased && repeatingConfig?.targetSchema
    ? repeatingConfig.targetSchema
    : schema.id;

  // For unique selection, exclude already-related IDs from picker
  const selectedIds: string[] = useMemo(
    () =>
      isRelationBased
        ? (sectionData || [])
            .map((item: any) => (item?.id != null ? String(item.id) : null))
            .filter((id: string | null): id is string => Boolean(id))
        : [],
    [isRelationBased, sectionData]
  );

  const shouldExcludeIds = isRelationBased && repeatingConfig?.isUnique === true;

  const handleRefreshClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      await refresh();
    },
    [refresh]
  );

  const handleViewDetails = useCallback(
    (itemId: string | number) => {
      const navigationSchemaId = isRelationBased && section?.repeatingConfig?.targetSchema
        ? section.repeatingConfig.targetSchema
        : schema.id;
      window.open(`/page/${navigationSchemaId}/${itemId}`, '_blank');
    },
    [isRelationBased, section, schema.id]
  );

  const handleEditDetails = useCallback(
    (itemId: string | number) => {
      setEditEntityId(String(itemId));
    },
    []
  );

  const actionCellRenderer = useCallback(
    (_row: any, itemId: string | number | undefined) => {
      if (!itemId) return null;
      return (
        <div className="flex items-center justify-center gap-1.5">
          <UIButton
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleViewDetails(itemId);
            }}
            className="h-8 w-8 p-0 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all duration-200"
            title="View Details"
          >
            <IconRenderer iconName="Eye" className="h-4 w-4" />
          </UIButton>
          <UIButton
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleEditDetails(itemId);
            }}
            className="h-8 w-8 p-0 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all duration-200"
            title="Edit"
          >
            <IconRenderer iconName="Edit" className="h-4 w-4" />
          </UIButton>
        </div>
      );
    },
    [handleViewDetails, handleEditDetails]
  );

  const columns = useRepeatingTableColumns({
    fields: fieldsToDisplay,
    schemaForColumns: schemaForColumns || null,
    // Only show actions column for connectToSchema type (relation-based), not for addFields type
    renderActionCell: isConnectToSchema ? actionCellRenderer : undefined,
    getRowId: (row) => row?.id,
    showForceColumn: false, // Don't show force column in dialog
  });

  const tableConfig: TableConfig = useMemo(
    () => ({
      id: `dialog-table-${sectionId}`,
      columns,
      data: sectionData,
      pagination: {
        enabled: sectionData.length > 10,
        pageSize: 10,
        showPageSizeSelector: true,
        pageSizeOptions: [5, 10, 25, 50],
        alwaysShow: false,
      },
      sorting: {
        enabled: true,
      },
      filtering: {
        enabled: false,
      },
      selection: {
        enabled: false,
      },
      emptyState: {
        message: 'No items found',
      },
      loading: isLoading,
      striped: true,
      hoverable: true,
      bordered: true,
    }),
    [columns, sectionData, sectionId, isLoading]
  );

  const handleSelectFromPicker = useCallback(
    async (selectedItems: NormalizedOption[], rawItems: any[]) => {
      if (!currentEntityId || !repeatingConfig?.relationTypeId || !targetSchemaId) {
        return;
      }

      try {
        const normalizedSelections = Array.isArray(selectedItems) ? selectedItems : [];
        const operations = normalizedSelections
          .map((selection) => {
            if (!selection?.id) {
              return null;
            }

            return apiRequest('/api/relations', {
              method: 'POST',
              body: {
                sourceSchema: schema.id,
                sourceId: currentEntityId,
                targetSchema: targetSchemaId,
                targetId: selection.id,
                relationTypeId: repeatingConfig.relationTypeId,
              },
            });
          })
          .filter(Boolean) as Promise<any>[];

        if (operations.length === 0 && rawItems?.length) {
          const fallbackId = rawItems[0]?.id;
          if (fallbackId) {
            operations.push(
              apiRequest('/api/relations', {
                method: 'POST',
                body: {
                  sourceSchema: schema.id,
                  sourceId: currentEntityId,
                  targetSchema: targetSchemaId,
                  targetId: fallbackId,
                  relationTypeId: repeatingConfig.relationTypeId,
                },
              })
            );
          }
        }

        if (operations.length === 0) {
          return;
        }

        const results = await Promise.all(operations);
        const hasFailure = results.some((response) => !response?.success);
        if (hasFailure) {
          console.error('Failed to create one or more relations from picker:', results);
        } else {
          await refresh();
        }
      } catch (error) {
        console.error('Error creating relation from picker:', error);
      } finally {
        setIsPickerOpen(false);
      }
    },
    [currentEntityId, repeatingConfig?.relationTypeId, schema.id, targetSchemaId, refresh]
  );

  // Prevent clicks inside dialog from propagating to parent elements
  const stopPropagation = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  // Prevent row clicks from propagating - just consume the event
  const handleTableRowClick = useCallback((row: any, index: number) => {
    // Do nothing - just prevent event from propagating to parent
  }, []);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="min-w-2xl min-h-[50vh] max-w-7xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onPointerDown={stopPropagation}
        >
            <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0 justify-between pe-2">
                <div className="flex flex-col min-w-0">
                  <DialogTitle className="text-xl font-semibold truncate">{sectionTitle}</DialogTitle>
                  {parentTitle && (
                    <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 mt-1 truncate">
                      {schema.singular_name}: {parentTitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Select from existing data */}
                {isRelationBased &&
                  repeatingConfig?.fieldRelationType === 'connectToSchema' &&
                  (addType === 'canSelectFromData' || addType === 'mustSelectFromData') &&
                  targetSchemaId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsPickerOpen(true);
                      }}
                      disabled={isLoading || !currentEntityId}
                      className="text-xs inline-flex items-center gap-1.5"
                    >
                      <List className="h-3.5 w-3.5" />
                      Select{' '}
                      {targetSchemaData?.plural_name ||
                        targetSchemaData?.singular_name ||
                        targetSchemaId}
                    </Button>
                  )}

                {/* Add new related item */}
                {isRelationBased &&
                  repeatingConfig?.fieldRelationType === 'connectToSchema' &&
                  addType !== 'mustSelectFromData' &&
                  targetSchemaId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAddModalOpen(true);
                      }}
                      disabled={isLoading || !currentEntityId}
                      className="text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add{' '}
                      {targetSchemaData?.singular_name ||
                        targetSchemaData?.plural_name ||
                        targetSchemaId}
                    </Button>
                  )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshClick}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors duration-200 p-1.5 shrink-0"
                  aria-label="Refresh table"
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin text-violet-600')} />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div 
            className="flex-1 overflow-auto mt-2" 
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
          >
            <div className="flex items-center justify-end mb-1 pe-1">
              {isLoading ? (
                <Badge variant="secondary" className="animate-pulse shrink-0">
                  Loading...
                </Badge>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  {sectionData.length} {sectionData.length === 1 ? 'item' : 'items'}
                </Badge>
              )}
            </div>
            <TableWrapper
              tableConfig={tableConfig}
              columns={columns}
              data={sectionData}
              showCards={false}
              disableAnimation={false}
              index={0}
              isLoading={isLoading}
              onRowClick={handleTableRowClick}
              schema={schemaForColumns || undefined}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Modal - rendered outside to avoid nested dialogs */}
      {editEntityId && targetSchemaId && (
        <FormModal
          schemaId={targetSchemaId}
          mode="edit"
          entityId={editEntityId}
          onSuccess={() => {
            setEditEntityId(null);
            // Refresh the table data
            refresh();
          }}
          onClose={() => {
            setEditEntityId(null);
          }}
        />
      )}

      {/* Add related item modal for relation-based sections */}
      {isRelationBased &&
        repeatingConfig?.fieldRelationType === 'connectToSchema' &&
        isAddModalOpen &&
        targetSchemaId && (
          <FormModal
            schemaId={targetSchemaId}
            mode="create"
            onSuccess={async (createdEntity) => {
              setIsAddModalOpen(false);
              const newEntityId =
                createdEntity?.id || (createdEntity as any)?.data?.id;

              if (currentEntityId && newEntityId && repeatingConfig?.relationTypeId) {
                try {
                  const relationResponse = await apiRequest('/api/relations', {
                    method: 'POST',
                    body: {
                      sourceSchema: schema.id,
                      sourceId: currentEntityId,
                      targetSchema: targetSchemaId,
                      targetId: newEntityId,
                      relationTypeId: repeatingConfig.relationTypeId,
                    },
                  });

                  if (!relationResponse.success) {
                    console.error('Failed to create relation for new item:', relationResponse.error);
                  } else {
                    await refresh();
                  }
                } catch (error) {
                  console.error('Error creating relation for new item:', error);
                }
              }
            }}
            onClose={() => {
              setIsAddModalOpen(false);
            }}
          />
        )}

      {/* Popup picker for selecting existing related items */}
      {isRelationBased &&
        repeatingConfig?.fieldRelationType === 'connectToSchema' &&
        isPickerOpen &&
        targetSchemaId && (
          <PopupPicker
            isOpen={isPickerOpen}
            onClose={() => setIsPickerOpen(false)}
            schemaId={targetSchemaId}
            schema={targetSchemaData || undefined}
            onSelect={handleSelectFromPicker}
            title={`Select ${
              targetSchemaData?.plural_name ||
              targetSchemaData?.singular_name ||
              targetSchemaId
            }`}
            description={`Choose existing ${
              targetSchemaData?.singular_name || 'items'
            } to link to this record`}
            excludeIds={shouldExcludeIds ? selectedIds : undefined}
            selectedIds={selectedIds}
            canViewList={true}
            viewListUrl={`/page/${targetSchemaId}`}
            allowMultiselect={true}
          />
        )}
    </>
  );
};

RepeatingSectionDialog.displayName = 'RepeatingSectionDialog';

