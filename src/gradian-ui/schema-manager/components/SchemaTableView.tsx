'use client';

import { useMemo } from 'react';
import { TableWrapper, TableConfig, TableColumn } from '@/gradian-ui/data-display/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilRuler, LayoutList, Trash2, Database, Users2, Circle, Hash, FileText, Clock } from 'lucide-react';
import { FormSchema } from '../types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { DEFAULT_LIMIT } from '@/gradian-ui/shared/utils/pagination-utils';
import { getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

interface SchemaTableViewProps {
  schemas: FormSchema[];
  onEdit: (schema: FormSchema) => void;
  onView: (schema: FormSchema) => void;
  onDelete: (schema: FormSchema) => void;
  isLoading?: boolean;
  /**
   * When true, show statistics (partition/index/records) instead of description
   * when statistics are available on the schema.
   */
  showStatistics?: boolean;
}

export function SchemaTableView({
  schemas,
  onEdit,
  onView,
  onDelete,
  isLoading = false,
  showStatistics = false,
}: SchemaTableViewProps) {
  const tableColumns = useMemo<TableColumn<FormSchema>[]>(() => [
    {
      id: 'actions',
      label: getT(TRANSLATION_KEYS.LABEL_ACTIONS, 'en', 'en'),
      accessor: 'id',
      sortable: false,
      align: 'center',
      width: 140,
      render: (_value: any, row: FormSchema) => {
        const isActionForm = row.schemaType === 'action-form';
        return (
          <div className="flex items-center justify-center gap-1">
            {!isActionForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.button === 1 || e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    window.open(`/page/${row.id}`, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  onView(row);
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`/page/${row.id}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`/page/${row.id}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="h-8 w-8 p-0 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                title="View List (Ctrl+Click or Middle-Click to open in new tab)"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (e.button === 1 || e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  window.open(`/builder/schemas/${row.id}`, '_blank', 'noopener,noreferrer');
                  return;
                }
                onEdit(row);
              }}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`/builder/schemas/${row.id}`, '_blank', 'noopener,noreferrer');
                }
              }}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`/builder/schemas/${row.id}`, '_blank', 'noopener,noreferrer');
                }
              }}
              className="h-8 w-8 p-0 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 dark:hover:border-violet-600 dark:hover:bg-violet-900/30 dark:hover:text-violet-100"
              title="Edit Schema"
            >
              <PencilRuler className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row);
              }}
              className="h-8 w-8 p-0 transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-800 dark:hover:border-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-100"
              title="Delete Schema"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      id: 'icon',
      label: '',
      accessor: 'icon',
      sortable: false,
      align: 'center',
      width: 50,
      render: (_value: any, row: FormSchema) => {
        if (!row.icon) return null;
        return (
          <IconRenderer 
            iconName={row.icon} 
            className={`h-5 w-5 ${row.inactive ? 'text-gray-400' : 'text-violet-600 dark:text-violet-300'}`} 
          />
        );
      },
    },
    {
      id: 'plural_name',
      label: 'Name',
      accessor: 'plural_name',
      sortable: true,
      align: 'left',
      minWidth: 200,
      render: (_value: any, row: FormSchema) => {
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${row.inactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {row.plural_name}
            </span>
            {row.inactive && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-600">
                Inactive
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'relatedTenants',
      label: 'Tenants',
      accessor: 'relatedTenants',
      sortable: true,
      align: 'left',
      minWidth: 160,
      render: (_value: any, row: FormSchema) => {
        if (row.applyToAllTenants) {
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <Users2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-emerald-700 dark:text-emerald-300'}>
                All tenants
              </span>
            </div>
          );
        }

        const tenants = row.relatedTenants || [];
        if (!tenants.length) {
          return (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Not set
            </span>
          );
        }

        const primary = tenants[0];
        const extraCount = tenants.length - 1;

        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Users2 className="h-3.5 w-3.5 text-gray-400" />
            <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
              {primary.label || primary.id}
              {extraCount > 0 && (
                <span className="text-gray-400 dark:text-gray-500">
                  {` +${extraCount}`}
                </span>
              )}
          </span>
          </div>
        );
      },
    },
    {
      id: 'syncStrategy',
      label: 'Sync Strategy',
      accessor: 'syncStrategy',
      sortable: true,
      align: 'left',
      minWidth: 140,
      render: (_value: any, row: FormSchema) => {
        const strategy = row.syncStrategy || 'schema-only';
        const isSchemaOnly = strategy === 'schema-only';

        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Database className={`h-3.5 w-3.5 ${isSchemaOnly ? 'text-blue-500' : 'text-purple-500'}`} />
            <span className={row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
              {isSchemaOnly ? 'Schema only' : 'Schema & data'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'description',
      label: 'Description',
      accessor: (row: FormSchema) => {
        // For sorting: use records count if statistics are available, otherwise use description
        if (row.statistics?.records !== undefined) {
          return row.statistics.records;
        }
        return row.description || '';
      },
      sortable: true,
      align: 'left',
      minWidth: 200,
      render: (_value: any, row: FormSchema) => {
        // Show statistics if enabled and available, otherwise show description
        if (showStatistics && row.statistics) {
          const stats = row.statistics as { hasPartition?: boolean; isIndexed?: boolean; records?: number; size?: number; maxUpdatedAt?: string | null };
          
          // Format maxUpdatedAt for display with friendly relative time
          const formatDate = (dateString: string | null | undefined): string => {
            if (!dateString) return 'N/A';
            try {
              const date = new Date(dateString);
              if (isNaN(date.getTime())) return 'N/A';
              
              const now = new Date();
              const diffMs = now.getTime() - date.getTime();
              
              // Handle future dates - show absolute date
              if (diffMs < 0) {
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }
              
              const diffSeconds = Math.floor(diffMs / 1000);
              const diffMinutes = Math.floor(diffSeconds / 60);
              const diffHours = Math.floor(diffMinutes / 60);
              const diffDays = Math.floor(diffHours / 24);
              const diffWeeks = Math.floor(diffDays / 7);
              
              // Calculate months more accurately
              const yearsDiff = now.getFullYear() - date.getFullYear();
              const monthsDiff = now.getMonth() - date.getMonth();
              const daysDiff = now.getDate() - date.getDate();
              let totalMonths = yearsDiff * 12 + monthsDiff;
              // Adjust if the day hasn't passed yet this month
              if (daysDiff < 0) {
                totalMonths -= 1;
              }
              
              // Calculate years
              const diffYears = Math.floor(totalMonths / 12);
              
              // Show relative time - ensure consistent friendly format
              if (diffSeconds < 60) {
                return 'Just now';
              } else if (diffMinutes < 60) {
                return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
              } else if (diffHours < 24) {
                return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
              } else if (diffDays < 7) {
                return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
              } else if (diffWeeks < 4) {
                return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
              } else if (totalMonths > 0 && totalMonths < 12) {
                return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'} ago`;
              } else if (diffYears > 0 && diffYears < 2) {
                return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
              } else if (diffYears >= 2) {
                // Only show absolute date for dates 2+ years old
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              } else {
                // Fallback: if totalMonths is 0 or negative but we have days, show days/weeks
                if (diffDays >= 7) {
                  return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
                } else if (diffDays > 0) {
                  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                } else {
                  // Last resort: show absolute date
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                }
              }
            } catch {
              return 'N/A';
            }
          };
          
          // Format full date for tooltip
          const formatFullDate = (dateString: string | null | undefined): string => {
            if (!dateString) return 'N/A';
            try {
              const date = new Date(dateString);
              if (isNaN(date.getTime())) return 'N/A';
              // Format as: "MMM DD, YYYY at HH:MM AM/PM" (e.g., "Jan 15, 2024 at 2:30 PM")
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });
            } catch {
              return 'N/A';
            }
          };
          
          return (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Records count - First for sorting */}
              <div className="flex items-center gap-1.5" title={`${stats.records || 0} records`}>
                <FileText className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{stats.records ?? 0}</span>
              </div>
              {/* Size in MB */}
              {stats.size !== undefined && (
                <div className="flex items-center gap-1.5" title={`${stats.size} MB`}>
                  <Database className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{stats.size.toFixed(2)} MB</span>
                </div>
              )}
              {/* Partition indicator */}
              <div className="flex items-center gap-1.5" title={stats.hasPartition ? 'Has Partition' : 'No Partition'}>
                <Circle 
                  className={`h-3 w-3 ${stats.hasPartition ? 'fill-emerald-500 text-emerald-500' : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'}`} 
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">Partition</span>
              </div>
              {/* Index indicator */}
              <div className="flex items-center gap-1.5" title={stats.isIndexed ? 'Indexed' : 'Not Indexed'}>
                <Hash 
                  className={`h-3.5 w-3.5 ${stats.isIndexed ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'}`} 
                />
                <Circle 
                  className={`h-3 w-3 ${stats.isIndexed ? 'fill-blue-500 text-blue-500' : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'}`} 
                />
              </div>
            </div>
          );
        }
        return (
          <span className={`text-sm line-clamp-2 ${row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
            {row.description || '-'}
            </span>
        );
      },
    },
    {
      id: 'maxUpdatedAt',
      label: 'Last Updated',
      accessor: (row: FormSchema) => {
        // For sorting: use timestamp if maxUpdatedAt is available
        const maxUpdatedAt = row.statistics?.maxUpdatedAt;
        if (maxUpdatedAt) {
          const date = new Date(maxUpdatedAt);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        }
        return 0; // Put items without maxUpdatedAt at the end
      },
      sortable: true,
      align: 'left',
      minWidth: 140,
      render: (_value: any, row: FormSchema) => {
        const maxUpdatedAt = row.statistics?.maxUpdatedAt;
        
        // Format maxUpdatedAt for display with friendly relative time
        const formatDate = (dateString: string | null | undefined): string => {
          if (!dateString) return 'N/A';
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            
            // Handle future dates - show as "in X time" format
            // Also handle cases where date is very close to now (within 5 minutes) due to clock skew
            if (diffMs < 0) {
              const absDiffMs = Math.abs(diffMs);
              const absDiffSeconds = Math.floor(absDiffMs / 1000);
              const absDiffMinutes = Math.floor(absDiffSeconds / 60);
              const absDiffHours = Math.floor(absDiffMinutes / 60);
              const absDiffDays = Math.floor(absDiffHours / 24);
              
              // If date is very close to now (within 5 minutes), treat as "just now" to handle clock skew
              if (absDiffMinutes < 5) {
                return 'Just now';
              }
              
              // For very recent future dates (same day), show hours/minutes instead of "in 0 days"
              if (absDiffDays === 0) {
                if (absDiffHours > 0) {
                  return `in ${absDiffHours} ${absDiffHours === 1 ? 'hour' : 'hours'}`;
                } else if (absDiffMinutes > 0) {
                  return `in ${absDiffMinutes} ${absDiffMinutes === 1 ? 'minute' : 'minutes'}`;
                } else {
                  return 'Just now';
                }
              } else if (absDiffDays < 7) {
                return `in ${absDiffDays} ${absDiffDays === 1 ? 'day' : 'days'}`;
              } else {
                // For future dates more than a week away, show absolute date
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }
            }
            
            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMinutes = Math.floor(diffSeconds / 60);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);
            const diffWeeks = Math.floor(diffDays / 7);
            
            // Calculate months more accurately
            const yearsDiff = now.getFullYear() - date.getFullYear();
            const monthsDiff = now.getMonth() - date.getMonth();
            const daysDiff = now.getDate() - date.getDate();
            let totalMonths = yearsDiff * 12 + monthsDiff;
            // Adjust if the day hasn't passed yet this month
            if (daysDiff < 0) {
              totalMonths -= 1;
            }
            
            // Calculate years
            const diffYears = Math.floor(totalMonths / 12);
            
            // Show relative time - always use friendly format for past dates
            if (diffSeconds < 60) {
              return 'Just now';
            } else if (diffMinutes < 60) {
              return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
            } else if (diffHours < 24) {
              return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
            } else if (diffDays < 7) {
              return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            } else if (diffWeeks < 4) {
              return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
            } else if (totalMonths > 0 && totalMonths < 12) {
              return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'} ago`;
            } else if (diffYears > 0 && diffYears < 2) {
              return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
            } else if (diffYears >= 2) {
              // Only show absolute date for dates 2+ years old
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            } else {
              // Fallback: if totalMonths is 0 or negative but we have days, show days/weeks
              if (diffDays >= 7) {
                return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
              } else if (diffDays > 0) {
                return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
              } else {
                // Last resort: show absolute date
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }
            }
          } catch {
            return 'N/A';
          }
        };
        
        // Format full date for tooltip
        const formatFullDate = (dateString: string | null | undefined): string => {
          if (!dateString) return 'N/A';
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            // Format as: "MMM DD, YYYY at HH:MM AM/PM" (e.g., "Jan 15, 2024 at 2:30 PM")
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
          } catch {
            return 'N/A';
          }
        };
        
        if (maxUpdatedAt !== undefined && maxUpdatedAt !== null) {
          return (
            <div className="flex items-center gap-1.5" title={formatFullDate(maxUpdatedAt)}>
              <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              <span className={`text-xs ${row.inactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
                {formatDate(maxUpdatedAt)}
              </span>
            </div>
          );
        }
        
        return (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            N/A
            </span>
        );
      },
    },
    {
      id: 'id',
      label: 'Schema ID',
      accessor: 'id',
      sortable: true,
      align: 'left',
      minWidth: 150,
      render: (_value: any, row: FormSchema) => {
        return (
          <code className={`text-xs px-2 py-1 rounded bg-violet-100 dark:bg-violet-900/30 ${
            row.inactive ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-violet-200'
          }`}>
            {row.id}
          </code>
        );
      },
    },
  ], [onEdit, onView, onDelete, showStatistics]);

  const tableConfig: TableConfig<FormSchema> = useMemo(
    () => ({
      id: 'schemas-table',
      columns: tableColumns,
      data: schemas,
      pagination: {
        enabled: schemas.length > 10,
        pageSize: DEFAULT_LIMIT,
        showPageSizeSelector: true,
        pageSizeOptions: [5, 10, 25, 50],
        alwaysShow: false,
      },
      sorting: {
        enabled: true,
        ...(showStatistics && {
          defaultSort: {
            columnId: 'maxUpdatedAt',
            direction: 'desc',
          },
        }),
      },
      filtering: {
        enabled: false,
      },
      selection: {
        enabled: false,
      },
      emptyState: {
        message: 'No schemas found',
      },
      loading: isLoading,
      striped: true,
      hoverable: true,
      bordered: true,
    }),
    [schemas, tableColumns, isLoading, showStatistics]
  );

  return (
    <div className="w-full">
      <TableWrapper
        tableConfig={tableConfig}
        columns={tableColumns}
        data={schemas}
        showCards={false}
        disableAnimation={false}
        index={0}
        isLoading={isLoading}
      />
    </div>
  );
}

