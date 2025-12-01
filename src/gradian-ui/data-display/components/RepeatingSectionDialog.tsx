'use client';

import React, { useMemo, useCallback } from 'react';
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
import { RefreshCw } from 'lucide-react';
import { getValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { cn } from '@/gradian-ui/shared/utils';

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

  const isRelationBased = useMemo(
    () => !!(section?.repeatingConfig?.targetSchema && section?.repeatingConfig?.relationTypeId),
    [section]
  );

  // Check if this is a connectToSchema type (relation-based) vs addFields type (regular repeating)
  const isConnectToSchema = useMemo(
    () => section?.repeatingConfig?.fieldRelationType === 'connectToSchema',
    [section]
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
    sectionData,
    fieldsToDisplay,
    targetSchemaData,
    isLoadingRelations,
    isLoadingTargetSchema,
    refresh,
  } = tableDataState;

  const schemaForColumns = isRelationBased ? targetSchemaData : schema;
  const isLoading = isLoadingRelations || (isRelationBased && isLoadingTargetSchema);

  // Get parent entity title using getValueByRole
  const parentTitle = useMemo(() => {
    if (!entityData) return '';
    return getValueByRole(schema, entityData, 'title') || entityData.name || entityData.title || '';
  }, [schema, entityData]);

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
      const navigationSchemaId =
        isRelationBased && section?.repeatingConfig?.targetSchema
          ? section.repeatingConfig.targetSchema
          : schema.id;
      window.open(`/page/${navigationSchemaId}/${itemId}?showBack=true&mode=edit`, '_blank');
    },
    [isRelationBased, section, schema.id]
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-2xl min-h-[50vh] max-w-7xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex flex-col min-w-0">
                <DialogTitle className="text-xl font-semibold truncate">{sectionTitle}</DialogTitle>
                {parentTitle && (
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 mt-1 truncate">
                    {schema.singular_name}: {parentTitle}
                  </p>
                )}
              </div>
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
        </DialogHeader>
        <div className="flex-1 overflow-auto mt-4">
          <TableWrapper
            tableConfig={tableConfig}
            columns={columns}
            data={sectionData}
            showCards={false}
            disableAnimation={false}
            index={0}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

RepeatingSectionDialog.displayName = 'RepeatingSectionDialog';

