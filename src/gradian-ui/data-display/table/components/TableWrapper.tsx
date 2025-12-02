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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/gradian-ui/data-display/utils';
import { cn } from '@/gradian-ui/shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

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
            statusField || { id: 'status', name: 'status', role: 'status' },
            value,
            row
          );
        },
      });
    }

    // Build a working copy of base columns and optionally hide icon/color when avatar column is present
    let baseColumns = [...columns];

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
          // Resolve label for initials
          const avatarLabel =
            (avatarField && row?.[avatarField.name]) ??
            (titleField && row?.[titleField.name]) ??
            row?.name ??
            '';

          const initials = getInitials(avatarLabel || 'A');

          // Resolve icon from row if icon role/field is present
          const iconValue =
            (iconField && row?.[iconField.name]) ??
            row?.icon ??
            undefined;

          // Resolve Tailwind color id from row (role color)
          const rawColor = (colorField && row?.[colorField.name]) || row?.color || null;
          const resolvedColorId =
            typeof rawColor === 'string' ? rawColor.toLowerCase() : undefined;

          const colorMap: Record<string, { bg: string; text: string; border: string }> = {
            violet: {
              bg: 'bg-violet-50 dark:bg-violet-500/15',
              text: 'text-violet-700 dark:text-violet-100',
              border: 'border-violet-100 dark:border-violet-500/40',
            },
            emerald: {
              bg: 'bg-emerald-50 dark:bg-emerald-500/15',
              text: 'text-emerald-700 dark:text-emerald-100',
              border: 'border-emerald-100 dark:border-emerald-500/40',
            },
            indigo: {
              bg: 'bg-indigo-50 dark:bg-indigo-500/15',
              text: 'text-indigo-700 dark:text-indigo-100',
              border: 'border-indigo-100 dark:border-indigo-500/40',
            },
            blue: {
              bg: 'bg-blue-50 dark:bg-blue-500/15',
              text: 'text-blue-700 dark:text-blue-100',
              border: 'border-blue-100 dark:border-blue-500/40',
            },
            green: {
              bg: 'bg-green-50 dark:bg-green-500/15',
              text: 'text-green-700 dark:text-green-100',
              border: 'border-green-100 dark:border-green-500/40',
            },
            red: {
              bg: 'bg-red-50 dark:bg-red-500/15',
              text: 'text-red-700 dark:text-red-100',
              border: 'border-red-100 dark:border-red-500/40',
            },
            orange: {
              bg: 'bg-orange-50 dark:bg-orange-500/15',
              text: 'text-orange-700 dark:text-orange-100',
              border: 'border-orange-100 dark:border-orange-500/40',
            },
            amber: {
              bg: 'bg-amber-50 dark:bg-amber-500/15',
              text: 'text-amber-700 dark:text-amber-100',
              border: 'border-amber-100 dark:border-amber-500/40',
            },
            yellow: {
              bg: 'bg-yellow-50 dark:bg-yellow-500/15',
              text: 'text-yellow-700 dark:text-yellow-100',
              border: 'border-yellow-100 dark:border-yellow-500/40',
            },
            pink: {
              bg: 'bg-pink-50 dark:bg-pink-500/15',
              text: 'text-pink-700 dark:text-pink-100',
              border: 'border-pink-100 dark:border-pink-500/40',
            },
            purple: {
              bg: 'bg-purple-50 dark:bg-purple-500/15',
              text: 'text-purple-700 dark:text-purple-100',
              border: 'border-purple-100 dark:border-purple-500/40',
            },
            teal: {
              bg: 'bg-teal-50 dark:bg-teal-500/15',
              text: 'text-teal-700 dark:text-teal-100',
              border: 'border-teal-100 dark:border-teal-500/40',
            },
            cyan: {
              bg: 'bg-cyan-50 dark:bg-cyan-500/15',
              text: 'text-cyan-700 dark:text-cyan-100',
              border: 'border-cyan-100 dark:border-cyan-500/40',
            },
            stone: {
              bg: 'bg-stone-50 dark:bg-stone-500/15',
              text: 'text-stone-700 dark:text-stone-100',
              border: 'border-stone-100 dark:border-stone-500/40',
            },
            neutral: {
              bg: 'bg-neutral-50 dark:bg-neutral-500/15',
              text: 'text-neutral-700 dark:text-neutral-100',
              border: 'border-neutral-100 dark:border-neutral-500/40',
            },
            gray: {
              bg: 'bg-gray-50 dark:bg-gray-500/15',
              text: 'text-gray-700 dark:text-gray-100',
              border: 'border-gray-100 dark:border-gray-500/40',
            },
            slate: {
              bg: 'bg-slate-50 dark:bg-slate-500/15',
              text: 'text-slate-700 dark:text-slate-100',
              border: 'border-slate-100 dark:border-slate-500/40',
            },
          };

          const colorKey =
            resolvedColorId && colorMap[resolvedColorId] ? resolvedColorId : 'violet';
          const avatarColor = colorMap[colorKey];

          return (
            <div className="flex items-center justify-center">
              <Avatar
                className={cn(
                  'h-8 w-8 rounded-full border shadow-sm flex items-center justify-center font-semibold',
                  avatarColor.bg,
                  avatarColor.text,
                  avatarColor.border,
                )}
              >
                <AvatarFallback
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs',
                    avatarColor.bg,
                    avatarColor.text,
                  )}
                >
                  {iconValue ? (
                    <IconRenderer
                      iconName={typeof iconValue === 'string' ? iconValue : String(iconValue)}
                      className="h-3 w-3"
                    />
                  ) : (
                    initials
                  )}
                </AvatarFallback>
              </Avatar>
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
  }, [columns, schema]);

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


