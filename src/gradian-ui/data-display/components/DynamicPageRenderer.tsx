'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Building,
  CheckCircle,
  Clock,
  Plus,
  Star
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/gradian-ui/form-builder/form-elements';
import { DynamicActionButtons } from './DynamicActionButtons';
import { DynamicCardRenderer } from './DynamicCardRenderer';
import { DynamicCardDialog } from './DynamicCardDialog';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { GoToTop } from '@/gradian-ui/layout/go-to-top/components/GoToTop';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { DynamicFilterPane } from '@/gradian-ui/shared/components';
import { asFormSchema } from '@/gradian-ui/schema-manager/utils/schema-utils';
import { useDynamicEntity } from '@/gradian-ui/shared/hooks';
import { FormModal } from '../../form-builder';
import { ConfirmationMessage } from '../../form-builder';
import { getValueByRole, getSingleValueByRole } from '../../form-builder/form-elements/utils/field-resolver';
import { LoadingSkeleton } from '@/gradian-ui/layout/components';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { useCompanyStore } from '@/stores/company.store';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ImageText } from '../../form-builder/form-elements';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { useCompanies } from '@/gradian-ui/shared/hooks/use-companies';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { debounce } from '@/gradian-ui/shared/utils';
import { toast } from 'sonner';
import { buildHierarchyTree } from '@/gradian-ui/schema-manager/utils/hierarchy-utils';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';
import { TableWrapper, TableConfig, buildTableColumns, TableColumn } from '@/gradian-ui/data-display/table';
import { AssignmentSwitcher } from '@/gradian-ui/data-display/task-management/components/AssignmentSwitcher';
import { useAssignmentSwitcher } from '@/gradian-ui/data-display/task-management/hooks/useAssignmentSwitcher';
import { DynamicPagination } from './DynamicPagination';
import { HierarchyView } from '@/gradian-ui/data-display/hierarchy/HierarchyView';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';
import { syncParentRelation } from '@/gradian-ui/shared/utils/parent-relation.util';
import { getParentIdFromEntity } from '@/gradian-ui/schema-manager/utils/hierarchy-utils';
import { DEFAULT_LIMIT } from '@/gradian-ui/shared/utils/pagination-utils';
import { RepeatingSectionDialog } from './RepeatingSectionDialog';
import { RepeatingSectionButton } from './RepeatingSectionButton';
import { Table2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { EntityMetadata } from './CreateUpdateDetail';
import { normalizeCreateUpdateDates } from './CreateUpdateDetail';
import { formatCreatedLabel, formatRelativeTime, formatFullDate } from '@/gradian-ui/shared/utils/date-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '../utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SortConfig } from '@/gradian-ui/shared/utils/sort-utils';

interface DynamicPageRendererProps {
  schema: FormSchema;
  entityName: string;
  navigationSchemas?: FormSchema[];
}

/**
 * Reconstruct RegExp objects from serialized schema
 */
function reconstructRegExp(obj: any): any {
  if (obj && typeof obj === 'object') {
    // Check if this is a serialized RegExp
    if (obj.__regexp === true && obj.source) {
      return new RegExp(obj.source, obj.flags || '');
    }
    
    // Recursively process arrays
    if (Array.isArray(obj)) {
      return obj.map(item => reconstructRegExp(item));
    }
    
    // Recursively process objects
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = reconstructRegExp(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

export function DynamicPageRenderer({ schema: rawSchema, entityName, navigationSchemas }: DynamicPageRendererProps) {
  const router = useRouter();
  // Reconstruct RegExp objects in the schema
  const schema = reconstructRegExp(rawSchema) as FormSchema;
  const reconstructedNavigationSchemas = useMemo(
    () => (navigationSchemas ?? []).map((navSchema) => reconstructRegExp(navSchema) as FormSchema),
    [navigationSchemas]
  );

  const pluralName = schema.plural_name || schema.title || schema.name || `${entityName}s`;
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const previousTitle = document.title;
    const schemaTitle = schema.plural_name || schema.title || schema.name || 'Listing';
    document.title = `${schemaTitle} | Gradian`;

    return () => {
      document.title = previousTitle;
    };
  }, [schema.plural_name, schema.title, schema.name]);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table' | 'hierarchy'>(
    schema?.allowHierarchicalParent === true ? 'hierarchy' : 'table'
  );

  // Prevent hierarchy view if not enabled
  const handleViewModeChange = useCallback((mode: 'grid' | 'list' | 'table' | 'hierarchy') => {
    if (mode === 'hierarchy' && schema?.allowHierarchicalParent !== true) {
      // If hierarchy is not enabled, switch to table view instead
      setViewMode('table');
      return;
    }
    setViewMode(mode);
  }, [schema?.allowHierarchicalParent]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditLoading, setIsEditLoading] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedEntityForDetail, setSelectedEntityForDetail] = useState<any | null>(null);
  const [searchTermLocal, setSearchTermLocal] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    entity: any | null;
  }>({ open: false, entity: null });
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [fixedParentForCreate, setFixedParentForCreate] = useState<any | null>(null);
  const [hierarchyExpandToken, setHierarchyExpandToken] = useState(0);
  const [hierarchyCollapseToken, setHierarchyCollapseToken] = useState(0);
  const [changeParentPickerOpen, setChangeParentPickerOpen] = useState(false);
  const [entityForParentChange, setEntityForParentChange] = useState<any | null>(null);
  const [repeatingSectionDialog, setRepeatingSectionDialog] = useState<{
    isOpen: boolean;
    sectionId: string;
    sectionTitle: string;
    entityData: any;
    entityId?: string;
  }>({
    isOpen: false,
    sectionId: '',
    sectionTitle: '',
    entityData: null,
    entityId: undefined,
  });
  const [showMetadataColumns, setShowMetadataColumns] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  
  // State for companies data and grouping
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [companySchema, setCompanySchema] = useState<FormSchema | null>(null);

  // Pagination state - set initial page size based on view mode
  // Hierarchy view uses 500, other views use 50
  const initialPageSize = schema?.allowHierarchicalParent === true ? 500 : DEFAULT_LIMIT;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(initialPageSize);
  const prevViewModeRef = useRef<'grid' | 'list' | 'table' | 'hierarchy'>(viewMode);
  
  // Update page size when view mode changes
  useEffect(() => {
    // Only update if view mode actually changed
    if (prevViewModeRef.current !== viewMode) {
      if (viewMode === 'hierarchy') {
        // Set to 500 for hierarchy view (unless user selected 'all')
        if (pageSize !== 'all' && pageSize !== 500) {
          setPageSize(500);
        }
      } else {
        // Set to 50 for other views (unless user selected 'all' or a custom value)
        if (pageSize === 500) {
          setPageSize(DEFAULT_LIMIT);
        }
      }
      prevViewModeRef.current = viewMode;
    }
  }, [viewMode, pageSize]);

  // Use the dynamic entity hook for entity management
  const {
    entities,
    currentEntity,
    isLoading,
    error,
    selectedEntity,
    currentFilters,
    formState,
    paginationMeta,
    fetchEntities,
    fetchEntityById,
    createEntity,
    deleteEntity,
    setFilters,
    setCurrentEntity,
    clearError,
    handleSearch,
    handleFilterChange,
    handleDeleteEntity,
  } = useDynamicEntity(schema);

  const allowAssignmentSwitcher =
    schema?.allowAssignTo === true || schema?.allowDataAssignedTo === true;

  const [assignmentView, setAssignmentView] = useState<'assignedTo' | 'initiatedBy'>('assignedTo');
  const [assignmentCountsFromApi, setAssignmentCountsFromApi] = useState<{
    assignedToCount: number;
    initiatedByCount: number;
  } | null>(null);
  const [assignmentCountRefreshToken, setAssignmentCountRefreshToken] = useState(0);

  const {
    isEnabled: assignmentSwitcherEnabled,
    counts: assignmentCounts,
    selectedUser: assignmentSelectedUser,
    isUsingDefaultUser: isAssignmentUserDefault,
    handleUserOptionChange,
    resetToCurrentUser: resetAssignmentUser,
  } = useAssignmentSwitcher({
    isEnabled: allowAssignmentSwitcher,
    totalItems: paginationMeta?.totalItems ?? entities?.length ?? 0,
    countsFromApi: assignmentCountsFromApi,
    activeView: assignmentView,
    setActiveView: setAssignmentView,
  });

  // Reset to page 1 when filters change (but not when pagination changes)
  const prevFiltersRef = useRef<string>('');
  useEffect(() => {
    const filtersKey = JSON.stringify(currentFilters);
    if (prevFiltersRef.current !== filtersKey && prevFiltersRef.current !== '') {
      setCurrentPage(1);
    }
    prevFiltersRef.current = filtersKey;
  }, [currentFilters]);

  // Reset to page 1 when sort changes
  const prevSortRef = useRef<string>('');
  useEffect(() => {
    const sortKey = JSON.stringify(sortConfig);
    if (prevSortRef.current !== sortKey && prevSortRef.current !== '') {
      setCurrentPage(1);
    }
    prevSortRef.current = sortKey;
  }, [sortConfig]);

  // Handle sort change
  const handleSortChange = useCallback((newSortConfig: SortConfig[]) => {
    setSortConfig(newSortConfig);
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number | 'all') => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Get selected company from store (needed for grouping logic)
  const { selectedCompany } = useCompanyStore();

  // Handle opening create modal
  const handleOpenCreateModal = useCallback((parent?: any) => {
    // Skip company check if schema is not company-based (isNotCompanyBased === true)
    // Also skip for "companies" schema specifically (it's always not company-based)
    // Only check for company selection if schema is company-based (isNotCompanyBased === false or undefined)
    // Explicitly check for true value to handle cases where property might be undefined
    const isNotCompanyBased = schema?.isNotCompanyBased === true || schema?.id === 'companies';
    const isCompanyBased = !isNotCompanyBased;
    
    // Debug: Log schema info to help diagnose issues
    if (process.env.NODE_ENV === 'development') {
      loggingCustom(LogType.CLIENT_LOG, 'log', `[DynamicPageRenderer] Schema check: ${JSON.stringify({
        schemaId: schema?.id,
        isNotCompanyBased: schema?.isNotCompanyBased,
        isNotCompanyBasedType: typeof schema?.isNotCompanyBased,
        isNotCompanyBasedValue: schema?.isNotCompanyBased,
        isCompanyBased,
        selectedCompany: selectedCompany?.id,
      })}`);
    }

    if (isCompanyBased) {
      // Check if a company is selected (not "All Companies" with id === -1)
      if (!selectedCompany || selectedCompany.id === -1) {
        toast.warning('Please select a company to create a new record', {
          description: 'Select a company from the dropdown to add a new record.',
        });
        return;
      }
    }
    
    if (schema?.id) {
      setFixedParentForCreate(parent || null);
      setCreateModalOpen(true);
    }
  }, [schema?.id, schema?.isNotCompanyBased, selectedCompany]);

  // Custom handleViewEntity that opens the detail dialog (card click)
  const handleViewEntity = useCallback((entity: any) => {
    setSelectedEntityForDetail(entity);
    setIsDetailDialogOpen(true);
  }, []);

  const handleTableRowClick = useCallback(
    (entity: any) => {
      handleViewEntity(entity);
    },
    [handleViewEntity]
  );

  // Navigate to detail page (view button click)
  const handleViewDetailPage = useCallback((entity: any) => {
    if (entity?.id && schema?.id) {
      router.push(`/page/${schema.id}/${entity.id}`);
    }
  }, [router, schema?.id]);

  // Handle delete with confirmation dialog
  const handleDeleteWithConfirmation = useCallback((entity: any) => {
    setDeleteConfirmDialog({ open: true, entity });
  }, []);

  // Use shared companies hook for client-side caching
  const { companies: companiesData, isLoading: isLoadingCompaniesData } = useCompanies();

  const availableCompanyIds = useMemo(() => {
    return companiesData
      .filter((company: any) => company.id !== -1 && company.id !== undefined && company.id !== null)
      .map((company: any) => String(company.id));
  }, [companiesData]);

  // Fetch assignment counts from /api/data/[schema-id]/count for badge display
  useEffect(() => {
    if (!allowAssignmentSwitcher || !schema?.id || !assignmentSelectedUser?.id) {
      setAssignmentCountsFromApi(null);
      return;
    }
    const companyIds =
      schema?.isNotCompanyBased || schema?.id === 'companies'
        ? []
        : selectedCompany && selectedCompany.id !== -1
          ? [String(selectedCompany.id)]
          : availableCompanyIds;
    const params = new URLSearchParams();
    params.set('userId', assignmentSelectedUser.id);
    if (companyIds.length > 0) {
      params.set('companyIds', companyIds.join(','));
    }
    const url = `/api/data/${schema.id}/count?${params.toString()}`;
    let cancelled = false;
    apiRequest<{ assignedToCount: number; initiatedByCount: number }>(url)
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        setAssignmentCountsFromApi({
          assignedToCount: res.data.assignedToCount ?? 0,
          initiatedByCount: res.data.initiatedByCount ?? 0,
        });
      })
      .catch(() => {
        if (!cancelled) setAssignmentCountsFromApi(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    allowAssignmentSwitcher,
    schema?.id,
    schema?.isNotCompanyBased,
    assignmentSelectedUser?.id,
    selectedCompany?.id,
    availableCompanyIds,
    assignmentCountRefreshToken,
  ]);

  // Fetch companies schema for grouping (companies data comes from useCompanies hook with caching)
  useEffect(() => {
    // Skip fetching companies schema if schema is not company-based
    if (schema?.isNotCompanyBased) {
      return;
    }
    
    const fetchCompaniesSchema = async () => {
      // Check if entities have companyId field
      if (entities && entities.length > 0 && entities.some((e: any) => e.companyId)) {
        // Use companies from shared hook (excluding "All Companies" option for grouping)
        const companiesWithoutAll = companiesData.filter((c: any) => c.id !== -1);
        setCompanies(companiesWithoutAll);
        
        // Only fetch schema if we don't have it yet
        if (!companySchema) {
          try {
            setIsLoadingCompanies(true);
            // Fetch companies schema for getting image and title fields
            const schemaResponse = await apiRequest<any>('/api/schemas/companies');
            if (schemaResponse.success && schemaResponse.data) {
              setCompanySchema(schemaResponse.data);
            }
          } catch (error) {
            loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching companies schema: ${error instanceof Error ? error.message : String(error)}`);
          } finally {
            setIsLoadingCompanies(false);
          }
        }
      }
    };

    // Only run if we have entities and companies data, and we need the schema
    if (entities && entities.length > 0 && companiesData.length > 0) {
      fetchCompaniesSchema();
    }
  }, [entities, companiesData, schema?.isNotCompanyBased, companySchema]);

  // Build filters object with company filter and optional assignment (createdByIds / assignedToIds)
  const buildFilters = useCallback(() => {
    // When assignment switcher is enabled but no user is selected yet,
    // avoid fetching unfiltered data. User must pick a POV first.
    if (allowAssignmentSwitcher && !assignmentSelectedUser?.id) {
      return null;
    }

    const filters: any = {
      search: currentFilters.search,
      status: currentFilters.status,
      category: currentFilters.category,
    };

    // Assignment filter (backend): createdByIds or assignedToIds as comma-separated user ID(s)
    if (allowAssignmentSwitcher && assignmentSelectedUser?.id) {
      if (assignmentView === 'assignedTo') {
        filters.assignedToIds = assignmentSelectedUser.id;
      } else {
        filters.createdByIds = assignmentSelectedUser.id;
      }
    }
    
    // Skip company filtering if schema is not company-based
    if (!schema?.isNotCompanyBased) {
      // If we don't yet have company context, skip building filters (avoid hitting API without companyIds)
      const hasSelectedCompany = selectedCompany && selectedCompany.id !== undefined && selectedCompany.id !== null;
      if (!hasSelectedCompany && availableCompanyIds.length === 0) {
        return null;
      }

      if (selectedCompany && selectedCompany.id !== -1) {
        filters.companyIds = [String(selectedCompany.id)];
      } else if (availableCompanyIds.length > 0) {
        filters.companyIds = [...availableCompanyIds];
      } else {
        // No company filters available yet; skip fetch
        return null;
      }
    }
    
    return filters;
  }, [currentFilters, selectedCompany, schema?.isNotCompanyBased, availableCompanyIds, allowAssignmentSwitcher, assignmentSelectedUser?.id, assignmentView]);

  // Handle changing parent for hierarchical items
  const handleChangeParent = useCallback((entity: any) => {
    if (!entity?.id || !schema?.id) {
      return;
    }
    setEntityForParentChange(entity);
    setChangeParentPickerOpen(true);
  }, [schema?.id]);

  // Handle parent selection from picker
  const handleParentSelected = useCallback(async (selections: any[], rawItems: any[]) => {
    if (!entityForParentChange || !schema?.id || !selections || selections.length === 0) {
      setChangeParentPickerOpen(false);
      setEntityForParentChange(null);
      return;
    }

    const newParentId = selections[0]?.id ? String(selections[0].id) : null;
    const childId = String(entityForParentChange.id);

    try {
      setIsSubmitting(true);

      // Update the entity's parent field
      const updateResponse = await apiRequest(`/api/data/${schema.id}/${childId}`, {
        method: 'PUT',
        body: {
          ...entityForParentChange,
          parent: newParentId,
        },
      });

      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to update parent');
      }

      // Sync the IS_PARENT_OF relation
      await syncParentRelation({
        schemaId: schema.id,
        childId,
        parentId: newParentId,
      });

      // Refresh entities to show updated hierarchy with current filters and cache disabled
      const filters = buildFilters();
      if (filters) {
        await fetchEntities(filters, { disableCache: true, page: currentPage, limit: pageSize, sortArray: sortConfig });
      } else {
        // Fallback: refresh without filters if buildFilters returns null
        await fetchEntities(undefined, { disableCache: true, page: currentPage, limit: pageSize, sortArray: sortConfig });
      }

      toast.success('Parent updated successfully');
      setChangeParentPickerOpen(false);
      setEntityForParentChange(null);
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to change parent: ${error instanceof Error ? error.message : String(error)}`);
      toast.error(error instanceof Error ? error.message : 'Failed to change parent');
    } finally {
      setIsSubmitting(false);
    }
  }, [entityForParentChange, schema?.id, fetchEntities, buildFilters, sortConfig, currentPage, pageSize]);

  const handleManualRefresh = useCallback(async () => {
    const filters = buildFilters();
    if (!filters) {
      toast.warning('Select a company to refresh', {
        description: 'Choose a company context before refreshing the data.',
      });
      return;
    }

    const toastId = toast.loading(`Refreshing ${pluralName.toLowerCase()}...`);
    setIsManualRefresh(true);
    try {
      const result = await fetchEntities(filters, { disableCache: true, page: currentPage, limit: pageSize, sortArray: sortConfig });
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to refresh data');
      }
      toast.success(`${pluralName} updated`, { id: toastId });
      // Also refresh assignment counts when manual refresh succeeds
      if (allowAssignmentSwitcher && assignmentSelectedUser?.id) {
        setAssignmentCountRefreshToken((prev) => prev + 1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsManualRefresh(false);
    }
  }, [buildFilters, fetchEntities, pluralName, currentPage, pageSize, sortConfig, allowAssignmentSwitcher, assignmentSelectedUser?.id]);

  // Confirm and execute delete
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmDialog.entity) return;

    try {
      // When in hierarchy view, delete the selected entity AND all of its descendants
      if (viewMode === 'hierarchy' && Array.isArray(entities) && entities.length > 0) {
        const { nodeMap } = buildHierarchyTree(entities);
        const rootId = String(deleteConfirmDialog.entity.id ?? '');

        if (rootId && nodeMap.has(rootId)) {
          const collectDescendants = (id: string, acc: Set<string>) => {
            if (acc.has(id)) return;
            acc.add(id);
            const node = nodeMap.get(id);
            if (!node) return;
            for (const child of node.children) {
              collectDescendants(child.id, acc);
            }
          };

          const idsToDelete = new Set<string>();
          collectDescendants(rootId, idsToDelete);

          // Execute deletions sequentially to preserve existing delete logic and error handling
          for (const id of idsToDelete) {
            const entityToDelete = entities.find((e) => String(e.id) === id);
            if (entityToDelete) {
              await handleDeleteEntity(entityToDelete);
            }
          }
        } else {
          // Fallback: if we can't resolve hierarchy, delete only the selected entity
          await handleDeleteEntity(deleteConfirmDialog.entity);
        }
      } else {
        // Non‑hierarchy views: delete only the selected entity
        await handleDeleteEntity(deleteConfirmDialog.entity);
      }

      setDeleteConfirmDialog({ open: false, entity: null });

      // Refresh entities after deletion with current filters
      const filters = buildFilters();
      if (filters) {
        fetchEntities(filters, { disableCache: true, page: currentPage, limit: pageSize, sortArray: sortConfig });
      }
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error deleting entity: ${error instanceof Error ? error.message : String(error)}`);
      setDeleteConfirmDialog({ open: false, entity: null });
    }
  }, [deleteConfirmDialog.entity, handleDeleteEntity, fetchEntities, buildFilters, viewMode, entities, currentPage, pageSize, sortConfig]);

  const lastFiltersRef = useRef<string>('');
  const lastPageRef = useRef<number>(1);
  const lastPageSizeRef = useRef<number | 'all'>(25);
  const lastSortRef = useRef<string>('');

  // Fetch whenever derived filters, pagination, or sort change (includes initial mount and company/filter updates)
  useEffect(() => {
    const filters = buildFilters();
    if (!filters) {
      return;
    }
    const filtersKey = JSON.stringify(filters);
    const sortKey = JSON.stringify(sortConfig);
    const pageChanged = lastPageRef.current !== currentPage;
    const pageSizeChanged = lastPageSizeRef.current !== pageSize;
    const filtersChanged = lastFiltersRef.current !== filtersKey;
    const sortChanged = lastSortRef.current !== sortKey;

    // Only skip if nothing changed
    if (!pageChanged && !pageSizeChanged && !filtersChanged && !sortChanged) {
      return;
    }

    // Update refs
    lastFiltersRef.current = filtersKey;
    lastPageRef.current = currentPage;
    lastPageSizeRef.current = pageSize;
    lastSortRef.current = sortKey;

    setFilters(filters);
    fetchEntities(filters, { page: currentPage, limit: pageSize, sortArray: sortConfig });
  }, [buildFilters, fetchEntities, setFilters, currentPage, pageSize, sortConfig]);

  // Handle edit entity - set entity ID to trigger FormModal
  const handleEditEntity = useCallback(async (entity: any) => {
    if (!entity?.id || !schema?.id) {
      loggingCustom(LogType.CLIENT_LOG, 'error', 'Missing entity ID or schema ID for edit');
      return;
    }
    
    try {
      setIsEditLoading(prev => ({ ...prev, [entity.id]: true }));
      
      // Set entity ID to trigger FormModal component
      setEditEntityId(entity.id);
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to open edit modal: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsEditLoading(prev => ({ ...prev, [entity.id]: false }));
    }
  }, [schema?.id]);

  // Debounce search term for filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTermLocal);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchTermLocal]);

  // Filter entities by search term only (company and assignment filtering done by backend via query params)
  const filteredEntities = useMemo(() => {
    const sourceEntities = Array.isArray(entities) ? entities : [];
    
    if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
      const searchLower = debouncedSearchTerm.toLowerCase();
      
      return sourceEntities.filter((entity: any) => {
        const searchableFields = [
          'name', 'title', 'email', 'phone', 'description',
          'productName', 'requestId', 'batchNumber', 'productSku',
          'companyName', 'tenderTitle', 'projectName',
          'code'
        ];
        
        return searchableFields.some(field => {
          const value = entity[field];
          if (value && typeof value === 'string') {
            return value.toLowerCase().includes(searchLower);
          }
          return false;
        });
      });
    }
    
    return sourceEntities;
  }, [entities, debouncedSearchTerm, entityName, schema?.id]);

  // Collapse all hierarchy nodes when search is cleared
  const prevSearchRef = React.useRef<string>('');
  React.useEffect(() => {
    if (viewMode === 'hierarchy' && prevSearchRef.current && !searchTermLocal.trim()) {
      setHierarchyCollapseToken((prev) => prev + 1);
    }
    prevSearchRef.current = searchTermLocal;
  }, [searchTermLocal, viewMode]);

  // Get repeating sections from schema (guard against null/undefined from backend)
  const repeatingSections = useMemo(() => {
    return Array.isArray(schema?.sections) ? schema.sections.filter((section) => section.isRepeatingSection) : [];
  }, [schema?.sections]);

  // Get field IDs that belong to repeating sections (to exclude from main table)
  const repeatingSectionFieldIds = useMemo(() => {
    const fieldIds = new Set<string>();
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    repeatingSections.forEach((section) => {
      const sectionFields = fields.filter((field: any) => field.sectionId === section.id);
      sectionFields.forEach((field: any) => {
        fieldIds.add(field.id);
      });
    });
    return fieldIds;
  }, [repeatingSections, schema?.fields]);

  // Build table columns from all schema fields
  const tableColumns = useMemo(() => {
    if (!Array.isArray(schema?.fields) || schema.fields.length === 0) {
      return [];
    }

    // Get all fields from schema (excluding hidden fields and repeating section fields)
    const visibleFields = schema.fields.filter(
      (field: any) => !field.hidden && !repeatingSectionFieldIds.has(field.id)
    );
    
    // Build columns from fields
    const baseColumns = buildTableColumns(visibleFields, schema);
    
    // Add columns for repeating sections
    const repeatingSectionColumns: TableColumn[] = repeatingSections.map((section) => {
      // Check if this is a relation-based repeating section (connectToSchema)
      const isRelationBased = !!(section.repeatingConfig?.targetSchema && section.repeatingConfig?.relationTypeId);
      
      return {
        id: `repeating-section-${section.id}`,
        label: section.title || section.id,
        accessor: (row: any) => {
          if (isRelationBased) {
            // For relation-based sections, we can't get count from entity data
            return null;
          }
          const sectionData = row[section.id];
          return Array.isArray(sectionData) ? sectionData.length : 0;
        },
        sortable: !isRelationBased, // Disable sorting for relation-based sections
        align: 'center',
        width: 150,
        render: (value: any, row: any) => {
          // Only show count for non-relation-based sections
          let itemCount: number | null = null;
          if (!isRelationBased) {
            const sectionData = row[section.id];
            itemCount = Array.isArray(sectionData) ? sectionData.length : 0;
          }
          
          return (
            <div className="flex items-center justify-center gap-2">
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <RepeatingSectionButton
                  sectionId={section.id}
                  sectionTitle={section.title}
                  entityData={row}
                  entityId={row.id}
                  itemCount={itemCount}
                  onOpen={({ sectionId, sectionTitle, entityData, entityId }) => {
                    setRepeatingSectionDialog({
                      isOpen: true,
                      sectionId,
                      sectionTitle: sectionTitle || sectionId,
                      entityData,
                      entityId,
                    });
                  }}
                />
              </div>
            </div>
          );
        },
      } as TableColumn;
    });
    
    // Add action column
    const actionColumn: TableColumn = {
      id: 'actions',
      label: 'Actions',
      accessor: 'id',
      sortable: false,
      align: 'center',
      width: 120,
      render: (value: any, row: any) => {
        return (
          <DynamicActionButtons
            variant="minimal"
            actions={[
              {
                type: 'view',
                onClick: () => handleViewDetailPage(row),
                href: row?.id && schema?.id ? `/page/${schema.id}/${row.id}` : undefined,
                canOpenInNewTab: true,
              },
              {
                type: 'edit',
                onClick: () => {
                if (!isEditLoading[row.id]) {
                  handleEditEntity(row);
                }
                },
                disabled: isEditLoading[row.id],
              },
              {
                type: 'delete',
                onClick: () => handleDeleteWithConfirmation(row),
              },
            ]}
          />
        );
      },
    };

    // Helper functions to extract user info
    const getUserName = (user: any): string | null => {
      if (!user) return null;
      if (typeof user === 'string') return user;
      if (typeof user === 'object') {
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        if (firstName || lastName) {
          return `${firstName} ${lastName}`.trim();
        }
        if (user.username) return user.username;
        if (user.email) return user.email;
        if (user.label) return user.label;
      }
      return null;
    };

    const getUserAvatarUrl = (user: any): string | null => {
      if (!user || typeof user !== 'object') return null;
      if (user.avatarUrl) return String(user.avatarUrl);
      return null;
    };

    const getUserInitials = (user: any): string => {
      if (!user) return '?';
      if (typeof user === 'string') {
        return getInitials(user);
      }
      if (typeof user === 'object') {
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        if (firstName || lastName) {
          return getInitials(`${firstName} ${lastName}`.trim());
        }
        if (user.username) return getInitials(user.username);
        if (user.email) return getInitials(user.email);
        if (user.label) return getInitials(user.label);
        if (user.name) return getInitials(user.name);
      }
      return '?';
    };

    // Add metadata columns (Created/Updated) at the end
    const metadataColumns: TableColumn[] = [
      {
        id: 'createdAt',
        label: 'Created',
        accessor: (row: any) => row.createdAt,
        sortable: true,
        align: 'left',
        width: 200,
        render: (value: any, row: any) => {
          if (!value) return <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>;
          const createdLabel = formatCreatedLabel(value);
          const createdBy = row.createdBy;
          const createdByName = getUserName(createdBy);
          const createdByAvatarUrl = getUserAvatarUrl(createdBy);
          const createdByInitials = getUserInitials(createdBy);
          
          return (
            <TooltipProvider>
              <div className="flex flex-col gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <IconRenderer iconName="PlusCircle" className="h-3 w-3" />
                      <span>{createdLabel.display}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    sideOffset={8}
                    className="z-100"
                    avoidCollisions={true}
                    collisionPadding={8}
                  >
                    <span>
                      Created {createdLabel.tooltip}
                      {createdByName ? ` by ${createdByName}` : ''}
                    </span>
                  </TooltipContent>
                </Tooltip>
                {createdByName && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 ps-4.5">
                    <Avatar className="h-4 w-4">
                      {createdByAvatarUrl && (
                        <AvatarImage src={createdByAvatarUrl} alt={createdByName} />
                      )}
                      <AvatarFallback className="text-[0.625rem]">
                        {createdByInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{createdByName}</span>
                  </div>
                )}
              </div>
            </TooltipProvider>
          );
        },
      },
      {
        id: 'updatedAt',
        label: 'Updated',
        accessor: (row: any) => {
          // Always return updatedAt, or fall back to createdAt if updatedAt is missing
          return row.updatedAt || row.createdAt;
        },
        sortable: true,
        align: 'left',
        width: 200,
        render: (value: any, row: any) => {
          // Always show updatedAt, or fall back to createdAt if updatedAt is missing
          const updatedAt = row.updatedAt || row.createdAt;
          const updatedBy = row.updatedBy || row.createdBy;
          
          // If no date available, show dash
          if (!updatedAt) return <span className="text-gray-400 dark:text-gray-600 text-xs">—</span>;
          
          const updatedLabel = formatRelativeTime(updatedAt, { addSuffix: true });
          const updatedFullDate = formatFullDate(updatedAt);
          const updatedByName = getUserName(updatedBy);
          const updatedByAvatarUrl = getUserAvatarUrl(updatedBy);
          const updatedByInitials = getUserInitials(updatedBy);
          
          return (
            <TooltipProvider>
              <div className="flex flex-col gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <IconRenderer iconName="Edit" className="h-3 w-3" />
                      <span>{updatedLabel}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    sideOffset={8}
                    className="z-100"
                    avoidCollisions={true}
                    collisionPadding={8}
                  >
                    <span>
                      Updated {updatedFullDate}
                      {updatedByName ? ` by ${updatedByName}` : ''}
                    </span>
                  </TooltipContent>
                </Tooltip>
                {updatedByName && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 ps-4.5">
                    <Avatar className="h-4 w-4">
                      {updatedByAvatarUrl && (
                        <AvatarImage src={updatedByAvatarUrl} alt={updatedByName} />
                      )}
                      <AvatarFallback className="text-[0.625rem]">
                        {updatedByInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{updatedByName}</span>
                  </div>
                )}
              </div>
            </TooltipProvider>
          );
        },
      },
    ];

    // Conditionally include metadata columns based on showMetadataColumns state
    const finalColumns = showMetadataColumns 
      ? [actionColumn, ...baseColumns, ...repeatingSectionColumns, ...metadataColumns]
      : [actionColumn, ...baseColumns, ...repeatingSectionColumns];
    
    return finalColumns;
  }, [schema, repeatingSections, repeatingSectionFieldIds, handleViewDetailPage, handleEditEntity, handleDeleteWithConfirmation, isEditLoading, showMetadataColumns]);

  // Create table config
  const tableConfig: TableConfig = useMemo(
    () => ({
      id: `table-${schema.id}`,
      columns: tableColumns,
      data: filteredEntities,
      pagination: {
        enabled: false, // Disabled - pagination is shown in page header
        pageSize: DEFAULT_LIMIT,
        showPageSizeSelector: true,
        pageSizeOptions: [10, 25, 50, 100, 500, 'all'],
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
      hideEmptyState: true, // Hide table's empty state - DynamicPageRenderer handles it below
      loading: isLoading,
      striped: true,
      hoverable: true,
      bordered: true,
    }),
    [
      schema.id,
      tableColumns,
      filteredEntities,
      isLoading,
      pluralName,
      searchTermLocal,
    ]
  );

  // Group entities by companyId - only when "All Companies" (-1) is selected and schema is company-based
  const groupedEntities = useMemo(() => {
    // Skip grouping if schema is not company-based
    if (schema?.isNotCompanyBased) {
      return null;
    }
    
    if (!filteredEntities || filteredEntities.length === 0) return null;
    
    // Only group when "All Companies" is selected (id === -1)
    if (!selectedCompany || selectedCompany.id !== -1) {
      return null;
    }
    
    // Check if any entity has companyId
    const hasCompanyId = filteredEntities.some((e: any) => e.companyId);
    
    if (!hasCompanyId) return null;
    
    const grouped: Record<string, any[]> = {};
    const ungrouped: any[] = [];
    
    filteredEntities.forEach((entity: any) => {
      if (entity.companyId) {
        if (!grouped[entity.companyId]) {
          grouped[entity.companyId] = [];
        }
        grouped[entity.companyId].push(entity);
      } else {
        ungrouped.push(entity);
      }
    });
    
    return { grouped, ungrouped };
  }, [filteredEntities, selectedCompany, schema?.isNotCompanyBased]);

  // Calculate default values for accordion (all expanded initially)
  const accordionDefaultValues = useMemo(() => {
    if (!groupedEntities) return [];
    
    const values: string[] = [];
    // Add all company IDs
    Object.keys(groupedEntities.grouped).forEach(companyId => {
      values.push(companyId);
    });
    // Add "ungrouped" if there are ungrouped entities
    if (groupedEntities.ungrouped.length > 0) {
      values.push('ungrouped');
    }
    return values;
  }, [groupedEntities]);
  
  // Get company info by ID
  const getCompanyInfo = useCallback((companyId: string) => {
    const company = companies.find((c: any) => c.id === companyId);
    if (!company) return null;
    
    if (companySchema) {
      const imageUrl = getSingleValueByRole(companySchema, company, 'image') || company.logo;
      const title = getSingleValueByRole(companySchema, company, 'title') || company.name;
      return { imageUrl, title, company };
    }
    
    return { imageUrl: company.logo, title: company.name, company };
  }, [companies, companySchema]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'danger';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="h-4 w-4" />;
      case 'INACTIVE': return <AlertCircle className="h-4 w-4" />;
      case 'PENDING': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  }, []);

  const getRatingStars = useCallback((rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  }, []);

  const singularName = schema.singular_name || 'Entity';

  // Check if user is admin (mock implementation - replace with actual auth context)
  const isAdmin = true; // TODO: Replace with actual user profile check
  
  // Check if "All Companies" is selected (id === -1), which means we can't create new records
  // Skip this check if schema is not company-based
  const canCreateRecords = schema?.isNotCompanyBased || (selectedCompany && selectedCompany.id !== -1);


  return (
    <MainLayout 
      title={pluralName}
      icon={schema.icon}
      editSchemaPath={schema.id ? `/builder/schemas/${schema.id}` : undefined}
      isAdmin={isAdmin}
      navigationSchemas={reconstructedNavigationSchemas}
    >
      {/* Individual entity loading indicator */}
      <div 
        id="entity-loading-indicator" 
        className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-md z-50"
        style={{ display: 'none' }}
      >
        Loading {entityName.toLowerCase()} data...
      </div>
      <div className="space-y-6">
        {/* Custom Buttons */}
        {schema?.customButtons && Array.isArray(schema.customButtons) && schema.customButtons.length > 0 && (
          <div className="flex flex-row gap-2 flex-wrap">
            {schema.customButtons.map((action) => {
              const handleCustomAction = () => {
                if (action.action === 'goToUrl' && action.targetUrl) {
                  router.push(action.targetUrl);
                } else if (action.action === 'openUrl' && action.targetUrl) {
                  window.open(action.targetUrl, '_blank', 'noopener,noreferrer');
                } else if (action.action === 'openFormDialog' && action.targetSchema) {
                  // Handle form dialog opening - could be implemented later
                  loggingCustom(LogType.CLIENT_LOG, 'log', `Open form dialog for schema: ${action.targetSchema}`);
                }
              };

              // Map QuickAction variants to form-builder Button variants
              // Form-builder Button supports: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost' | 'link'
              const buttonVariant = (() => {
                const variant = action.variant;
                
                // Map 'destructive' to 'danger' (form-builder Button uses 'danger')
                if (variant === 'destructive') {
                  return 'danger' as const;
                }
                
                // Direct mapping for supported variants
                if (variant === 'outline' || variant === 'default' || variant === 'secondary' || 
                    variant === 'ghost' || variant === 'link') {
                  return variant as 'default' | 'secondary' | 'outline' | 'ghost' | 'link';
                }
                
                // Map 'gradient' to 'default' (form-builder Button doesn't support gradient)
                if (variant === 'gradient') {
                  return 'default' as const;
                }
                
                // Default to 'outline' if variant is undefined or unknown
                return 'outline' as const;
              })();

              return (
                <Button
                  key={action.id}
                  variant={buttonVariant}
                  size="sm"
                  onClick={handleCustomAction}
                  className="whitespace-nowrap"
                >
                  {action.icon && (
                    <IconRenderer iconName={action.icon} className="h-4 w-4 me-2" />
                  )}
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Search and Filters */}
        <DynamicFilterPane
          searchTerm={searchTermLocal}
          onSearchChange={setSearchTermLocal}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onAddNew={handleOpenCreateModal}
          onRefresh={handleManualRefresh}
          isRefreshing={(!(allowAssignmentSwitcher && !assignmentSelectedUser?.id) && (isLoading || isManualRefresh))}
          searchPlaceholder={`Search ${pluralName.toLowerCase()}...`}
          addButtonText={`Add ${singularName}`}
          onExpandAllHierarchy={() => setHierarchyExpandToken((prev) => prev + 1)}
          onCollapseAllHierarchy={() => setHierarchyCollapseToken((prev) => prev + 1)}
          showHierarchy={schema?.allowHierarchicalParent === true}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          schema={schema}
          excludedFieldIds={repeatingSectionFieldIds}
          customActions={
            <div className="flex items-center gap-2 px-2">
              <Label
                htmlFor="metadata-toggle"
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap"
              >
                User Details
              </Label>
              <Switch
                id="metadata-toggle"
                checked={showMetadataColumns}
                onCheckedChange={setShowMetadataColumns}
              />
            </div>
          }
        />

        {assignmentSwitcherEnabled && (
          <div className="mt-3">
            <AssignmentSwitcher
              activeView={assignmentView}
              onViewChange={setAssignmentView}
              counts={assignmentCounts}
              selectedUser={assignmentSelectedUser}
              onUserOptionChange={handleUserOptionChange}
              onResetUser={resetAssignmentUser}
              isUsingDefaultUser={isAssignmentUserDefault}
            />
          </div>
        )}

        {/* Pagination - Show for all views when we have pagination metadata or "all" is selected */}
        {(paginationMeta || pageSize === 'all') && (
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
            <DynamicPagination
              currentPage={currentPage}
              totalPages={paginationMeta?.totalPages || 1}
              totalItems={paginationMeta?.totalItems || filteredEntities.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50, 100, 500, 'all']}
              showPageSizeSelector={true}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}

        {/* Entities List or Assignment Placeholder */}
        {allowAssignmentSwitcher && !assignmentSelectedUser?.id ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EmptyState
              icon={
                <IconRenderer iconName="UserCircle2" className="h-12 w-12 text-gray-400" />
              }
              title="Select a user to view tasks"
              description="Use the assignment switcher above to choose whose assigned or initiated tasks you want to see."
            />
          </motion.div>
        ) : viewMode === 'hierarchy' ? (
          <HierarchyView
            schema={schema}
            items={entities || []}
            searchTerm={debouncedSearchTerm}
            onAddChild={(entity) => handleOpenCreateModal(entity)}
            onEdit={handleEditEntity}
            onDelete={handleDeleteWithConfirmation}
            onChangeParent={handleChangeParent}
            onView={handleViewEntity}
            onViewDetail={handleViewDetailPage}
            expandAllTrigger={hierarchyExpandToken}
            collapseAllTrigger={hierarchyCollapseToken}
            isLoading={isLoading}
            showUserDetails={showMetadataColumns}
          />
        ) : groupedEntities ? (
          // Grouped view with accordion
          <Accordion type="multiple" defaultValue={accordionDefaultValues} className="w-full space-y-2">
            {/* Groups by Company */}
            {Object.entries(groupedEntities.grouped).map(([companyId, companyEntities]) => {
              const companyInfo = getCompanyInfo(companyId);
              return (
                <AccordionItem key={companyId} value={companyId} className="border border-gray-200 dark:border-gray-700 rounded-2xl px-2 md:px-4 bg-gray-50 dark:bg-gray-800/30 border-b border-b-gray-200 dark:border-b-gray-500">
                  <AccordionTrigger className="hover:no-underline py-3 [&>svg]:text-violet-600">
                    <div className="flex items-center gap-2">
                      {isLoadingCompanies ? (
                        <Skeleton className="h-12 w-12 rounded" />
                      ) : (
                        <ImageText
                          config={{} as any}
                          value={{
                            imageUrl: companyInfo?.imageUrl,
                            text: companyInfo?.title || `Company ${companyId}`
                          }}
                          imageUrl={companyInfo?.imageUrl}
                          text={companyInfo?.title || `Company ${companyId}`}
                          imageSize="lg"
                        />
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({companyEntities.length} {companyEntities.length === 1 ? 'item' : 'items'})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {viewMode === 'table' ? (
                      <div className="w-full pt-2 md:pt-4 mx-2">
                        <TableWrapper
                          tableConfig={{
                            ...tableConfig,
                            id: `table-${schema.id}-${companyId}`,
                            data: companyEntities,
                          }}
                          columns={tableColumns}
                          data={companyEntities}
                          showCards={false}
                          disableAnimation={false}
                          index={0}
                          isLoading={isLoading}
                          onRowClick={handleTableRowClick}
                          highlightQuery={debouncedSearchTerm}
                          schema={schema}
                        />
                      </div>
                    ) : (
                      <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 pt-2 md:pt-4 mx-2" : "space-y-4 pt-2 md:pt-4 mx-2"}>
                        {companyEntities.map((entity: any, index: number) => (
                        <div key={entity.id} className="relative">
                          {isEditLoading[entity.id] && (
                            <div className="absolute inset-0 bg-white/70 dark:bg-gray-800/30 flex items-center justify-center z-10 rounded-lg">
                              <div className="flex flex-col items-center space-y-2">
                                <Spinner size="lg" variant="primary" />
                                <span className="text-sm font-medium text-violet-600">Loading...</span>
                              </div>
                            </div>
                          )}
                          <DynamicCardRenderer
                            key={entity.id}
                            schema={asFormSchema(schema)}
                            data={entity}
                            index={index}
                            viewMode={viewMode}
                            maxBadges={3}
                            maxMetrics={5}
                            onView={handleViewEntity}
                            onViewDetail={handleViewDetailPage}
                            onEdit={(e) => {
                              if (!isEditLoading[e.id]) {
                                handleEditEntity(e);
                              }
                            }}
                            onDelete={handleDeleteWithConfirmation}
                            className={isEditLoading[entity.id] ? "opacity-70" : ""}
                            highlightQuery={debouncedSearchTerm}
                            showUserDetails={showMetadataColumns}
                          />
                        </div>
                      ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
            
            {/* Ungrouped entities */}
            {groupedEntities.ungrouped.length > 0 && (
              <AccordionItem value="ungrouped" className="border border-violet-200 dark:border-violet-500 rounded-lg px-2 md:px-4 bg-gray-50 dark:bg-gray-800/30 border-b border-b-gray-200 dark:border-b-gray-500">
                <AccordionTrigger className="hover:no-underline py-3 [&>svg]:text-violet-600">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Ungrouped</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({groupedEntities.ungrouped.length} {groupedEntities.ungrouped.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {viewMode === 'table' ? (
                    <div className="w-full pt-2 md:pt-4 mx-2">
                      <TableWrapper
                        tableConfig={{
                          ...tableConfig,
                          id: `table-${schema.id}-ungrouped`,
                          data: groupedEntities.ungrouped,
                        }}
                        columns={tableColumns}
                        data={groupedEntities.ungrouped}
                        showCards={false}
                        disableAnimation={false}
                        index={0}
                        isLoading={isLoading}
                        onRowClick={handleTableRowClick}
                        highlightQuery={debouncedSearchTerm}
                        schema={schema}
                      />
                    </div>
                  ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 pt-2 md:pt-4 mx-2" : "space-y-4 pt-2 md:pt-4 mx-2"}>
                      {groupedEntities.ungrouped.map((entity: any, index: number) => (
                      <div key={entity.id} className="relative">
                        {isEditLoading[entity.id] && (
                          <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/60 flex items-center justify-center z-10 rounded-lg">
                            <div className="flex flex-col items-center space-y-2">
                              <Spinner size="lg" variant="primary" />
                              <span className="text-sm font-medium text-violet-600">Loading...</span>
                            </div>
                          </div>
                        )}
                        <DynamicCardRenderer
                          key={entity.id}
                          schema={asFormSchema(schema)}
                          data={entity}
                          index={index}
                          viewMode={viewMode}
                          maxBadges={3}
                          maxMetrics={5}
                          onView={handleViewEntity}
                          onViewDetail={handleViewDetailPage}
                          onEdit={(e) => {
                            if (!isEditLoading[e.id]) {
                              handleEditEntity(e);
                            }
                          }}
                          onDelete={handleDeleteWithConfirmation}
                          className={isEditLoading[entity.id] ? "opacity-70" : ""}
                          highlightQuery={debouncedSearchTerm}
                          showUserDetails={showMetadataColumns}
                        />
                      </div>
                    ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        ) : viewMode === 'table' ? (
          // Table view
          <div className="w-full">
            <TableWrapper
              tableConfig={tableConfig}
              columns={tableColumns}
              data={filteredEntities}
              showCards={false}
              disableAnimation={false}
              index={0}
              isLoading={isLoading}
              onRowClick={handleTableRowClick}
              highlightQuery={debouncedSearchTerm}
              schema={schema}
            />
          </div>
        ) : (
          // Regular list view (no grouping)
          <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4" : "space-y-4"}>
            {isLoading ? (
              // Skeleton cards while loading
              viewMode === 'grid' ? (
                <LoadingSkeleton
                  variant="card"
                  count={6}
                  columns={{ default: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
                  gap={4}
                  className="col-span-full"
                />
              ) : (
                <LoadingSkeleton variant="list" count={6} />
              )
            ) : (
              filteredEntities.map((entity: any, index: number) => (
                <div key={entity.id} className="relative">
                  {isEditLoading[entity.id] && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/60 flex items-center justify-center z-10 rounded-lg">
                      <div className="flex flex-col items-center space-y-2">
                        <Spinner size="lg" variant="primary" />
                        <span className="text-sm font-medium text-violet-600">Loading...</span>
                      </div>
                    </div>
                  )}
                  <DynamicCardRenderer
                    key={entity.id}
                    schema={asFormSchema(schema)}
                    data={entity}
                    index={index}
                    viewMode={viewMode}
                    maxBadges={3}
                    maxMetrics={5}
                    onView={handleViewEntity}
                    onViewDetail={handleViewDetailPage}
                    onEdit={(e) => {
                      if (!isEditLoading[e.id]) {
                        handleEditEntity(e);
                      }
                    }}
                    onDelete={handleDeleteWithConfirmation}
                    className={isEditLoading[entity.id] ? "opacity-70" : ""}
                    highlightQuery={debouncedSearchTerm}
                    showUserDetails={showMetadataColumns}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {!isLoading && filteredEntities.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <EmptyState
              icon={
                schema.icon ? (
                  <IconRenderer iconName={schema.icon} className="h-12 w-12 text-gray-400" />
                ) : (
                  <Building className="h-12 w-12 text-gray-400" />
                )
              }
              title={`No ${pluralName.toLowerCase()} found`}
              description={
                searchTermLocal
                  ? 'Try adjusting your search criteria.'
                  : `Get started by adding your first ${singularName.toLowerCase()}.`
              }
              action={
                <Button
                  onClick={handleOpenCreateModal}
                  className="bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 me-2" />
                  Add {singularName}
                </Button>
              }
            />
          </motion.div>
        )}
      </div>

      {/* Detail Dialog */}
      <DynamicCardDialog
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        schema={asFormSchema(schema)}
        data={selectedEntityForDetail}
        title={selectedEntityForDetail?.name || `${singularName} Details`}
        onView={handleViewEntity}
        onViewDetail={handleViewDetailPage}
        onEdit={handleEditEntity}
        onDelete={handleDeleteWithConfirmation}
      />

      {/* Create Modal - using unified FormModal */}
      {createModalOpen && schema?.id && (
        <FormModal
          schemaId={schema.id}
          mode="create"
          getInitialSchema={(requestedId) => (requestedId === schema.id ? schema : null)}
          initialValues={(() => {
            const base: Record<string, any> = {};

            // Pre-fill parent for hierarchical schemas when creating from a parent item
            // Note: Parent is pre-filled but not locked, allowing users to change it if needed
            if (fixedParentForCreate && (schema as any).allowHierarchicalParent) {
              base.parent = [
                    {
                      id: String(fixedParentForCreate.id),
                      label:
                        getValueByRole(schema, fixedParentForCreate, 'title') ||
                        fixedParentForCreate.name ||
                        fixedParentForCreate.title ||
                        String(fixedParentForCreate.id),
                      icon:
                    getSingleValueByRole(
                      schema,
                      fixedParentForCreate,
                      'icon',
                      (fixedParentForCreate as any).icon
                    ) || undefined,
                    },
              ];
            }

            // Pre-fill relatedCompanies for company-based schemas that support multi-company
            const isCompanyBased = schema?.isNotCompanyBased !== true;
            if (
              schema?.canSelectMultiCompanies &&
              isCompanyBased &&
              selectedCompany &&
              selectedCompany.id !== -1
            ) {
              base['relatedCompanies'] = [
                {
                  id: String(selectedCompany.id),
                  label:
                    (selectedCompany as any).name ||
                    (selectedCompany as any).title ||
                    (selectedCompany as any).abbreviation ||
                    String(selectedCompany.id),
                  // We don't have a consistent icon field; leave undefined so PickerInput falls back gracefully
                },
              ];
            }

            return Object.keys(base).length > 0 ? base : undefined;
          })()}
          enrichData={(formData) => {
            // Email validation function
            const isValidEmail = (email: string) => {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(email);
            };

            // Validate primary email if exists
            if (formData.email && !isValidEmail(formData.email)) {
              throw new Error(`Invalid email format: ${formData.email}`);
            }

            // Validate emails in contacts if exists
            if (formData.contacts && Array.isArray(formData.contacts)) {
              for (const contact of formData.contacts) {
                if (contact.email && !isValidEmail(contact.email)) {
                  throw new Error(`Invalid email format: ${contact.email}`);
                }
              }
            }

            // Add companyId from Zustand store (if not already present and schema is company-based)
            const companyId = !schema?.isNotCompanyBased && selectedCompany?.id && selectedCompany.id !== -1 ? String(selectedCompany.id) : undefined;

            // Transform form data to match the expected schema
            // Check if schema supports contacts (vendors, companies, etc. but not users)
            const hasContactsField = schema?.fields?.some((f: any) => f.name === 'contacts') || 
                                    schema?.sections?.some((s: any) => s.id === 'contacts' || s.title?.toLowerCase().includes('contact'));
            const isUsersSchema = schema?.id === 'users';
            const hasStatusRole = schema?.fields?.some((f: any) => f.role === 'status');
            const hasRatingRole = schema?.fields?.some((f: any) => f.role === 'rating');

            // Remove contacts from formData if it's users schema
            const { contacts: _, ...formDataWithoutContacts } = formData;

            return {
              ...(isUsersSchema ? formDataWithoutContacts : formData),
              companyId: formData.companyId || companyId, // Use provided companyId or from store
              ...(formData.categories && formData.categories.length > 0 ? { categories: formData.categories } : {}),
              // Only add contacts if schema supports it (not for users)
              ...(hasContactsField && !isUsersSchema ? {
                contacts: formData.contacts ? formData.contacts.map((contact: any) => ({
                  ...contact,
                  isPrimary: contact.isPrimary === true || contact.isPrimary === "true" ? true : false,
                  email: contact.email ? contact.email.trim() : contact.email,
                  department: contact.department || "",
                  notes: contact.notes || ""
                })) : formData.email ? [{
                  name: formData.primaryContactName || formData.name,
                  email: formData.primaryContactEmail || formData.email,
                  phone: formData.primaryContactPhone || formData.phone,
                  position: formData.primaryContactPosition || 'Primary Contact',
                  isPrimary: true,
                }] : []
              } : {}),
              ...(hasStatusRole && formData.status !== undefined && formData.status !== null && formData.status !== ''
                ? { status: formData.status }
                : {}),
              ...(hasRatingRole && formData.rating !== undefined && formData.rating !== null && formData.rating !== ''
                ? { rating: Number(formData.rating) }
                : {}),
            };
          }}
          onSuccess={async () => {
            // Refresh entities list after successful creation with current filters
            // Reset to page 1 and use current page size
            setCurrentPage(1);
            const filters = buildFilters();
            if (filters) {
              await fetchEntities(filters, { disableCache: true, page: 1, limit: pageSize, sortArray: sortConfig });
            }
            setFixedParentForCreate(null);
            setCreateModalOpen(false);
          }}
          onIncompleteSave={async () => {
            // Refresh entities list when form is saved as incomplete (without closing modal)
            // Reset to page 1 and use current page size
            setCurrentPage(1);
            const filters = buildFilters();
            if (filters) {
              await fetchEntities(filters, { disableCache: true, page: 1, limit: pageSize, sortArray: sortConfig });
            }
          }}
          onClose={() => {
            setFixedParentForCreate(null);
            setCreateModalOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationMessage
        isOpen={deleteConfirmDialog.open}
        onOpenChange={(open: boolean) => setDeleteConfirmDialog({ open, entity: deleteConfirmDialog.entity })}
        title={`Delete ${singularName}`}
        message={
          deleteConfirmDialog.entity ? (
            <>
              Are you sure you want to delete "{getValueByRole(schema, deleteConfirmDialog.entity, 'title') || deleteConfirmDialog.entity.name || deleteConfirmDialog.entity.title || deleteConfirmDialog.entity.id}"?
              <br />
              <span className="font-medium mt-2 block">This action cannot be undone.</span>
            </>
          ) : (
            ''
          )
        }
        variant="destructive"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => setDeleteConfirmDialog({ open: false, entity: null }),
          },
          {
            label: 'Delete',
            variant: 'destructive',
            icon: 'Trash2',
            action: confirmDelete,
          },
        ]}
      />

      {/* Edit Modal - using unified FormModal */}
      {editEntityId && schema?.id && (
        <FormModal
          key={`edit-${editEntityId}-${schema.id}`}
          schemaId={schema.id}
          entityId={editEntityId}
          mode="edit"
          getInitialSchema={(requestedId) => (requestedId === schema.id ? schema : null)}
          enrichData={(formData) => {
            // Email validation function
            const isValidEmail = (email: string) => {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return emailRegex.test(email);
            };

            // Validate primary email if exists
            if (formData.email && !isValidEmail(formData.email)) {
              throw new Error(`Invalid email format: ${formData.email}`);
            }

            // Validate emails in contacts if exists
            if (formData.contacts && Array.isArray(formData.contacts)) {
              for (const contact of formData.contacts) {
                if (contact.email && !isValidEmail(contact.email)) {
                  throw new Error(`Invalid email format: ${contact.email}`);
                }
              }
            }

            // Add companyId from Zustand store if entity doesn't have it (for new entities without companyId)
            // Note: For existing entities, the controller will preserve the existing companyId
            const companyId = selectedCompany?.id && selectedCompany.id !== -1 ? String(selectedCompany.id) : undefined;

            // Transform form data to match the expected schema
            // Check if schema supports contacts (vendors, companies, etc. but not users)
            const hasContactsField = schema?.fields?.some((f: any) => f.name === 'contacts') || 
                                    schema?.sections?.some((s: any) => s.id === 'contacts' || s.title?.toLowerCase().includes('contact'));
            const isUsersSchema = schema?.id === 'users';
            const hasStatusRole = schema?.fields?.some((f: any) => f.role === 'status');
            const hasRatingRole = schema?.fields?.some((f: any) => f.role === 'rating');

            // Remove contacts from formData if it's users schema
            const { contacts: _, ...formDataWithoutContacts } = formData;

            return {
              ...(isUsersSchema ? formDataWithoutContacts : formData),
              // Only add companyId if not already present (existing entities will have it)
              ...(formData.companyId ? {} : companyId ? { companyId } : {}),
              ...(formData.categories && formData.categories.length > 0 ? { categories: formData.categories } : {}),
              // Only add contacts if schema supports it (not for users)
              ...(hasContactsField && !isUsersSchema ? {
                contacts: formData.contacts ? formData.contacts.map((contact: any) => ({
                  ...contact,
                  isPrimary: contact.isPrimary === true || contact.isPrimary === "true" ? true : false,
                  email: contact.email ? contact.email.trim() : contact.email,
                  department: contact.department || "",
                  notes: contact.notes || ""
                })) : formData.email ? [{
                  name: formData.primaryContactName || formData.name,
                  email: formData.primaryContactEmail || formData.email,
                  phone: formData.primaryContactPhone || formData.phone,
                  position: formData.primaryContactPosition || 'Primary Contact',
                  isPrimary: true,
                }] : []
              } : {}),
              ...(hasStatusRole && formData.status !== undefined && formData.status !== null && formData.status !== ''
                ? { status: formData.status }
                : {}),
              ...(hasRatingRole && formData.rating !== undefined && formData.rating !== null && formData.rating !== ''
                ? { rating: Number(formData.rating) }
                : {}),
            };
          }}
          onSuccess={async () => {
            // Refresh entities list after successful update with current filters
            const filters = buildFilters();
            if (filters) {
              await fetchEntities(filters, { disableCache: true, sortArray: sortConfig });
            }
            setEditEntityId(null);
          }}
          onIncompleteSave={async () => {
            // Refresh entities list when form is saved as incomplete (without closing modal)
            const filters = buildFilters();
            if (filters) {
              await fetchEntities(filters, { disableCache: true, sortArray: sortConfig });
            }
          }}
          onClose={() => {
            setEditEntityId(null);
          }}
        />
      )}

      {/* Change Parent Picker */}
      {schema?.allowHierarchicalParent && entityForParentChange && (
        <PopupPicker
          isOpen={changeParentPickerOpen}
          onClose={() => {
            setChangeParentPickerOpen(false);
            setEntityForParentChange(null);
          }}
          schemaId={schema.id}
          schema={schema as any}
          onSelect={handleParentSelected}
          title={`Change parent for ${schema.singular_name || 'item'}`}
          description={`Select a new parent ${schema.singular_name || 'item'} for this ${schema.singular_name || 'item'}`}
          excludeIds={entityForParentChange?.id ? [String(entityForParentChange.id)] : []}
          selectedIds={getParentIdFromEntity(entityForParentChange) ? [getParentIdFromEntity(entityForParentChange)!] : []}
          canViewList={true}
          viewListUrl={`/page/${schema.id}`}
          allowMultiselect={false}
        />
      )}
      
      {/* Go to Top Button */}
      <GoToTop threshold={100} />

      {/* Repeating Section Dialog */}
      {repeatingSectionDialog.isOpen && (
        <RepeatingSectionDialog
          isOpen={repeatingSectionDialog.isOpen}
          onClose={() => setRepeatingSectionDialog({ ...repeatingSectionDialog, isOpen: false })}
          sectionId={repeatingSectionDialog.sectionId}
          sectionTitle={repeatingSectionDialog.sectionTitle}
          schema={schema}
          entityData={repeatingSectionDialog.entityData}
          entityId={repeatingSectionDialog.entityId}
        />
      )}
    </MainLayout>
  );
}

