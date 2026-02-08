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
import { TableConfig } from '../table/types';
import { useRepeatingTableColumns } from '../table/hooks/useRepeatingTableColumns';
import { useRepeatingTableData } from '../table/hooks/useRepeatingTableData';
import { RelationActionCell } from '../table/components/RelationActionCell';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, List } from 'lucide-react';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { getValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { cn } from '@/gradian-ui/shared/utils';
import { FormModal } from '@/gradian-ui/form-builder/components/FormModal';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';
import { NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { toast } from 'sonner';
import { DEFAULT_LIMIT } from '@/gradian-ui/shared/utils/pagination-utils';

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
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; relationId: string | null; targetId: string | null }>({
    open: false,
    relationId: null,
    targetId: null,
  });

  const language = useLanguageStore((s) => s.language) ?? 'en';
  const defaultLang = getDefaultLanguage();

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
  const maxItems = repeatingConfig?.maxItems;
  const currentItemsCount = sectionData?.length || 0;
  const canAddMore = maxItems === undefined || maxItems === 0 || currentItemsCount < maxItems;

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

  const handleDeleteClick = useCallback((relationId: string, targetId?: string, e?: React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    setDeleteConfirmDialog({ open: true, relationId, targetId: targetId ?? null });
  }, []);

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
      const relationId = _row?.__relationId;
      return (
        <RelationActionCell
          itemId={itemId}
          relationId={relationId}
          onView={handleViewDetails}
          onEdit={handleEditDetails}
          onDeleteClick={
            relationId
              ? (relId) => handleDeleteClick(String(relId), itemId ? String(itemId) : undefined)
              : undefined
          }
        />
      );
    },
    [handleEditDetails, handleViewDetails, handleDeleteClick]
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
        pageSize: DEFAULT_LIMIT,
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
      // Validate required parameters
      if (!currentEntityId) {
        toast.error('Cannot create relation', {
          description: 'Source entity ID is missing. Please save the form first.',
        });
        setIsPickerOpen(false);
        return;
      }

      if (!repeatingConfig?.relationTypeId) {
        toast.error('Cannot create relation', {
          description: 'Relation type is not configured for this section.',
        });
        setIsPickerOpen(false);
        return;
      }

      if (!targetSchemaId) {
        toast.error('Cannot create relation', {
          description: 'Target schema is not configured for this section.',
        });
        setIsPickerOpen(false);
        return;
      }

      try {
        const normalizedSelections = Array.isArray(selectedItems) ? selectedItems : [];
        const existingIds = new Set(selectedIds.map((id) => String(id)));
        
        // Extract IDs from normalized selections
        const selectionIds = normalizedSelections
          .map((selection) => selection?.id)
          .filter((id): id is string => Boolean(id));
        
        // Also check rawItems for fallback
        const rawItemIds = Array.isArray(rawItems)
          ? rawItems.map((item) => item?.id).filter((id): id is string => Boolean(id))
          : [];
        
        // Combine and deduplicate IDs
        const allCandidateIds = Array.from(new Set([...selectionIds, ...rawItemIds]));
        
        // Filter out already existing relations
        const toCreateIds = allCandidateIds.filter((id) => !existingIds.has(String(id)));

        if (toCreateIds.length === 0) {
          toast.info('Item already linked', {
            description: 'This item is already linked to the current record.',
          });
          setIsPickerOpen(false);
          return;
        }

        // Create relation operations
        const operations = toCreateIds.map((targetId) =>
          apiRequest('/api/relations', {
            method: 'POST',
            body: {
              sourceSchema: schema.id,
              sourceId: currentEntityId,
              targetSchema: targetSchemaId,
              targetId,
              relationTypeId: repeatingConfig.relationTypeId,
            },
            callerName: 'RepeatingSectionDialog.createRelationsFromPicker',
          })
        );

        // Execute all operations
        const results = await Promise.all(operations);
        
        // Check for failures
        const failedResults = results.filter((response) => !response?.success);
        const successCount = results.length - failedResults.length;

        if (failedResults.length > 0) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to create one or more relations from picker: ${JSON.stringify(failedResults)}`);
          const errorMessages = failedResults
            .map((r) => r.error || 'Unknown error')
            .join(', ');
          
          if (successCount > 0) {
            toast.warning('Partial success', {
              description: `Created ${successCount} relation(s), but ${failedResults.length} failed: ${errorMessages}`,
            });
          } else {
            toast.error('Failed to create relation', {
              description: errorMessages || 'An error occurred while creating the relation.',
            });
          }
        } else {
          toast.success('Relation created', {
            description: `Successfully linked ${successCount} item(s).`,
          });
        }

        // Refresh the table data
        await refresh();
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error creating relation from picker: ${error instanceof Error ? error.message : String(error)}`);
        toast.error('Error creating relation', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        });
      } finally {
        setIsPickerOpen(false);
      }
    },
    [currentEntityId, repeatingConfig?.relationTypeId, schema.id, targetSchemaId, selectedIds, refresh]
  );

  // Prevent clicks inside dialog from propagating to parent elements
  const stopPropagation = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  // Prevent row clicks from propagating - just consume the event
  const handleTableRowClick = useCallback((row: any, index: number) => {
    // Do nothing - just prevent event from propagating to parent
  }, []);

  const handleRemoveRelation = useCallback(
    async (relationId: string, targetId?: string | null) => {
      try {
        const deleteType = repeatingConfig?.deleteType || 'itemAndRelation';
        // Delete relation first
        const relationResponse = await apiRequest(`/api/relations/${relationId}`, {
          method: 'DELETE',
          callerName: 'RepeatingSectionDialog.removeRelation',
        });

        if (!relationResponse.success) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to delete relation: ${relationResponse.error}`);
        } else if (
          deleteType === 'itemAndRelation' &&
          targetId &&
          targetSchemaId &&
          targetSchemaId !== 'schemas' // Never attempt to delete schema definitions
        ) {
          // If configured, also delete the target item (skip for schemas catalog)
          const itemResponse = await apiRequest(`/api/data/${targetSchemaId}/${targetId}`, {
            method: 'DELETE',
            callerName: 'RepeatingSectionDialog.removeRelation.deleteTarget',
          });
          if (!itemResponse.success) {
            loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to delete target item: ${itemResponse.error}`);
          }
        }

        await refresh();
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error removing relation: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setDeleteConfirmDialog({ open: false, relationId: null, targetId: null });
      }
    },
    [refresh, repeatingConfig?.deleteType, targetSchemaId]
  );

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
                  targetSchemaId &&
                  canAddMore && (
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
                  targetSchemaId &&
                  canAddMore && (
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
                    loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to create relation for new item: ${relationResponse.error}`);
                  } else {
                    await refresh();
                  }
                } catch (error) {
                  loggingCustom(LogType.CLIENT_LOG, 'error', `Error creating relation for new item: ${error instanceof Error ? error.message : String(error)}`);
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
            allowMultiselect={false}
          />
        )}

      {/* Delete Confirmation Dialog for relation-based sections */}
      <ConfirmationMessage
        isOpen={deleteConfirmDialog.open}
        onOpenChange={(open) =>
          setDeleteConfirmDialog((prev) => ({ ...prev, open }))
        }
        title={repeatingConfig?.deleteType === 'relationOnly' ? [{ en: 'Remove Relation' }, { fa: 'حذف ارتباط' }, { ar: 'إزالة العلاقة' }, { es: 'Quitar relación' }, { fr: 'Supprimer la relation' }, { de: 'Beziehung entfernen' }, { it: 'Rimuovi relazione' }, { ru: 'Удалить связь' }] : [{ en: 'Delete Item' }, { fa: 'حذف آیتم' }, { ar: 'حذف العنصر' }, { es: 'Eliminar elemento' }, { fr: 'Supprimer l\'élément' }, { de: 'Element löschen' }, { it: 'Elimina elemento' }, { ru: 'Удалить элемент' }]}
        message={repeatingConfig?.deleteType === 'relationOnly' ? [{ en: 'Are you sure you want to remove this relation? The related item will remain but will no longer be linked to this record.' }, { fa: 'آیا مطمئن هستید که می‌خواهید این ارتباط را حذف کنید؟ آیتم مرتبط باقی می‌ماند اما دیگر به این رکورد متصل نخواهد بود.' }, { ar: 'هل أنت متأكد أنك تريد إزالة هذه العلاقة؟ سيبقى العنصر المرتبط لكنه لن يكون مرتبطًا بهذا السجل.' }, { es: '¿Está seguro de que desea quitar esta relación? El elemento relacionado permanecerá pero ya no estará vinculado a este registro.' }, { fr: 'Voulez-vous vraiment supprimer cette relation ? L\'élément associé restera mais ne sera plus lié à cet enregistrement.' }, { de: 'Möchten Sie diese Beziehung wirklich entfernen? Das zugehörige Element bleibt erhalten, ist aber nicht mehr mit diesem Datensatz verknüpft.' }, { it: 'Sei sicuro di voler rimuovere questa relazione? L\'elemento correlato rimarrà ma non sarà più collegato a questo record.' }, { ru: 'Вы уверены, что хотите удалить эту связь? Связанный элемент останется, но больше не будет связан с этой записью.' }] : [{ en: 'Are you sure you want to delete this item and its relation? This action cannot be undone.' }, { fa: 'آیا مطمئن هستید که می‌خواهید این آیتم و ارتباط آن را حذف کنید؟ این عمل قابل بازگشت نیست.' }, { ar: 'هل أنت متأكد أنك تريد حذف هذا العنصر وعلاقته؟ لا يمكن التراجع عن هذا الإجراء.' }, { es: '¿Está seguro de que desea eliminar este elemento y su relación? Esta acción no se puede deshacer.' }, { fr: 'Voulez-vous vraiment supprimer cet élément et sa relation ? Cette action est irréversible.' }, { de: 'Möchten Sie dieses Element und seine Beziehung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.' }, { it: 'Sei sicuro di voler eliminare questo elemento e la sua relazione? Questa azione non può essere annullata.' }, { ru: 'Вы уверены, что хотите удалить этот элемент и его связь? Это действие нельзя отменить.' }]}
        variant={repeatingConfig?.deleteType === 'relationOnly' ? 'default' : 'destructive'}
        buttons={[
          {
            label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
            variant: 'outline',
            action: () => setDeleteConfirmDialog({ open: false, relationId: null, targetId: null }),
          },
          {
            label: repeatingConfig?.deleteType === 'relationOnly' ? getT(TRANSLATION_KEYS.BUTTON_REMOVE, language, defaultLang) : getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang),
            variant: repeatingConfig?.deleteType === 'relationOnly' ? 'default' : 'destructive',
            icon: 'Trash2',
            action: () => {
              if (deleteConfirmDialog.relationId) {
                handleRemoveRelation(deleteConfirmDialog.relationId, deleteConfirmDialog.targetId);
              }
            },
          },
        ]}
      />
    </>
  );
};

RepeatingSectionDialog.displayName = 'RepeatingSectionDialog';

