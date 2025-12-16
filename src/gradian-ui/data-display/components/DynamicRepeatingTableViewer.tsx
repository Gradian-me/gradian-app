// Dynamic Repeating Table Viewer Component
// Displays repeating section data in a table format

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FormSchema, RepeatingTableRendererConfig } from '@/gradian-ui/schema-manager/types/form-schema';
import {
  TableConfig,
  TableWrapper,
  useRepeatingTableColumns,
  useRepeatingTableData,
  useResponsiveCards,
  ColumnWidthMap,
} from '../table';
import { RelationActionCell } from '../table/components/RelationActionCell';
import { CardWrapper, CardHeader, CardTitle, CardContent } from '../card/components/CardWrapper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '../../shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Badge } from '../../form-builder/form-elements/components/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * Column width configuration for different field types
 * Maps field types to min and max width constraints
 */
export interface DynamicRepeatingTableViewerProps {
  config: RepeatingTableRendererConfig;
  schema: FormSchema;
  data: any; // The main entity data that contains the repeating section array
  index?: number;
  disableAnimation?: boolean;
  className?: string;
  sourceSchemaId?: string; // Source schema ID for relation-based tables
  sourceId?: string; // Source entity ID for relation-based tables
  showRefreshButton?: boolean;
  initialTargetSchema?: FormSchema | null;
}

export const DynamicRepeatingTableViewer: React.FC<DynamicRepeatingTableViewerProps> = ({
  config,
  schema,
  data,
  index = 0,
  disableAnimation = false,
  className,
  sourceSchemaId,
  sourceId,
  showRefreshButton = false,
  initialTargetSchema = null,
}) => {
  const router = useRouter();

  const tableDataState = useRepeatingTableData({
    config,
    schema,
    data,
    sourceSchemaId,
    sourceId,
    initialTargetSchema,
  });

  const {
    isRelationBased,
    section,
    sectionData,
    fieldsToDisplay,
    targetSchemaData,
    isLoadingRelations,
    isLoadingTargetSchema,
    relationInfo,
    refresh,
  } = tableDataState;

  const navigationSchemaId = isRelationBased && config.targetSchema ? config.targetSchema : schema.id;
  const schemaForColumns = isRelationBased ? targetSchemaData : schema;

  const tableProps = config.tableProperties || {};
  const cardColumns = tableProps.cardColumns ?? 2;
  const aggregations = tableProps.aggregations || [];
  const aggregationAlignment = tableProps.aggregationAlignment ?? 'end';
  const aggregationColumns = tableProps.aggregationColumns ?? 3;
  const columnWidths = tableProps.columnWidths as ColumnWidthMap | undefined;

  const handleViewDetails = useCallback(
    (itemId: string | number) => {
      router.push(`/page/${navigationSchemaId}/${itemId}?showBack=true`);
    },
    [navigationSchemaId, router]
  );

  const handleRefreshClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      await refresh();
    },
    [refresh]
  );

  const actionCellRenderer = useCallback(
    (_row: any, itemId: string | number | undefined) => {
      if (!itemId) return null;
      return (
        <RelationActionCell
          itemId={itemId}
          relationId={_row?.__relationId}
          onView={handleViewDetails}
          onDeleted={refresh}
        />
      );
    },
    [handleViewDetails, refresh]
  );

  const columns = useRepeatingTableColumns({
    fields: fieldsToDisplay,
    schemaForColumns: schemaForColumns || null,
    columnWidths,
    renderActionCell: actionCellRenderer,
    getRowId: (row) => row?.id,
  });

  const sortingEnabled = tableProps.sortingEnabled ?? true;
  const paginationEnabled = tableProps.paginationEnabled ?? (sectionData.length > 10);
  const paginationPageSize = tableProps.paginationPageSize || 25;
  const alwaysShowPagination = tableProps.alwaysShowPagination ?? false;
  const isLoading = isLoadingRelations || (isRelationBased && isLoadingTargetSchema);

  const tableConfig: TableConfig = useMemo(
    () => ({
      id: `table-${config.sectionId}`,
      columns,
      data: sectionData,
      pagination: {
        enabled: paginationEnabled,
        pageSize: paginationPageSize,
        showPageSizeSelector: true,
        pageSizeOptions: [5, 10, 25, 50],
        alwaysShow: alwaysShowPagination,
      },
      sorting: {
        enabled: sortingEnabled,
      },
      filtering: {
        enabled: false,
      },
      selection: {
        enabled: false,
      },
      emptyState: {
        message: isRelationBased
          ? config.title
            ? `No ${config.title.toLowerCase()} found`
            : 'No items found'
          : 'No items found',
      },
      loading: isLoading,
      striped: true,
      hoverable: true,
      bordered: true,
    }),
    [
      alwaysShowPagination,
      columns,
      config.sectionId,
      config.title,
      isLoading,
      isRelationBased,
      paginationEnabled,
      paginationPageSize,
      sectionData,
      sortingEnabled,
    ]
  );

  const isSmallScreen = useResponsiveCards();
  const shouldShowCards = isSmallScreen;

  const colSpan = config.colSpan || 1;
  const title = config.title || (isRelationBased ? targetSchemaData?.plural_name || 'Related Items' : section?.title);
  const description = config.description || (isRelationBased ? undefined : section?.description);

  const relationDirections = relationInfo.directions;
  const relationTypeTexts = relationInfo.relationTypeTexts;

  const shouldRender =
    isRelationBased || (section?.isRepeatingSection ?? false);

  if (!shouldRender) {
    return null;
  }

  return (
    <motion.div
      initial={disableAnimation ? false : { opacity: 0, y: 20 }}
      animate={disableAnimation ? false : { opacity: 1, y: 0 }}
      transition={disableAnimation ? {} : { duration: 0.3, delay: index * 0.1 }}
      className={cn(colSpan === 2 && 'lg:col-span-2', 'w-full min-w-0', className)}
    >
      <CardWrapper
        config={{
          id: `table-card-${config.sectionId}`,
          name: title || 'Table',
          styling: {
            variant: 'default',
            size: 'md',
          },
        }}
        className="h-auto bg-white border border-gray-200 shadow-sm"
      >
        <CardHeader className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</CardTitle>
              {showRefreshButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRefreshClick}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors duration-200 p-1.5"
                  aria-label="Refresh table"
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin text-violet-600')} />
                </Button>
              )}
              {isLoading ? (
                <Skeleton className="h-5 w-12 rounded-full" />
              ) : (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                  {sectionData.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isRelationBased && relationDirections.size > 0 && (
              <div className="flex flex-col items-end gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        {relationDirections.has('source') && (
                          <Badge variant="primary" size="sm">
                            <IconRenderer iconName="ArrowDown" className="h-3 w-3 me-1" />
                            Source
                          </Badge>
                        )}
                        {relationDirections.has('target') && (
                          <Badge variant="secondary" size="sm">
                            <IconRenderer iconName="ArrowUp" className="h-3 w-3 me-1" />
                            Target
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex items-center gap-1 text-xs text-gray-900 dark:text-gray-200">
                        {relationDirections.has('target') ? (
                          <>
                            <span>{targetSchemaData?.title || targetSchemaData?.plural_name || targetSchemaData?.name || config.targetSchema}</span>
                            <IconRenderer iconName="ArrowRight" className="h-3 w-3" />
                            <span>{schema.title || schema.plural_name || schema.name}</span>
                          </>
                        ) : (
                          <>
                            <span>{schema.title || schema.plural_name || schema.name}</span>
                            <IconRenderer iconName="ArrowRight" className="h-3 w-3" />
                            <span>{targetSchemaData?.title || targetSchemaData?.plural_name || targetSchemaData?.name || config.targetSchema}</span>
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {relationTypeTexts.length > 0 && (
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 text-end">
                    {relationTypeTexts.map((text, relationIndex) => (
                      <div key={`${text}-${relationIndex}`}>{text}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
          {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
        </CardHeader>
        <CardContent className="p-0">
          <TableWrapper
            tableConfig={tableConfig}
            columns={columns}
            data={sectionData}
            showCards={shouldShowCards}
            cardColumns={cardColumns}
            disableAnimation={disableAnimation}
            index={index}
            aggregations={aggregations}
            aggregationAlignment={aggregationAlignment}
            aggregationColumns={aggregationColumns}
            isLoading={isLoading}
          />
        </CardContent>
      </CardWrapper>
    </motion.div>
  );
};

DynamicRepeatingTableViewer.displayName = 'DynamicRepeatingTableViewer';

