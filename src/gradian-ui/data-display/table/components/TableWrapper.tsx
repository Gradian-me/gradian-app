import React, { useMemo } from 'react';
import { LoadingSkeleton } from '@/gradian-ui/layout/components';
import { Skeleton } from '@/components/ui/skeleton';
import { Table } from './Table';
import { TableAggregations, AggregationConfig } from './TableAggregations';
import { TableCardView } from '../../components/TableCardView';
import { TableColumn, TableConfig } from '../types';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { BadgeViewer } from '@/gradian-ui/form-builder/form-elements/utils/badge-viewer';
import { normalizeOptionArray } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { formatFieldValue } from '../utils/field-formatters';
import { cn } from '@/gradian-ui/shared/utils';
import { RoleBasedAvatar } from '@/gradian-ui/data-display/utils';

export interface TableWrapperProps<T = any> {
  tableConfig: TableConfig<T>;
  columns: TableColumn<T>[];
  data: T[];
  showCards: boolean;
  cardColumns?: 1 | 2 | 3;
  disableAnimation?: boolean;
  index?: number;
  aggregations?: AggregationConfig[];
  aggregationAlignment?: 'start' | 'center' | 'end';
  aggregationColumns?: 1 | 2 | 3;
  isLoading?: boolean;
  skeletonRowCount?: number;
  skeletonCardCount?: number;
  onRowClick?: (row: T, index: number) => void;
  highlightQuery?: string;
  schema?: FormSchema;
}

export function TableWrapper<T = any>({
  tableConfig,
  columns,
  data,
  showCards,
  cardColumns = 2,
  disableAnimation = false,
  index = 0,
  aggregations = [],
  aggregationAlignment = 'end',
  aggregationColumns = 3,
  isLoading = false,
  skeletonRowCount,
  skeletonCardCount,
  onRowClick,
  highlightQuery,
  schema,
}: TableWrapperProps<T>) {
  // Add dynamic columns for related-companies and status if schema supports them
  const enhancedColumns = useMemo(() => {
    const additionalColumns: TableColumn<T>[] = [];

    // Resolve avatar/icon/color fields from schema for avatar column
    const avatarField = schema?.fields?.find((f: any) => f.role === 'avatar');
    const iconField = schema?.fields?.find((f: any) => f.role === 'icon');
    const colorField = schema?.fields?.find((f: any) => f.role === 'color');
    const titleField = schema?.fields?.find((f: any) => f.role === 'title');

    const hasAvatarLikeConfig = Boolean(avatarField || iconField || colorField);

    // Add related-companies column if schema has canSelectMultiCompanies
    if (schema?.canSelectMultiCompanies) {
      additionalColumns.push({
        id: 'related-companies',
        label: 'Related Companies',
        accessor: (row: T) => (row as any)['related-companies'],
        sortable: false,
        align: 'left',
        maxWidth: 300,
        allowWrap: true,
        render: (value: any) => {
          if (!value || (Array.isArray(value) && value.length === 0)) {
            return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
          }
          const normalized = normalizeOptionArray(value);
          return (
            <BadgeViewer
              field={{
                id: 'related-companies',
                name: 'related-companies',
                component: 'picker',
                targetSchema: 'companies',
              } as any}
              value={normalized}
              badgeVariant="outline"
              enforceVariant={false}
              animate={true}
              maxBadges={3}
            />
          );
        },
      });
    }

    // Add status column if schema has statusGroup
    if (schema?.statusGroup && Array.isArray(schema.statusGroup) && schema.statusGroup.length > 0) {
      // Find the status field in schema to pass to formatter
      const statusField = schema.fields?.find((f: any) => f.name === 'status' || f.role === 'status');
      
      // Create field object with options from statusGroup
      const statusFieldWithOptions = statusField 
        ? { ...statusField, options: statusField.options || schema.statusGroup }
        : { id: 'status', name: 'status', role: 'status', options: schema.statusGroup };
      
      additionalColumns.push({
        id: 'status',
        label: 'Status',
        accessor: (row: T) => (row as any)['status'],
        sortable: false,
        align: 'left',
        maxWidth: 200,
        allowWrap: true,
        render: (value: any, row: T) => {
          if (!value || (Array.isArray(value) && value.length === 0)) {
            return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
          }
          // Use formatFieldValue to render status with pastel badge styling
          return formatFieldValue(
            statusFieldWithOptions,
            value,
            row,
            true,
            highlightQuery
          );
        },
      });
    }

    // Add entity type column if schema has entityTypeGroup
    if (schema?.entityTypeGroup && Array.isArray(schema.entityTypeGroup) && schema.entityTypeGroup.length > 0) {
      // Find the entityType field in schema to pass to formatter
      const entityTypeField = schema.fields?.find((f: any) => f.name === 'entityType' || f.role === 'entityType');
      
      // Create field object with options from entityTypeGroup
      const entityTypeFieldWithOptions = entityTypeField
        ? { ...entityTypeField, options: entityTypeField.options || schema.entityTypeGroup }
        : { id: 'entityType', name: 'entityType', role: 'entityType', options: schema.entityTypeGroup };
      
      additionalColumns.push({
        id: 'entityType',
        label: 'Entity Type',
        accessor: (row: T) => (row as any)['entityType'],
        sortable: false,
        align: 'left',
        maxWidth: 200,
        allowWrap: true,
        render: (value: any, row: T) => {
          if (!value || (Array.isArray(value) && value.length === 0)) {
            return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
          }
          // Use formatFieldValue to render entity type with pastel badge styling
          return formatFieldValue(
            entityTypeFieldWithOptions,
            value,
            row,
            true,
            highlightQuery
          );
        },
      });
    }

    // Add assigned to column if schema allows it
    if (schema?.allowDataAssignedTo) {
      // Find the assignedTo field in schema to pass to formatter
      const assignedToField = schema.fields?.find((f: any) => f.name === 'assignedTo' || (f.role === 'person' && f.name === 'assignedTo'));
      
      // Create field object with person role - ensure role is explicitly set
      const assignedToFieldWithRole = assignedToField
        ? { ...assignedToField, role: 'person', name: 'assignedTo' }
        : { id: 'assignedTo', name: 'assignedTo', role: 'person', component: 'picker', targetSchema: 'users', label: 'Assigned To' };
      
      additionalColumns.push({
        id: 'assignedTo',
        label: 'Assigned To',
        accessor: (row: T) => (row as any)['assignedTo'],
        sortable: false,
        align: 'left',
        maxWidth: 250,
        allowWrap: true,
        field: assignedToFieldWithRole,
        render: (value: any, row: T) => {
          if (!value || (Array.isArray(value) && value.length === 0)) {
            return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
          }
          // Use formatFieldValue to render assigned to with avatar and label
          return formatFieldValue(
            assignedToFieldWithRole,
            value,
            row,
            true,
            highlightQuery
          );
        },
      });
    }

    // Build a working copy of base columns and optionally hide icon/color when avatar column is present
    let baseColumns = [...columns];
    
    // Check if dueDate column already exists in baseColumns - if so, we'll remove it and add to additionalColumns in correct position
    const dueDateColumnIndex = baseColumns.findIndex((col) => col.id === 'dueDate' || col.field?.name === 'dueDate');
    let dueDateColumn: TableColumn<T> | null = null;
    
    if (dueDateColumnIndex !== -1) {
      // Extract the existing dueDate column
      dueDateColumn = baseColumns[dueDateColumnIndex];
      // Remove it from baseColumns (we'll add it to additionalColumns in the correct position)
      baseColumns = baseColumns.filter((_, index) => index !== dueDateColumnIndex);
    }

    if (hasAvatarLikeConfig) {
      const iconFieldIds =
        schema?.fields
          ?.filter((f: any) => f.role === 'icon' || f.name === 'icon')
          .map((f: any) => f.id) ?? [];
      const colorFieldIds =
        schema?.fields
          ?.filter((f: any) => f.role === 'color' || f.name === 'color')
          .map((f: any) => f.id) ?? [];

      const hiddenIds = new Set<string>([...iconFieldIds, ...colorFieldIds]);
      if (hiddenIds.size > 0) {
        baseColumns = baseColumns.filter((col) => !hiddenIds.has(col.id as string));
      }
    }

    // Add due date column if schema allows it (after assignedTo)
    if (schema?.allowDataDueDate) {
      const dueDateField = schema.fields?.find((f: any) => f.name === 'dueDate' || (f.role === 'duedate' && f.name === 'dueDate'));
      
      // Create field object with duedate role - ensure role is explicitly set
      const dueDateFieldWithRole = dueDateField
        ? { ...dueDateField, role: 'duedate', name: 'dueDate' }
        : { 
            id: 'dueDate', 
            name: 'dueDate', 
            role: 'duedate', 
            component: 'date',
            label: 'Due Date'
          };
      
      // Use existing column if we extracted it, otherwise create a new one
      const dueDateCol: TableColumn<T> = dueDateColumn || {
        id: 'dueDate',
        label: 'Due Date',
        accessor: (row: T) => (row as any)['dueDate'],
        sortable: false,
        align: 'left',
        maxWidth: 200,
        allowWrap: true,
      };
      
      // Ensure the column has the correct field and render function
      additionalColumns.push({
        ...dueDateCol,
        field: dueDateFieldWithRole,
            render: (value: any, row: T) => {
              if (!value || value === '' || value === null || value === undefined) {
                return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
              }
          return formatFieldValue(dueDateFieldWithRole, value, row, true, highlightQuery);
            },
      });
    } else if (dueDateColumn) {
      // If schema doesn't allow dueDate but we extracted a column, add it back to baseColumns
      baseColumns.push(dueDateColumn);
    }

    // Add avatar column if schema has avatar/icon/color configuration
    if (hasAvatarLikeConfig) {
      const avatarColumn: TableColumn<T> = {
        id: 'avatar',
        label: '',
        accessor: (row: T) => row,
        sortable: false,
        align: 'left',
        maxWidth: 56,
        width: 56,
        allowWrap: false,
        render: (_value: any, row: any) => {
          return (
            <div className="flex items-center justify-center">
              <RoleBasedAvatar
                schema={schema || undefined}
                data={row}
                size="sm"
                showBorder={true}
                showShadow={true}
              />
            </div>
          );
        },
      };

      additionalColumns.push(avatarColumn);
    }

    // Find actions and force column indices to insert after them at the start
    const actionsColumnIndex = baseColumns.findIndex((col) => col.id === 'actions');
    const forceColumnIndex = baseColumns.findIndex((col) => col.id === 'force');
    
    if (additionalColumns.length > 0) {
      const newColumns = [...baseColumns];
      
      // Determine insertion point: after force if it exists, otherwise after actions if it exists, otherwise at start
      let insertIndex = 0;
      
      if (forceColumnIndex !== -1) {
        // Insert after force column
        insertIndex = forceColumnIndex + 1;
      } else if (actionsColumnIndex !== -1) {
        // Insert after actions column
        insertIndex = actionsColumnIndex + 1;
      } else {
        // Insert at the start
        insertIndex = 0;
      }
      
      newColumns.splice(insertIndex, 0, ...additionalColumns);
      return newColumns;
    }

    // If no additional columns, return as is
    return baseColumns;
  }, [columns, schema, highlightQuery]);

  // Update tableConfig with enhanced columns
  const enhancedTableConfig = useMemo(() => ({
    ...tableConfig,
    columns: enhancedColumns,
  }), [tableConfig, enhancedColumns]);

  const effectiveColumnCount = Math.max(
    1,
    enhancedTableConfig.columns?.length || enhancedColumns.length || 4
  );

  const effectiveRowCount = skeletonRowCount || 2;
  const effectiveCardCount = skeletonCardCount || Math.min(6, Math.max(3, data.length || effectiveRowCount));

  if (isLoading) {
    return (
      <>
        {showCards ? (
          <TableCardSkeleton count={effectiveCardCount} columnCount={effectiveColumnCount} cardColumns={cardColumns} />
        ) : (
          <LoadingSkeleton variant="table" count={effectiveRowCount} />
        )}
        {aggregations.length > 0 && (
          <AggregationSkeleton count={aggregations.length} gridColumns={aggregationColumns} />
        )}
      </>
    );
  }

  return (
    <>
      {showCards ? (
        <>
          <TableCardView
            data={data}
            columns={enhancedColumns}
            cardColumns={cardColumns}
            disableAnimation={disableAnimation}
            index={index}
          />
          {aggregations.length > 0 && (
            <TableAggregations
              data={data}
              columns={enhancedColumns}
              aggregations={aggregations}
              alignment={aggregationAlignment}
              gridColumns={aggregationColumns}
            />
          )}
        </>
      ) : (
        <>
          <div className="mx-0 min-w-0">
            <Table config={enhancedTableConfig} onRowClick={onRowClick} highlightQuery={highlightQuery} />
          </div>
          {aggregations.length > 0 && (
            <TableAggregations
              data={data}
              columns={enhancedColumns}
              aggregations={aggregations}
              alignment={aggregationAlignment}
              gridColumns={aggregationColumns}
            />
          )}
        </>
      )}
    </>
  );
}

TableWrapper.displayName = 'TableWrapper';



interface TableCardSkeletonProps {
  count: number;
  columnCount: number;
  cardColumns: 1 | 2 | 3;
}

function TableCardSkeleton({ count, columnCount, cardColumns }: TableCardSkeletonProps) {
  // Limit skeleton columns to a maximum of 4 for cleaner appearance
  const skeletonColumnCount = Math.min(columnCount, 7);
  const columnsPerRow = Math.min(skeletonColumnCount, cardColumns * 2);
  return (
    <div className="grid grid-cols-1 gap-3 p-2 lg:p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`card-${index}`}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, columnsPerRow)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: skeletonColumnCount }).map((_, colIndex) => (
              <div key={`card-cell-${index}-${colIndex}`} className="flex items-center">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AggregationSkeletonProps {
  count: number;
  gridColumns: 1 | 2 | 3;
}

function AggregationSkeleton({ count, gridColumns }: AggregationSkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
      >
        {items.map((_, index) => (
          <div
            key={`aggregation-${index}`}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3"
          >
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}


