// Dynamic Detail Page Renderer
// Renders detail pages dynamically based on schema metadata

import { motion } from 'framer-motion';
import React from 'react';
import { ArrowLeft, Edit, RefreshCw, Trash2, LayoutList } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { AvatarUser } from './AvatarUser';
import { Badge } from '../../../components/ui/badge';
import { GridBuilder } from '../../layout/grid-builder';
import { FormSchema, DetailPageSection, QuickAction } from '@/gradian-ui/schema-manager/types/form-schema';
import { DynamicInfoCard } from './DynamicInfoCard';
import { DynamicAiAgentResponseContainer } from './DynamicAiAgentResponseContainer';
import { ComponentRenderer } from './ComponentRenderer';
import { DynamicRepeatingTableViewer } from './DynamicRepeatingTableViewer';
import { resolveFieldById } from '../../form-builder/form-elements/utils/field-resolver';
import { getValueByRole, getSingleValueByRole, extractLabels, getArrayValuesByRole } from '../utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { getBadgeConfig, getValidBadgeVariant } from '../utils';
import { cn } from '../../shared/utils';
import { getDefaultSections } from '../../schema-manager/utils/badge-utils';
import { DynamicQuickActions } from './DynamicQuickActions';
import { GoToTop } from '../../layout/go-to-top';
import { Rating, Countdown } from '../../form-builder';
import { CodeBadge } from '../../form-builder/form-elements';
import { CopyContent } from '../../form-builder/form-elements/components/CopyContent';
import { FormModal } from '../../form-builder';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Skeleton } from '../../../components/ui/skeleton';
import Link from 'next/link';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { RepeatingTableRendererConfig } from '@/gradian-ui/schema-manager/types/form-schema';
import { normalizeOptionArray } from '../../form-builder/form-elements/utils/option-normalizer';
import { toast } from 'sonner';
import { EntityMetadata } from './CreateUpdateDetail';
import { BadgeViewer } from '../../form-builder/form-elements/utils/badge-viewer';
import { CardWrapper, CardHeader, CardContent, CardTitle } from '../card/components/CardWrapper';
import { EndLine } from '../../layout/end-line/components/EndLine';
import { EntityNotFound } from '@/gradian-ui/schema-manager/components';

export interface DynamicDetailPageRendererProps {
  schema: FormSchema;
  data: any;
  isLoading?: boolean;
  error?: string | null;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  backUrl?: string;
  disableAnimation?: boolean;
  className?: string;
  showBack?: boolean; // If true, show "Back" instead of schema name
  // Custom components registry
  customComponents?: Record<string, React.ComponentType<any>>;
  onRefreshData?: () => Promise<void> | void;
  preloadedSchemas?: FormSchema[];
  // Custom quick action handler - if returns true, action is handled and default handler is skipped
  customQuickActionHandler?: (action: QuickAction) => boolean | void;
}

/**
 * Get subtitle with icon for MainLayout
 */
export const getPageSubtitle = (schema: FormSchema, entityName: string): React.ReactNode => {
  if (!schema.icon) {
    return entityName;
  }
  
  return (
    <span className="flex items-center gap-1.5">
      <IconRenderer 
        iconName={schema.icon} 
        className="h-4 w-4 text-violet-600 dark:text-violet-300" 
      />
      <span>{entityName}</span>
    </span>
  );
};

const getDisplayStrings = (value: any): string[] => {
  const labels = extractLabels(value);
  if (labels.length > 0) {
    return labels;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry === null || entry === undefined) {
          return '';
        }
        if (typeof entry === 'object') {
          return entry.label ?? entry.name ?? entry.title ?? entry.id ?? '';
        }
        return String(entry);
      })
      .filter((entry): entry is string => Boolean(entry && entry.length > 0));
  }

  if (value && typeof value === 'object') {
    const fallback = value.label ?? value.name ?? value.title ?? value.id;
    if (fallback !== undefined && fallback !== null) {
      return [String(fallback)];
    }
  }

  if (value !== null && value !== undefined && value !== '') {
    return [String(value)];
  }

  return [];
};

const getPrimaryDisplayString = (value: any): string | null => {
  const strings = getDisplayStrings(value);
  return strings.length > 0 ? strings[0] : null;
};

const hasDisplayValue = (value: any): boolean => {
  const strings = getDisplayStrings(value);
  return strings.some((str) => str.trim() !== '');
};

/**
 * Get page title for MainLayout based on schema and data
 * Priority: 1) Field with role "title", 2) First text field (excluding code, subtitle, description), 3) id
 */
export const getPageTitle = (schema: FormSchema, data: any, dataId?: string): string => {
  if (!data) return dataId || 'Loading...';
  
  // 1. Check if role "title" exists in schema
  const hasTitleRole = schema?.fields?.some(field => field.role === 'title') || false;
  
  if (hasTitleRole) {
    // Use title role value
    const titleByRole = getValueByRole(schema, data, 'title');
    if (titleByRole && titleByRole.trim() !== '') {
      return titleByRole;
    }
  }
  
  // 2. Try to find first text field that doesn't have excluded roles (sorted by order)
  if (schema?.fields) {
    const excludedRoles = ['code', 'subtitle', 'description'];
    const textFields = schema.fields
      .filter(field => 
        field.component === 'text' && 
        (!field.role || !excludedRoles.includes(field.role)) &&
        hasDisplayValue(data[field.name])
      )
      .sort((a, b) => (a.order || 999) - (b.order || 999)); // Sort by order field
    
    if (textFields.length > 0) {
      const firstTextField = textFields[0];
      const value = data[firstTextField.name];
      const primary = getPrimaryDisplayString(value);
      if (primary) {
        return primary;
      }
      if (value && String(value).trim() !== '') {
        return String(value);
      }
    }
  }
  
  // 3. Fallback to id
  return dataId || data.id || 'Details';
};

/**
 * Get header information from schema and data
 */
const getHeaderInfo = (schema: FormSchema, data: any) => {
  // Get title - check if role "title" exists, otherwise use first text field
  const hasTitleRole = schema?.fields?.some(field => field.role === 'title') || false;
  let title: string = '';
  
  if (hasTitleRole) {
    // Use title role value
    title = getValueByRole(schema, data, 'title') || data.name || 'Details';
  } else {
    // Find first text field that doesn't have excluded roles (sorted by order)
    const excludedRoles = ['code', 'subtitle', 'description'];
    const textFields = schema?.fields
      ?.filter(field => 
        field.component === 'text' && 
        (!field.role || !excludedRoles.includes(field.role)) &&
        hasDisplayValue(data[field.name])
      )
      .sort((a, b) => (a.order || 999) - (b.order || 999)) || [];
    
    const firstTextField = textFields[0];
    
    if (firstTextField) {
      const fieldValue = data[firstTextField.name];
      const primary = getPrimaryDisplayString(fieldValue);
      title = primary ?? (fieldValue ? String(fieldValue).trim() : (data.name || 'Details'));
    } else {
      title = data.name || 'Details';
    }
  }
  // Get subtitle value(s) - concatenate multiple fields with same role using |
  const subtitleValue = getValueByRole(schema, data, 'subtitle') || data.email || '';
  const subtitleStrings = getDisplayStrings(subtitleValue);
  const subtitle = subtitleStrings.length > 0 ? subtitleStrings.join(' | ') : '';
  
  // Get avatar - try to get from field with role="avatar", then fallback to common field names
  let avatar: string | undefined = undefined;
  const avatarField = schema?.fields?.find(f => f.role === 'avatar');
  if (avatarField) {
    // Get the actual field value from data
    const avatarValue = data[avatarField.name];
    if (avatarValue && typeof avatarValue === 'string' && avatarValue.trim() !== '') {
      avatar = avatarValue;
    }
  }
  // Fallback to common avatar field names if not found
  if (!avatar) {
    avatar = data.avatarUrl || data.avatar || undefined;
  }
  
  const statusField = schema.fields?.find(f => f.role === 'status');
  const rawStatusValueFromField = statusField ? data?.[statusField.name] : undefined;
  const normalizedStatusOption =
    normalizeOptionArray(rawStatusValueFromField)[0] ??
    normalizeOptionArray(data?.status)[0];
  const statusValueFromRole = getSingleValueByRole(schema, data, 'status');
  const statusIdentifier =
    normalizedStatusOption?.id ??
    (typeof rawStatusValueFromField === 'string' || typeof rawStatusValueFromField === 'number'
      ? String(rawStatusValueFromField)
      : undefined) ??
    (typeof data?.status === 'string' || typeof data?.status === 'number'
      ? String(data.status)
      : undefined);
  const statusLabel =
    normalizedStatusOption?.label ??
    (statusValueFromRole && statusValueFromRole.trim() !== '' ? statusValueFromRole : undefined) ??
    getPrimaryDisplayString(rawStatusValueFromField) ??
    getPrimaryDisplayString(data?.status) ??
    statusIdentifier ??
    '';
  const status = statusLabel;
  const rating = getSingleValueByRole(schema, data, 'rating') || data.rating || 0;
  const codeFieldExists = schema?.fields?.some(field => field.role === 'code');
  
  // Get duedate value - check by role 'duedate' OR by schema allowDataDueDate property OR direct data.dueDate/expirationDate
  // Check both camelCase (dueDate) and lowercase (duedate) variations
  const duedateField = schema?.fields?.find(f => f.role === 'duedate' || f.name === 'dueDate' || f.name === 'duedate');
  const duedateValueFromRole = duedateField ? (data[duedateField.name] || data.dueDate || data.duedate) : null;
  const duedateValue = duedateValueFromRole || 
                       (schema?.allowDataDueDate ? (data.dueDate || data.duedate || null) : null) || 
                       data.dueDate || 
                       data.duedate || 
                       data.expirationDate;
  
  // Validate that duedate is a valid date value (not empty string, null, or undefined)
  // Check if it's a valid string or Date object, and if string, ensure it's not empty
  let duedate: string | Date | null = null;
  if (duedateValue) {
    if (duedateValue instanceof Date) {
      duedate = duedateValue;
    } else if (typeof duedateValue === 'string' && duedateValue.trim() !== '') {
      // Try to parse the date string to ensure it's valid
      const parsedDate = new Date(duedateValue);
      if (!isNaN(parsedDate.getTime())) {
        duedate = duedateValue;
      }
    }
  }

  const codeValueRaw = codeFieldExists ? (getSingleValueByRole(schema, data, 'code') || data.code || '') : '';
  const codeDisplayStrings = getDisplayStrings(codeValueRaw);
  const code = codeDisplayStrings.length > 0 ? codeDisplayStrings[0] : '';

  const statusOptions = statusField?.options;

  // Entity Type handling (similar to status)
  const entityTypeField = schema.fields?.find(f => f.role === 'entityType');
  const hasEntityTypeGroup = Array.isArray(schema?.entityTypeGroup) && schema.entityTypeGroup.length > 0;
  const rawEntityTypeValueFromField = entityTypeField ? data?.[entityTypeField.name] : undefined;
  const normalizedEntityTypeOption =
    normalizeOptionArray(rawEntityTypeValueFromField)[0] ??
    normalizeOptionArray(data?.entityType)[0];
  const entityTypeValueFromRole = getSingleValueByRole(schema, data, 'entityType');
  const entityTypeIdentifier =
    normalizedEntityTypeOption?.id ??
    (typeof rawEntityTypeValueFromField === 'string' || typeof rawEntityTypeValueFromField === 'number'
      ? String(rawEntityTypeValueFromField)
      : undefined) ??
    (typeof data?.entityType === 'string' || typeof data?.entityType === 'number'
      ? String(data.entityType)
      : undefined);
  const entityTypeLabel =
    normalizedEntityTypeOption?.label ??
    (entityTypeValueFromRole && entityTypeValueFromRole.trim() !== '' ? entityTypeValueFromRole : undefined) ??
    getPrimaryDisplayString(rawEntityTypeValueFromField) ??
    getPrimaryDisplayString(data?.entityType) ??
    entityTypeIdentifier ??
    '';

  // Get person field (assignedTo)
  const personFieldDef = schema.fields?.find(field => field.role === 'person');
  const personValue = personFieldDef ? (data[personFieldDef.name] || data.assignedTo) : (data.assignedTo || null);
  let personField: any = null;
  if (personValue) {
    const normalizedPerson = normalizeOptionArray(personValue)[0];
    if (normalizedPerson) {
      personField = {
        ...normalizedPerson,
        ...normalizedPerson.normalized,
        ...personValue,
        label: normalizedPerson.label || normalizedPerson.normalized?.label || personValue?.label || personValue?.name || personValue?.email || 'Unknown',
        avatar: normalizedPerson.avatar || normalizedPerson.normalized?.avatar || personValue?.avatar || personValue?.image || personValue?.avatarUrl || null,
        avatarUrl: normalizedPerson.avatar || normalizedPerson.normalized?.avatar || personValue?.avatar || personValue?.image || personValue?.avatarUrl || null,
        id: normalizedPerson.id || normalizedPerson.normalized?.id || personValue?.id || null,
        email: normalizedPerson.email || normalizedPerson.normalized?.email || personValue?.email || null,
        firstName: normalizedPerson.firstName || normalizedPerson.normalized?.firstName || personValue?.firstName || null,
        lastName: normalizedPerson.lastName || normalizedPerson.normalized?.lastName || personValue?.lastName || null,
        username: normalizedPerson.username || normalizedPerson.normalized?.username || personValue?.username || null,
        postTitle: normalizedPerson.postTitle || normalizedPerson.normalized?.postTitle || personValue?.postTitle || null,
        company: normalizedPerson.company || normalizedPerson.normalized?.company || personValue?.company || null,
      };
    } else if (personValue && typeof personValue === 'object') {
      personField = {
        label: personValue.label || personValue.name || personValue.email || 'Unknown',
        avatar: personValue.avatar || personValue.image || personValue.avatarUrl || null,
        avatarUrl: personValue.avatar || personValue.image || personValue.avatarUrl || null,
        id: personValue.id || null,
        email: personValue.email || null,
        firstName: personValue.firstName || null,
        lastName: personValue.lastName || null,
        username: personValue.username || null,
        postTitle: personValue.postTitle || null,
        company: personValue.company || null,
        ...personValue,
      };
    }
  }

  return {
    title,
    subtitle,
    avatar: avatar || undefined, // Ensure avatar is string | undefined
    status,
    rating,
    duedate,
    code,
    personField,
    statusOptions,
    statusMetadata: {
      color: normalizedStatusOption?.color,
      icon: normalizedStatusOption?.icon,
      label: statusLabel,
      value: statusIdentifier ?? statusLabel ?? '',
    },
    entityType: entityTypeLabel,
    entityTypeMetadata: {
      color: normalizedEntityTypeOption?.color ?? 'purple',
      icon: normalizedEntityTypeOption?.icon ?? 'Tag',
      label: entityTypeLabel,
      value: entityTypeIdentifier ?? entityTypeLabel ?? '',
    },
    hasEntityTypeGroup,
    entityTypeField,
  };
};

/**
 * Get initials from name or avatar field
 * Maximum 3 characters: first two words + last word if more than 2 words
 */
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) return '?';
  
  if (words.length === 1) {
    // Single word: take first two characters
    return words[0].substring(0, 2).toUpperCase();
  }
  
  if (words.length === 2) {
    // Two words: take first letter of each
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  // More than 2 words: first letter of first two words + first letter of last word
  return (words[0][0] + words[1][0] + words[words.length - 1][0]).toUpperCase();
};

const skeletonCardClass =
  'bg-white border border-gray-200 dark:bg-gray-900/50 dark:border-gray-800 rounded-lg shadow-sm';
const skeletonSubtleSectionClass =
  'bg-gray-50/50 border-b border-gray-200 dark:bg-gray-900/40 dark:border-gray-800';

export const DynamicDetailPageRenderer: React.FC<DynamicDetailPageRendererProps> = ({
  schema,
  data,
  isLoading = false,
  error = null,
  onBack,
  onEdit,
  onDelete,
  backUrl,
  disableAnimation = false,
  className,
  showBack = false,
  customComponents = {},
  onRefreshData,
  preloadedSchemas = [],
  customQuickActionHandler,
}) => {
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [relatedSchemas, setRelatedSchemas] = useState<string[]>([]);
  const [isLoadingAutoTables, setIsLoadingAutoTables] = useState(false);
  const [targetSchemaCache, setTargetSchemaCache] = useState<Record<string, FormSchema>>(() => {
    const cache: Record<string, FormSchema> = {};
    preloadedSchemas.forEach((schema) => {
      if (schema?.id) {
        cache[schema.id] = schema;
      }
    });
    return cache;
  });
  const detailMetadata = schema.detailPageMetadata;
  const quickActions = detailMetadata?.quickActions || [];
  
  // Debug: Log customQuickActionHandler
  React.useEffect(() => {
    console.log('[DynamicDetailPageRenderer] customQuickActionHandler:', !!customQuickActionHandler, typeof customQuickActionHandler);
  }, [customQuickActionHandler]);
  // Extract ai-agent-response actions (these are rendered as separate card sections)
  const aiAgentResponseActions = quickActions.filter(
    (action) => action.componentType === 'ai-agent-response' && action.action === 'runAiAgent'
  );
  
  const isFetchingRef = useRef(false);
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshLabel = schema.singular_name || 'Record';

  const handleRefreshAction = useCallback(async () => {
    if (!onRefreshData) {
      return;
    }

    const toastId = toast.loading(`Refreshing ${refreshLabel.toLowerCase()}...`);
    setIsRefreshing(true);
    try {
      await Promise.resolve(onRefreshData());
      toast.success(`${refreshLabel} updated`, { id: toastId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshData, refreshLabel]);

  useEffect(() => {
    if (!preloadedSchemas.length) {
      return;
    }
    setTargetSchemaCache((prev) => {
      let hasChanges = false;
      const next = { ...prev };
      preloadedSchemas.forEach((schema) => {
        if (schema?.id && !next[schema.id]) {
          next[schema.id] = schema;
          hasChanges = true;
        }
      });
      return hasChanges ? next : prev;
    });
  }, [preloadedSchemas]);
  
  // Memoize tableRenderers to prevent infinite loops - use stable reference
  const tableRenderersFromMetadata = useMemo(() => {
    return detailMetadata?.tableRenderers || [];
  }, [detailMetadata?.tableRenderers]);

  // Automatically create tableRenderers for repeating sections that don't have explicit tableRenderer configurations
  const autoTableRenderers = useMemo(() => {
    if (!schema?.sections) return [];
    
    const repeatingSections = schema.sections.filter(section => section.isRepeatingSection);
    const explicitSectionIds = new Set(tableRenderersFromMetadata.map(tr => tr.sectionId));
    
    return repeatingSections
      .filter(section => !explicitSectionIds.has(section.id))
      .map(section => {
        const isRelationBased = !!(section.repeatingConfig?.targetSchema && section.repeatingConfig?.relationTypeId);
        const tableRenderer: RepeatingTableRendererConfig = {
          id: `auto-table-${section.id}`,
          schemaId: schema.id,
          sectionId: section.id,
          title: section.title || section.id,
          description: section.description,
          ...(isRelationBased && section.repeatingConfig ? {
            targetSchema: section.repeatingConfig.targetSchema,
            relationTypeId: section.repeatingConfig.relationTypeId,
          } : {}),
        };
        return tableRenderer;
      });
  }, [schema?.sections, schema?.id, tableRenderersFromMetadata]);

  // Combine explicit and auto-generated table renderers
  const allTableRenderers = useMemo(() => {
    return [...tableRenderersFromMetadata, ...autoTableRenderers];
  }, [tableRenderersFromMetadata, autoTableRenderers]);

  // Handle edit - use EditModal component
  const handleEdit = useCallback(() => {
    if (data?.id && schema?.id) {
      setEditEntityId(data.id);
      // Call original onEdit if provided (for external handling)
      onEdit?.();
    }
  }, [data?.id, schema?.id, onEdit]);

  // Memoize covered target schemas to prevent unnecessary re-renders
  const coveredTargetSchemasSet = useMemo(() => {
    return new Set(
      allTableRenderers
        .filter((tr) => tr.targetSchema)
        .map((tr) => tr.targetSchema!)
    );
  }, [allTableRenderers]);

  // Fetch all relations and find distinct related schemas
  // This must be called unconditionally and early in the component to maintain hook order
  useEffect(() => {
    const fetchRelatedSchemas = async () => {
      if (!data?.id || !schema?.id || isLoading || isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setIsLoadingAutoTables(true);
      try {
        // Fetch all relations for this entity (both as source and target)
        const relationsResponse = await apiRequest<
          Array<{
            schema: string;
            direction: 'source' | 'target';
            relation_type: string;
            data: any[];
            sourceSchema?: string;
            targetSchema?: string;
          }>
        >(`/api/data/all-relations?schema=${schema.id}&id=${data.id}&direction=both`);

        if (!relationsResponse.success || !Array.isArray(relationsResponse.data)) {
          setRelatedSchemas([]);
          setIsLoadingAutoTables(false);
          isFetchingRef.current = false;
          return;
        }

        const groupedRelations = relationsResponse.data;

        // Sort relations to show targets first, then sources
        const sortedRelations = [...groupedRelations].sort((a, b) => {
          // Targets (direction === 'target') come first
          const aIsTarget = a.direction === 'target';
          const bIsTarget = b.direction === 'target';
          if (aIsTarget && !bIsTarget) return -1;
          if (!aIsTarget && bIsTarget) return 1;
          // If both are same direction, maintain original order
          return 0;
        });

        const relatedSchemasSet = new Set<string>();
        sortedRelations.forEach((group) => {
          let schemaToUse: string | undefined;

          if (group.direction === 'source') {
            schemaToUse = group.targetSchema || group.schema;
          } else if (group.direction === 'target') {
            schemaToUse = group.sourceSchema || group.schema;
          } else {
            schemaToUse = group.targetSchema || group.schema;
          }

          if (schemaToUse) {
            relatedSchemasSet.add(schemaToUse);
          }
        });

        // Filter out schemas already covered by tableRenderers
        const uncoveredSchemas = Array.from(relatedSchemasSet).filter(
          (targetSchema) => !coveredTargetSchemasSet.has(targetSchema)
        );

        setRelatedSchemas(uncoveredSchemas);
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error fetching related schemas: ${error instanceof Error ? error.message : String(error)}`);
        setRelatedSchemas([]);
      } finally {
        setIsLoadingAutoTables(false);
        isFetchingRef.current = false;
      }
    };

    fetchRelatedSchemas();
  }, [data?.id, schema?.id, coveredTargetSchemasSet, isLoading]);

  const requiredTargetSchemaIds = useMemo(() => {
    const ids = new Set<string>();
    allTableRenderers.forEach((renderer) => {
      if (renderer.targetSchema) {
        ids.add(renderer.targetSchema);
      }
    });
    relatedSchemas.forEach((schemaId) => ids.add(schemaId));
    ids.delete(schema?.id || '');
    return Array.from(ids);
  }, [relatedSchemas, allTableRenderers, schema?.id]);

  useEffect(() => {
    if (!requiredTargetSchemaIds.length) {
      return;
    }

    const missingSchemaIds = requiredTargetSchemaIds.filter(
      (schemaId) => schemaId && !targetSchemaCache[schemaId]
    );

    if (missingSchemaIds.length === 0) {
      return;
    }

    const fetchSchemas = async () => {
      try {
        const response = await apiRequest<FormSchema[]>(
          `/api/schemas?schemaIds=${missingSchemaIds.join(',')}`
        );
        if (response.success && Array.isArray(response.data)) {
          setTargetSchemaCache((prev) => {
            const next = { ...prev };
            response.data?.forEach((schema) => {
              if (schema?.id) {
                next[schema.id] = schema;
              }
            });
            return next;
          });
        }
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error preloading related schemas: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    fetchSchemas();
  }, [requiredTargetSchemaIds, targetSchemaCache]);

  // Default layout values (can be overridden in detailPageMetadata if needed)
  const mainColumns = 2 as 1 | 2 | 3;
  const sidebarColumns = 1 as 1 | 2;
  // Calculate totalColumns from mainColumns + sidebarColumns
  const totalColumns = (mainColumns + sidebarColumns) as 2 | 3 | 4;
  const gap = 6;

  // Default header values (can be overridden if needed)
  const showBackButton = true;
  const showActions = true;

  // Check if this is a standalone page (no data required)
  // Standalone pages are identified by having detailPageMetadata but no required data
  const isStandalonePage = !schema.fields || schema.fields.length === 0 || 
    (detailMetadata && (!data || Object.keys(data).length === 0) && !error);

  // For standalone pages without data, use empty object
  const pageData = isStandalonePage && !data ? {} : data;

  const headerInfo = pageData ? getHeaderInfo(schema, pageData) : {
    title: '',
    subtitle: '',
    avatar: undefined,
    status: '',
    rating: 0,
    duedate: null,
    code: '',
    personField: null,
    statusOptions: undefined,
    statusMetadata: undefined,
    entityType: '',
    entityTypeMetadata: undefined,
    hasEntityTypeGroup: false,
    entityTypeField: undefined,
  };
  const headerStatusRoleValues = getArrayValuesByRole(schema, pageData, 'status');
  const headerStatusArray = headerStatusRoleValues.length > 0
    ? headerStatusRoleValues
    : Array.isArray(pageData?.status)
      ? pageData.status
      : pageData?.status
        ? [pageData.status]
        : [];
  const headerStatusObject = headerStatusArray[0] || null;
  const badgeConfig = headerStatusObject
    ? {
        color: headerStatusObject.color ?? 'default',
        icon: headerStatusObject.icon,
        label: headerStatusObject.label ?? headerStatusObject.id ?? '',
        value: headerStatusObject.id ?? headerStatusObject.label ?? '',
      }
    : headerInfo.statusMetadata
      ? {
          value: headerInfo.statusMetadata.value,
          label: headerInfo.statusMetadata.label ?? headerInfo.status,
          icon: headerInfo.statusMetadata.icon,
          color: headerInfo.statusMetadata.color ?? 'outline',
        }
      : getBadgeConfig(headerInfo.status, headerInfo.statusOptions);
  
  // Entity type badge config
  const entityTypeBadgeConfig = headerInfo.entityTypeMetadata
    ? {
        value: headerInfo.entityTypeMetadata.value,
        label: headerInfo.entityTypeMetadata.label ?? headerInfo.entityType,
        icon: headerInfo.entityTypeMetadata.icon,
        color: headerInfo.entityTypeMetadata.color ?? 'purple',
      }
    : null;
  
  // Check if avatar field exists in schema
  const hasAvatarField = schema?.fields?.some(field => field.role === 'avatar') || false;
  const duedateFieldLabel = schema?.fields?.find(field => field.role === 'duedate' || field.name === 'dueDate')?.label || 'Due Date';
  const hasRating = headerInfo.rating > 0;
  const hasStatusBadge =
    Boolean(headerInfo.status && headerInfo.status.trim() !== '') ||
    Boolean(headerInfo.statusMetadata?.label) ||
    Boolean(badgeConfig?.label);

  const hasEntityTypeBadge =
    Boolean(headerInfo.entityType && headerInfo.entityType.trim() !== '') ||
    Boolean(headerInfo.entityTypeMetadata?.label) ||
    Boolean(entityTypeBadgeConfig?.label);

  // Check if entity is incomplete
  const isIncomplete = pageData?.incomplete === true;

  // Check for related companies and tenants
  const hasRelatedCompanies = schema?.canSelectMultiCompanies && pageData?.relatedCompanies && Array.isArray(pageData.relatedCompanies) && pageData.relatedCompanies.length > 0;
  const hasRelatedTenants = schema?.allowDataRelatedTenants && pageData?.relatedTenants && Array.isArray(pageData.relatedTenants) && pageData.relatedTenants.length > 0;
  const relatedCompaniesValue = hasRelatedCompanies ? normalizeOptionArray(pageData.relatedCompanies) : [];
  const relatedTenantsValue = hasRelatedTenants ? normalizeOptionArray(pageData.relatedTenants) : [];

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const previousTitle = document.title;
    const schemaTitle = schema?.plural_name || schema?.title || schema?.name || 'Schema';
    const dynamicTitle = headerInfo.title || headerInfo.subtitle || headerInfo.code || pageData?.name || '';
    const fullTitle = dynamicTitle
      ? `${schemaTitle} - ${dynamicTitle} | Gradian`
      : `${schemaTitle} | Gradian`;

    document.title = fullTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [schema?.plural_name, schema?.title, schema?.name, headerInfo.title, headerInfo.subtitle, headerInfo.code, pageData?.name]);

  // Show skeleton when loading or refreshing
  if (isLoading || isRefreshing) {
    const detailMetadata = schema?.detailPageMetadata;
    const hasSidebar = (detailMetadata?.quickActions?.length ?? 0) > 0 || 
                      detailMetadata?.sections?.some(s => s.columnArea === 'sidebar');
    
    return (
      <div className={cn("container mx-auto px-4 py-6", className)}>
        <div className="space-y-6 pb-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center flex-col w-full">
              <div className="flex items-center justify-between w-full">
                {/* Back button skeleton */}
                {showBackButton && (
                  <Skeleton className="h-10 w-24" />
                )}
                {/* Action buttons skeleton */}
                {showActions && (
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-20" />
                  </div>
                )}
              </div>
              
              {/* Header content skeleton */}
              <div className="flex items-center space-x-2 justify-between py-4 w-full flex-row flex-wrap gap-2">
                <div className="flex items-center space-x-4">
                  {/* Avatar skeleton */}
                  {schema?.fields?.some(field => field.role === 'avatar') && (
                    <Skeleton className="h-16 w-16 rounded-full shrink-0" />
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-row flex-wrap">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          {hasSidebar ? (
            <div className={cn(
              "grid gap-6",
              totalColumns === 2 && "grid-cols-1 md:grid-cols-2",
              totalColumns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
              totalColumns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
            )}>
              {/* Main Content Area */}
              <div className={cn(
                "space-y-6",
                mainColumns === 2 && "md:col-span-2",
                mainColumns === 3 && "md:col-span-2 lg:col-span-3",
                mainColumns === 1 && "md:col-span-1"
              )}>
                {/* Component Renderers Skeleton */}
                {(detailMetadata?.componentRenderers?.length || 0) > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: Math.min(detailMetadata?.componentRenderers?.length || 2, 4) }).map((_, index) => (
                      <div key={index} className={`${skeletonCardClass} p-6`}>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Info Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className={`${skeletonCardClass} p-6`}>
                      <div className="space-y-4">
                        <Skeleton className="h-5 w-32" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Skeleton */}
              {hasSidebar && (
                <div className={cn(
                  "space-y-6",
                  sidebarColumns === 1 && "md:col-span-1",
                  sidebarColumns === 2 && "md:col-span-2",
                  !sidebarColumns && "md:col-span-1"
                )}>
                  {/* Quick Actions Skeleton */}
                  {(detailMetadata?.quickActions?.length ?? 0) > 0 && (
                    <div className={`${skeletonCardClass} p-6`}>
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-32" />
                        {Array.from({ length: Math.min(detailMetadata?.quickActions?.length ?? 0, 3) }).map((_, index) => (
                          <Skeleton key={index} className="h-10 w-full" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sidebar Info Card Skeleton */}
                  <div className={`${skeletonCardClass} p-6`}>
                    <div className="space-y-4">
                      <Skeleton className="h-5 w-32" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Component Renderers Skeleton */}
              {(detailMetadata?.componentRenderers?.length || 0) > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: Math.min(detailMetadata?.componentRenderers?.length || 2, 4) }).map((_, index) => (
                    <div key={index} className={`${skeletonCardClass} p-6`}>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className={`${skeletonCardClass} p-6`}>
                    <div className="space-y-4">
                      <Skeleton className="h-5 w-32" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Renderers Skeleton */}
              {(detailMetadata?.tableRenderers?.length || 0) > 0 && (
                <div className="space-y-6 mt-6">
                  {Array.from({ length: detailMetadata?.tableRenderers?.length || 1 }).map((_, index) => (
                    <div key={index} className={skeletonCardClass}>
                      <div className={`${skeletonSubtleSectionClass} p-4`}>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-8 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-48 mt-2" />
                      </div>
                      <div className="p-4">
                        <div className="space-y-2">
                          {Array.from({ length: 5 }).map((_, rowIndex) => (
                            <div key={rowIndex} className="flex gap-4">
                              {Array.from({ length: 4 }).map((_, colIndex) => (
                                <Skeleton key={colIndex} className="h-4 flex-1" />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Table Renderers Skeleton (if not already shown) */}
          {hasSidebar && (detailMetadata?.tableRenderers?.length || 0) > 0 && (
            <div className="space-y-6 mt-6">
              {Array.from({ length: detailMetadata?.tableRenderers?.length || 1 }).map((_, index) => (
                <div key={index} className={skeletonCardClass}>
                  <div className={`${skeletonSubtleSectionClass} p-4`}>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-48 mt-2" />
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, rowIndex) => (
                        <div key={rowIndex} className="flex gap-4">
                          {Array.from({ length: 4 }).map((_, colIndex) => (
                            <Skeleton key={colIndex} className="h-4 flex-1" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Only show error if not refreshing and not a standalone page
  // Standalone pages can render without data
  if (error && !isRefreshing && !isStandalonePage) {
    const entityName = schema.singular_name || schema.name || 'Entity';
    // Try to extract entity ID from data, URL, or error message
    const entityId = data?.id || (() => {
      if (typeof window !== 'undefined') {
        const pathParts = window.location.pathname.split('/');
        const dataIdIndex = pathParts.findIndex(part => part === schema.id) + 1;
        if (dataIdIndex > 0 && pathParts[dataIdIndex]) {
          return pathParts[dataIdIndex];
        }
      }
      // Try to extract from error message
      const idMatch = error.match(/ID\s+"([^"]+)"/);
      return idMatch ? idMatch[1] : null;
    })();
    
    const isNotFound = error.toLowerCase().includes('not found') || 
                      error.toLowerCase().includes('doesn\'t exist') ||
                      error.toLowerCase().includes('doesn\'t exist');
    
    return (
      <EntityNotFound
        entityName={entityName}
        entityId={entityId || undefined}
        description={isNotFound ? undefined : error}
        listHref={schema.id ? `/page/${schema.id}` : undefined}
        showListButton={!!schema.id}
        onGoBack={onBack}
        showGoBackButton={!!onBack}
        onRefresh={onRefreshData}
        refreshing={isRefreshing}
        errorCodeText={isNotFound ? `${entityName} Not Found` : 'Error Loading Entity'}
      />
    );
  }

  // Separate sections, component renderers, and table renderers
  const metadataSections = detailMetadata?.sections || [];
  const componentRenderers = detailMetadata?.componentRenderers || [];
  // Use allTableRenderers (includes both explicit and auto-generated) for rendering
  const tableRenderers = allTableRenderers;
  // quickActions already extracted above for debugging

  // Get default sections (includes badges if schema has badge fields)
  const defaultSections = getDefaultSections(schema);

  // Filter out default sections that already exist in metadata to avoid duplicates
  const defaultSectionIds = new Set(defaultSections.map(s => s.id));
  const filteredDefaultSections = defaultSections.filter(
    defaultSection => !metadataSections.some(metaSection => metaSection.id === defaultSection.id)
  );

  // If no metadata sections are defined, create default sections from all fields
  let sections: DetailPageSection[] = [];
  if (metadataSections.length === 0 && (!detailMetadata || !detailMetadata.sections)) {
    // Fields to exclude (already shown in header or special fields)
    // Note: 'description' removed from excluded roles to allow textarea fields to display
    const excludedRoles = ['title', 'subtitle', 'avatar', 'status', 'rating', 'duedate', 'code', 'person'];
    
    // Get all fields that should be displayed
    const displayableFields = schema?.fields?.filter(field => {
      // Exclude fields with excluded roles
      if (field.role && excludedRoles.includes(field.role)) {
        return false;
      }
      // Exclude repeating section fields (they should be in table renderers)
      if (field.sectionId) {
        const section = schema.sections?.find(s => s.id === field.sectionId);
        if (section?.isRepeatingSection) {
          return false;
        }
      }
      return true;
    }) || [];

    // Group fields by sectionId
    const fieldsBySection = new Map<string, any[]>();
    displayableFields.forEach(field => {
      const sectionId = field.sectionId || 'default';
      if (!fieldsBySection.has(sectionId)) {
        fieldsBySection.set(sectionId, []);
      }
      fieldsBySection.get(sectionId)!.push(field);
    });

    // Create sections from grouped fields
    fieldsBySection.forEach((fields, sectionId) => {
      // Get section title from schema or use default
      const schemaSection = schema.sections?.find(s => s.id === sectionId);
      const sectionTitle = schemaSection?.title || 'Information';
      
      sections.push({
        id: sectionId,
        title: sectionTitle,
        colSpan: 1,
        fieldIds: fields.map(f => f.id).filter(Boolean)
      });
    });

    // Sort sections to maintain order from schema
    if (schema.sections) {
      const sectionOrder = new Map(schema.sections.map((s, idx) => [s.id, idx]));
      sections.sort((a, b) => {
        const orderA = sectionOrder.get(a.id) ?? 999;
        const orderB = sectionOrder.get(b.id) ?? 999;
        return orderA - orderB;
      });
    }
  } else {
    // Use existing sections (default + metadata)
    sections = [...filteredDefaultSections, ...metadataSections];
  }

  // Group component renderers by whether they should be in the main area or sidebar
  // For now, all components go in the main area unless specified otherwise
  const mainComponents = componentRenderers.filter((comp, index) => index < mainColumns * 2);
  const sidebarComponents = componentRenderers.slice(mainColumns * 2);

  // Determine if sidebar should be shown - only show if we have actual sidebar content (sections, quick actions, or sidebar components)
  // Table renderers are always full width and rendered after all components and sections, so they don't affect sidebar
  const hasSidebarSections = sections.some(s => s.columnArea === 'sidebar');
  const hasSidebarContent = hasSidebarSections || quickActions.length > 0 || sidebarComponents.length > 0;
  // Only use grid layout if we actually have sidebar content to display
  const hasSidebar = hasSidebarContent;

  // If there's no sidebar sections, set all sections to colSpan: 1 for full width
  // But keep colSpan: 2 if explicitly set when there IS a sidebar
  if (!hasSidebarSections) {
    sections = sections.map(s => ({
      ...s,
      colSpan: 1
    }));
  }

  // Split sections between main and sidebar if needed
  // Use columnArea property if specified, otherwise use fallback logic
  const sectionsForMain = hasSidebar
    ? sections.filter((s, index) => s.columnArea === 'main' || (!s.columnArea && (index < Math.ceil(sections.length / 2) || s.colSpan === 2)))
    : sections;
  const sectionsForSidebar = hasSidebar
    ? sections.filter((s, index) => s.columnArea === 'sidebar' || (!s.columnArea && (index >= Math.ceil(sections.length / 2) && s.colSpan !== 2)))
    : [];

  // Table renderers are always full width and rendered after all components and sections
  // No need to split them by columnArea

  return (
    <div className={cn("container mx-auto px-4 py-6 w-full max-w-full overflow-x-hidden", className)}>
      <div className="space-y-6 pb-6 w-full min-w-0">
        {/* Header */}
        <motion.div
          initial={disableAnimation ? false : { opacity: 0, y: 20 }}
          animate={disableAnimation ? false : { opacity: 1, y: 0 }}
          transition={disableAnimation ? {} : { duration: 0.3 }}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center  flex-col w-full">
            <div className='flex items-center justify-between w-full'>
              {showBackButton && (onBack || backUrl) && (
                <Button
                  variant="ghost"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4 me-2" />
                  {showBack ? 'Back' : (schema.plural_name || 'Back')}
                </Button>
              )}

              {showActions && (onEdit || onDelete || onRefreshData || schema?.id) && (
                <div className="flex items-center space-x-2">
                  {schema?.id && (
                    <Button variant="outline" asChild className="px-4 py-2 gap-2">
                      <Link href={`/page/${schema.id}`}>
                        <LayoutList className="h-4 w-4" />
                        <span className="hidden md:block">View List</span>
                      </Link>
                    </Button>
                  )}
                  {onRefreshData && (
                    <Button
                      variant="outline"
                      onClick={handleRefreshAction}
                      disabled={isRefreshing}
                      className="px-4 py-2 gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="hidden md:block">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </Button>
                  )}
                  {onEdit && (
                    <Button variant="outline" onClick={handleEdit} className="px-4 py-2 gap-2">
                      <Edit className="h-4 w-4  " />
                      <span className='hidden md:block'>Edit</span>
                    </Button>
                  )}
                  {onDelete && (
                    <Button variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700 px-4 py-2 gap-2">
                      <Trash2 className="h-4 w-4 " />
                      <span className='hidden md:block'>Delete</span>
                    </Button>
                  )}
                </div>
              )}

            </div>
            <div className="flex items-center space-x-2 justify-between py-4 w-full flex-row flex-wrap gap-2">
              <div className="flex items-center space-x-4">
                {hasAvatarField && (
                <Avatar className="h-16 w-16">
                  {headerInfo.avatar ? (
                    // Check if avatar is a URL (starts with http:// or https://)
                    headerInfo.avatar.startsWith('http://') || headerInfo.avatar.startsWith('https://') ? (
                      <AvatarImage src={headerInfo.avatar} alt={headerInfo.title || 'Avatar'} />
                    ) : (
                      // Otherwise, treat as a path and construct the full path
                      <AvatarImage src={`/avatars/${headerInfo.avatar.toLowerCase().replace(/\s+/g, '-')}.jpg`} alt={headerInfo.title || 'Avatar'} />
                    )
                  ) : null}
                  <AvatarFallback>{getInitials(headerInfo.title || headerInfo.avatar || '?')}</AvatarFallback>
                </Avatar>
                )}
                <div>
                  <motion.div
                    className="flex items-center gap-2"
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.15 }}
                  >
                    <motion.div
                      className="flex items-center gap-2"
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                    >
                      <motion.h1
                        className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.15 }}
                      >
                        {headerInfo.title}
                      </motion.h1>
                      {headerInfo.title && (
                        <CopyContent content={headerInfo.title} />
                      )}
                    </motion.div>
                    {headerInfo.code && (
                      <CodeBadge code={headerInfo.code} />
                    )}
                  </motion.div>
                  {headerInfo.subtitle && (
                    <motion.p
                      className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                    >
                      {headerInfo.subtitle}
                    </motion.p>
                  )}
                  {/* Entity Metadata */}
                  <motion.div
                    className="mt-2"
                    initial={disableAnimation ? false : { opacity: 0, y: 5 }}
                    animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                    transition={disableAnimation ? {} : { duration: 0.3, delay: 0.1 }}
                  >
                    <EntityMetadata
                      createdAt={pageData?.createdAt}
                      createdBy={pageData?.createdBy}
                      updatedAt={pageData?.updatedAt}
                      updatedBy={pageData?.updatedBy}
                      variant="compact"
                      avatarType="user"
                    />
                  </motion.div>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-row flex-wrap">
                {headerInfo.personField && (
                  <div className="me-2 flex items-center gap-2">
                    <AvatarUser
                      user={headerInfo.personField}
                      avatarType="user"
                      size="md"
                      showDialog={true}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{headerInfo.personField.label}</span>
                  </div>
                )}
                {headerInfo.duedate && (
                  <div className="me-2">
                    <Countdown
                      expireDate={headerInfo.duedate}
                      includeTime={true}
                      size="sm"
                      showIcon={true}
                      fieldLabel={duedateFieldLabel}
                    />
                  </div>
                )}
              {(hasRating || hasStatusBadge || hasEntityTypeBadge || isIncomplete) && (
                <div className="flex items-end flex-col justify-end gap-2">
                  {hasRating && (
                    <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                      <Rating
                        value={headerInfo.rating}
                        maxValue={5}
                        size="md"
                        showValue={true}
                      />
                    </motion.div>
                  )}
                  {isIncomplete && (
                    <motion.div
                      initial={disableAnimation ? false : { opacity: 0, scale: 0.8, y: 5 }}
                      animate={disableAnimation ? false : { opacity: 1, scale: 1, y: 0 }}
                      transition={disableAnimation ? {} : {
                        duration: 0.3,
                        delay: 0.15,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={disableAnimation ? undefined : { x: 2, scale: 1.05 }}
                    >
                      <Badge variant="warning" className="flex items-center gap-1">
                        <IconRenderer iconName="AlertTriangle" className="h-3 w-3" />
                        <span className="text-xs">Incomplete</span>
                      </Badge>
                    </motion.div>
                  )}
                  {hasStatusBadge ? (
                    <motion.div
                      initial={disableAnimation ? false : { opacity: 0, scale: 0.8, y: 5 }}
                      animate={disableAnimation ? false : { opacity: 1, scale: 1, y: 0 }}
                      transition={disableAnimation ? {} : {
                        duration: 0.3,
                        delay: 0.2,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={disableAnimation ? undefined : { x: 2, scale: 1.05 }}
                    >
                      <Badge variant={badgeConfig.color ?? 'outline'}>
                        {badgeConfig.icon && (
                          <IconRenderer iconName={badgeConfig.icon} className="h-3 w-3 me-1" />
                        )}
                        <span className="text-xs">{badgeConfig.label}</span>
                      </Badge>
                    </motion.div>
                  ) : null}
                  {hasEntityTypeBadge && entityTypeBadgeConfig ? (
                    <motion.div
                      initial={disableAnimation ? false : { opacity: 0, scale: 0.8, y: 5 }}
                      animate={disableAnimation ? false : { opacity: 1, scale: 1, y: 0 }}
                      transition={disableAnimation ? {} : {
                        duration: 0.3,
                        delay: 0.25,
                        ease: [0.25, 0.46, 0.45, 0.94]
                      }}
                      whileHover={disableAnimation ? undefined : { x: 2, scale: 1.05 }}
                    >
                      <Badge variant={getValidBadgeVariant(entityTypeBadgeConfig.color)}>
                        {entityTypeBadgeConfig.icon && (
                          <IconRenderer iconName={entityTypeBadgeConfig.icon} className="h-3 w-3 me-1" />
                        )}
                        <span className="text-xs">{entityTypeBadgeConfig.label}</span>
                      </Badge>
                    </motion.div>
                  ) : null}
                </div>
              )}
              </div>
            </div>
          </div>


        </motion.div>

        {/* Quick Actions and Tags - Mobile only */}
        {(quickActions.length > 0 || hasRelatedCompanies || hasRelatedTenants || hasRating || headerInfo.duedate) && (
          <motion.div
            initial={disableAnimation ? false : { opacity: 0, y: 20 }}
            animate={disableAnimation ? false : { opacity: 1, y: 0 }}
            transition={disableAnimation ? {} : { duration: 0.3, delay: 0.15 }}
            className="block lg:hidden space-y-4"
          >
            {/* Quick Actions - Mobile */}
            {quickActions.length > 0 && (
              <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-4">
                <DynamicQuickActions
                  actions={quickActions}
                  schema={schema}
                  data={pageData}
                  disableAnimation={disableAnimation}
                  schemaCache={targetSchemaCache}
                  onActionClick={customQuickActionHandler}
                />
              </div>
            )}

            {/* Tags/Badges - Mobile */}
            {(hasRelatedCompanies || hasRelatedTenants || hasRating || headerInfo.duedate) && (
              <CardWrapper
                config={{
                  id: 'tags',
                  name: 'Tags',
                  styling: {
                    variant: 'default',
                    size: 'md'
                  }
                }}
                className="h-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <CardHeader className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-200">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Related Companies */}
                  {hasRelatedCompanies && (
                    <div>
                      <BadgeViewer
                        field={{
                          id: 'relatedCompanies',
                          name: 'relatedCompanies',
                          component: 'picker',
                          targetSchema: 'companies',
                        } as any}
                        value={relatedCompaniesValue}
                        badgeVariant="outline"
                        enforceVariant={false}
                        animate={!disableAnimation}
                        maxBadges={3}
                      />
                    </div>
                  )}
                  {/* Related Tenants */}
                  {hasRelatedTenants && (
                    <div>
                      <BadgeViewer
                        field={{
                          id: 'relatedTenants',
                          name: 'relatedTenants',
                          component: 'picker',
                          targetSchema: 'tenants',
                        } as any}
                        value={relatedTenantsValue}
                        badgeVariant="outline"
                        enforceVariant={false}
                        animate={!disableAnimation}
                        maxBadges={3}
                      />
                    </div>
                  )}
                  {hasRating && (
                    <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                      <Rating
                        value={headerInfo.rating}
                        maxValue={5}
                        size="md"
                        showValue={true}
                      />
                    </motion.div>
                  )}
                  {headerInfo.duedate && (
                    <Countdown
                      expireDate={headerInfo.duedate}
                      includeTime={true}
                      size="sm"
                      showIcon={true}
                      fieldLabel={duedateFieldLabel}
                    />
                  )}
                </div>
                </CardContent>
              </CardWrapper>
            )}
          </motion.div>
        )}

        {/* Main Content Grid */}
        {hasSidebar ? (
          <div className={cn(
            "grid gap-6",
            totalColumns === 2 && "grid-cols-1 md:grid-cols-2",
            totalColumns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            totalColumns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}>
            {/* Main Content Area */}
            <div className={cn(
              "space-y-6",
              mainColumns === 2 && "md:col-span-2",
              mainColumns === 3 && "md:col-span-2 lg:col-span-3",
              mainColumns === 1 && "md:col-span-1"
            )}>
              {/* Component Renderers (e.g., KPIIndicators) */}
              {mainComponents.length > 0 && (
                <motion.div
                  initial={disableAnimation ? false : { opacity: 0, y: 20 }}
                  animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                  transition={disableAnimation ? {} : { duration: 0.3, delay: 0.1 }}
                >
                  <GridBuilder
                    config={{
                      id: 'detail-components-grid',
                      name: 'Detail Components Grid',
                      columns: 2,
                      gap: gap,
                      responsive: true
                    }}
                  >
                    {mainComponents.map((compConfig, index) => (
                      <ComponentRenderer
                        key={compConfig.id}
                        config={compConfig}
                        schema={schema}
                        data={pageData}
                        index={index}
                        disableAnimation={disableAnimation}
                        customComponents={customComponents}
                      />
                    ))}
                  </GridBuilder>
                </motion.div>
              )}

              {/* AI Agent Response Containers */}
              {aiAgentResponseActions.length > 0 && (
                <div className={hasSidebarSections ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
                  {aiAgentResponseActions.map((action, index) => (
                    <div key={action.id}>
                      <DynamicAiAgentResponseContainer
                        action={action}
                        schema={schema}
                        data={pageData}
                        index={index + mainComponents.length + sectionsForMain.length}
                        disableAnimation={disableAnimation}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Info Cards - Full Width when no sidebar, Two Column Grid when sidebar exists */}
              {sectionsForMain.length > 0 && (
                <div className={hasSidebarSections ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
                  {sectionsForMain.map((section, index) => {
                    // Check if this section should span full width (colSpan: 2)
                    const shouldSpanFull = section.colSpan === 2;
                    return (
                      <div 
                        key={section.id}
                        className={shouldSpanFull ? "md:col-span-2" : ""}
                      >
                        <DynamicInfoCard
                          section={section}
                          schema={schema}
                          data={pageData}
                          index={index + mainComponents.length + aiAgentResponseActions.length}
                          disableAnimation={disableAnimation}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar - only show if there are sidebar sections or quick actions */}
            {(hasSidebarSections || quickActions.length > 0 || sectionsForSidebar.length > 0) && (
              <div className={cn(
                "space-y-6",
                sidebarColumns === 1 && "md:col-span-1 lg:col-span-1",
                sidebarColumns === 2 && "md:col-span-2 lg:col-span-2",
                !sidebarColumns && "md:col-span-1 lg:col-span-1"
              )}>
                {/* Quick Actions - shown first in sidebar before badges */}
                {quickActions.length > 0 && (
                  <div className="hidden lg:block">
                    <DynamicQuickActions
                      actions={quickActions}
                      schema={schema}
                      data={pageData}
                      disableAnimation={disableAnimation}
                      schemaCache={targetSchemaCache}
                      onActionClick={customQuickActionHandler}
                    />
                  </div>
                )}

                {/* Tags/Badges - Desktop Sidebar */}
                {(hasRelatedCompanies || hasRelatedTenants || hasRating || headerInfo.duedate) && (
                  <div className="hidden lg:block">
                    <CardWrapper
                      config={{
                        id: 'tags',
                        name: 'Tags',
                        styling: {
                          variant: 'default',
                          size: 'md'
                        }
                      }}
                      className="h-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <CardHeader className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-200">Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 flex-wrap">
                        {/* Related Companies */}
                        {hasRelatedCompanies && (
                          <div>
                            <BadgeViewer
                              field={{
                                id: 'relatedCompanies',
                                name: 'relatedCompanies',
                                component: 'picker',
                                targetSchema: 'companies',
                              } as any}
                              value={relatedCompaniesValue}
                              badgeVariant="outline"
                              enforceVariant={false}
                              animate={!disableAnimation}
                              maxBadges={3}
                            />
                          </div>
                        )}
                        {/* Related Tenants */}
                        {hasRelatedTenants && (
                          <div>
                            <BadgeViewer
                              field={{
                                id: 'relatedTenants',
                                name: 'relatedTenants',
                                component: 'picker',
                                targetSchema: 'tenants',
                              } as any}
                              value={relatedTenantsValue}
                              badgeVariant="outline"
                              enforceVariant={false}
                              animate={!disableAnimation}
                              maxBadges={3}
                            />
                          </div>
                        )}
                        {hasRating && (
                          <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                            <Rating
                              value={headerInfo.rating}
                              maxValue={5}
                              size="md"
                              showValue={true}
                            />
                          </motion.div>
                        )}
                        {headerInfo.duedate && (
                          <Countdown
                            expireDate={headerInfo.duedate}
                            includeTime={true}
                            size="sm"
                            showIcon={true}
                            fieldLabel={duedateFieldLabel}
                          />
                        )}
                        </div>
                      </CardContent>
                    </CardWrapper>
                  </div>
                )}

                {/* Sidebar Component Renderers */}
                {sidebarComponents.map((compConfig, index) => (
                  <ComponentRenderer
                    key={compConfig.id}
                    config={compConfig}
                    schema={schema}
                    data={pageData}
                    index={index + sections.length}
                    disableAnimation={disableAnimation}
                    customComponents={customComponents}
                  />
                ))}

                {/* Sidebar Info Cards */}
                {sectionsForSidebar.length > 0 && (
                  <div className="space-y-6">
                    {sectionsForSidebar.map((section, index) => (
                      <DynamicInfoCard
                        key={section.id}
                        section={section}
                        schema={schema}
                        data={pageData}
                        index={index + mainComponents.length + sectionsForMain.length}
                        disableAnimation={disableAnimation}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Component Renderers (e.g., KPIIndicators) */}
            {mainComponents.length > 0 && (
              <motion.div
                initial={disableAnimation ? false : { opacity: 0, y: 20 }}
                animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                transition={disableAnimation ? {} : { duration: 0.3, delay: 0.1 }}
              >
                <GridBuilder
                  config={{
                    id: 'detail-components-grid',
                    name: 'Detail Components Grid',
                    columns: 2,
                    gap: gap,
                    responsive: true
                  }}
                >
                  {mainComponents.map((compConfig, index) => (
                    <ComponentRenderer
                      key={compConfig.id}
                      config={compConfig}
                      schema={schema}
                      data={pageData}
                      index={index}
                      disableAnimation={disableAnimation}
                      customComponents={customComponents}
                    />
                  ))}
                </GridBuilder>
              </motion.div>
            )}

            {/* AI Agent Response Containers */}
            {aiAgentResponseActions.length > 0 && (
              <div className="grid grid-cols-1 gap-6">
                {aiAgentResponseActions.map((action, index) => (
                  <div key={action.id}>
                    <DynamicAiAgentResponseContainer
                      action={action}
                      schema={schema}
                      data={pageData}
                      index={index + mainComponents.length + sectionsForMain.length}
                      disableAnimation={disableAnimation}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Info Cards - Full Width when no sidebar, Two Column Grid when sidebar exists */}
            {sectionsForMain.length > 0 && (
              <div className={hasSidebarSections ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
                {sectionsForMain.map((section, index) => {
                  // Check if this section should span full width (colSpan: 2)
                  // Only apply when there's a sidebar, otherwise sections are full width
                  const shouldSpanFull = hasSidebarSections && section.colSpan === 2;
                  return (
                    <div 
                      key={section.id}
                      className={shouldSpanFull ? "md:col-span-2" : ""}
                    >
                      <DynamicInfoCard
                        section={section}
                        schema={schema}
                        data={pageData}
                        index={index + mainComponents.length + aiAgentResponseActions.length}
                        disableAnimation={disableAnimation}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Table Renderers - Full Width (Always after components and sections, regardless of sidebar) */}
        {tableRenderers.length > 0 && (
          <div className="space-y-6 mt-6 w-full min-w-0">
            {tableRenderers.map((tableConfig, index) => (
              <DynamicRepeatingTableViewer
                key={tableConfig.id}
                config={tableConfig}
                schema={schema}
                data={data}
                index={index + mainComponents.length + sectionsForMain.length}
                disableAnimation={disableAnimation}
                sourceSchemaId={schema.id}
                sourceId={pageData?.id}
                showRefreshButton
                initialTargetSchema={
                  tableConfig.targetSchema
                    ? targetSchemaCache[tableConfig.targetSchema]
                    : null
                }
              />
            ))}
          </div>
        )}

        {/* Auto Table Renderers - Show relations to uncovered target schemas */}
        {relatedSchemas.length > 0 && (
          <>
            <EndLine label="Relations" />
            <div className="space-y-6 mt-6 w-full min-w-0">
            {relatedSchemas.map((targetSchema, index) => (
              <DynamicRepeatingTableViewer
                key={`auto-table-${targetSchema}`}
                config={{
                  id: `auto-table-${targetSchema}`,
                  schemaId: schema.id,
                  sectionId: '',
                  targetSchema: targetSchema,
                  // relationTypeId is optional - if not provided, will fetch all relations to this targetSchema
                }}
                schema={schema}
                data={data}
                index={tableRenderers.length + index + mainComponents.length + sectionsForMain.length}
                disableAnimation={disableAnimation}
                sourceSchemaId={schema.id}
                sourceId={pageData?.id}
                showRefreshButton
                initialTargetSchema={targetSchemaCache[targetSchema]}
              />
            ))}
          </div>
          </>
        )}
      </div>

      {/* Go to Top Button */}
      <GoToTop threshold={100} />

      {/* Edit Modal - using unified FormModal */}
      {editEntityId && schema?.id && data?.id && (
        <FormModal
          key={`edit-${editEntityId}-${schema.id}`}
          schemaId={schema.id}
          entityId={editEntityId}
          mode="edit"
          getInitialSchema={(requestedId) => (requestedId === schema.id ? schema : null)}
        getInitialEntityData={(requestedSchemaId, requestedEntityId) =>
          requestedSchemaId === schema.id && requestedEntityId === pageData?.id ? pageData : null
        }
        onSuccess={async () => {
            // Reset edit state and refresh the page to get updated data
            setEditEntityId(null);
          if (onRefreshData) {
            try {
              await onRefreshData();
            } catch (error) {
              loggingCustom(LogType.CLIENT_LOG, 'error', `Failed to refresh entity data after edit: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          }}
          onClose={() => {
            setEditEntityId(null);
          }}
        />
      )}
    </div>
  );
};

DynamicDetailPageRenderer.displayName = 'DynamicDetailPageRenderer';

