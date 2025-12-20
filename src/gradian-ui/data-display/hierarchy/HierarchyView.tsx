'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DynamicActionButtons } from '../components/DynamicActionButtons';
import { RoleBasedAvatar } from '@/gradian-ui/data-display/utils';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { getSingleValueByRole, getValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { cn } from '@/gradian-ui/shared/utils';
import { HierarchyNode, buildHierarchyTree, getAncestorIds, getParentIdFromEntity, filterHierarchyTree } from '@/gradian-ui/schema-manager/utils/hierarchy-utils';
import { HierarchyActionsMenu } from './HierarchyActionsMenu';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFieldValue } from '../table/utils/field-formatters';
import { EntityMetadata } from '../components/CreateUpdateDetail';
import { Avatar } from '@/gradian-ui/form-builder/form-elements/components/Avatar';
import { normalizeOptionArray } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { AvatarUser } from '../components/AvatarUser';
import { CodeBadge } from '@/gradian-ui/form-builder/form-elements/components/CodeBadge';

export interface HierarchyViewProps {
  schema: FormSchema;
  items: any[];
  searchTerm: string;
  onAddChild: (entity: any) => void;
  onEdit: (entity: any) => void;
  onDelete: (entity: any) => void;
  onChangeParent?: (entity: any) => void;
  onView?: (entity: any) => void; // Callback for viewing entity details (opens card dialog)
  onViewDetail?: (entity: any) => void; // Callback for navigating to detail page (view button)
  expandAllTrigger?: number;
  collapseAllTrigger?: number;
  isLoading?: boolean; // Loading state for skeleton display
  showUserDetails?: boolean; // When true, shows user details (created/updated metadata)
}

const nodeVariants = {
  collapsed: { opacity: 0, height: 0 },
  expanded: { opacity: 1, height: 'auto' },
};

const cardVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.99 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.18,
      delay: Math.min(index * 0.015, 0.12),
    },
  }),
};

const cardHoverVariants = {
  hover: {
    scale: 1.003,
    transition: { duration: 0.15 },
  },
  tap: {
    scale: 0.997,
    transition: { duration: 0.1 },
  },
};

interface HierarchyNodeProps {
  node: HierarchyNode;
  depth: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onAddChild: (entity: any) => void;
  onEdit: (entity: any) => void;
  onDelete: (entity: any) => void;
  onChangeParent?: (entity: any) => void;
  onView?: (entity: any) => void; // Callback for viewing entity details (opens card dialog)
  onViewDetail?: (entity: any) => void; // Callback for navigating to detail page (view button)
  highlightQuery: string;
  index: number;
  schema: FormSchema;
  expandedIds: Set<string>;
  showUserDetails?: boolean; // When true, shows user details (created/updated metadata)
}

const HierarchyNodeCard: React.FC<HierarchyNodeProps> = ({
  node,
  depth,
  isExpanded,
  onToggle,
  onAddChild,
  onEdit,
  onDelete,
  onChangeParent,
  onView,
  onViewDetail,
  highlightQuery,
  index,
  schema,
  expandedIds,
  showUserDetails = false,
}) => {
  const entity = node.entity;
  const title =
    getValueByRole(schema, entity, 'title') ||
    entity.name ||
    entity.title ||
    entity.id;
  const subtitle =
    getSingleValueByRole(schema, entity, 'subtitle', entity.email) ||
    entity.email ||
    '';

  const hasChildren = node.children.length > 0;
  const hasParent = Boolean(getParentIdFromEntity(entity));
  
  // Get status field definition and value
  const statusFieldDef = schema?.fields?.find(field => field.role === 'status');
  const hasStatusField = Boolean(statusFieldDef);
  const statusValue = statusFieldDef ? entity?.[statusFieldDef.name] : entity?.status;
  
  // Ensure status field has options from statusGroup if available
  const hasStatusGroup = Array.isArray(schema?.statusGroup) && schema.statusGroup.length > 0;
  const statusFieldWithOptions = statusFieldDef 
    ? { 
        ...statusFieldDef, 
        options: statusFieldDef.options || (hasStatusGroup ? schema.statusGroup : undefined)
      }
    : hasStatusGroup
      ? { id: 'status', name: 'status', role: 'status', options: schema.statusGroup }
      : null;
  
  // Get code field
  const hasCodeField = schema?.fields?.some(field => field.role === 'code') || false;
  const codeFieldValue = getSingleValueByRole(schema, entity, 'code');
  
  // Check for avatar, icon, or color fields
  const hasAvatarField = schema?.fields?.some(field => field.role === 'avatar') || false;
  const hasIconField = schema?.fields?.some(field => field.role === 'icon') || false;
  const hasColorField = schema?.fields?.some(field => field.role === 'color') || false;
  
  // Get person field (assignedTo)
  const hasPersonField = schema?.fields?.some(field => field.role === 'person') || false;
  const personFieldDef = schema?.fields?.find(field => field.role === 'person');
  const personValue = hasPersonField ? (personFieldDef ? (entity[personFieldDef.name] || entity.assignedTo) : (entity.assignedTo || null)) : null;
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

  return (
    <div className="mb-2">
      <motion.div
        layout
        variants={cardVariants}
        custom={index}
        initial="hidden"
        animate="visible"
        whileHover={cardHoverVariants.hover}
        whileTap={cardHoverVariants.tap}
      >
        <Card
          className={cn(
            'border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 shadow-sm hover:shadow-md transition-all duration-200',
            'flex items-center justify-between gap-2 flex-wrap',
            onView && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
          onClick={onView ? () => onView(entity) : undefined}
        >
          <CardContent className="flex items-start gap-3 p-3 flex-1 min-w-0">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded-md border text-gray-500 dark:text-gray-400 shrink-0',
                  'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60',
                  !hasChildren && 'opacity-40 cursor-default'
                )}
                disabled={!hasChildren}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                ) : (
                  <span className="h-1 w-1 rounded-full bg-gray-400" />
                )}
              </button>
              {(hasAvatarField || hasIconField || hasColorField) && (
                <RoleBasedAvatar
                  schema={schema}
                  data={entity}
                  size="sm"
                  showBorder={true}
                  showShadow={false}
                  defaultColor="violet"
                  className="shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2 flex-wrap">
                  {/* Code badge and title in flex column */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {hasCodeField && codeFieldValue && (
                      <div className="shrink-0">
                        <CodeBadge code={codeFieldValue} highlightQuery={highlightQuery} />
                      </div>
                    )}
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                      {renderHighlightedText(String(title), highlightQuery)}
                    </div>
                  </div>
                  {hasStatusField && statusFieldWithOptions && statusValue && (
                    <div className="shrink-0">
                      {formatFieldValue(
                        statusFieldWithOptions,
                        statusValue,
                        entity,
                        true,
                        highlightQuery
                      )}
                    </div>
                  )}
                </div>
                {subtitle && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {renderHighlightedText(String(subtitle), highlightQuery)}
                  </div>
                )}
                {/* Person Field */}
                {hasPersonField && personField && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <AvatarUser
                      user={personField}
                      avatarType="user"
                      size="sm"
                      showDialog={true}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{personField.label}</span>
                  </div>
                )}
                {/* Entity Metadata */}
                {showUserDetails && (
                  <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                    <EntityMetadata
                      createdAt={entity.createdAt}
                      createdBy={entity.createdBy}
                      updatedAt={entity.updatedAt}
                      updatedBy={entity.updatedBy}
                      variant="minimal"
                      avatarType="user"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <div className={cn(
            "pe-2 flex gap-2 shrink-0",
            "flex-col sm:flex-row items-center justify-center"
          )} onClick={(e) => e.stopPropagation()}>
            <DynamicActionButtons
              variant="minimal"
              actions={[
                ...(onViewDetail || onView ? [{
                  type: 'view' as const,
                  onClick: () => {
                    // Prefer onViewDetail (navigate to detail page) over onView (open dialog)
                    if (onViewDetail) {
                      onViewDetail(entity);
                    } else if (onView) {
                      onView(entity);
                    }
                  },
                }] : []),
                ...(onEdit ? [{
                  type: 'edit' as const,
                  onClick: () => {
                    onEdit(entity);
                  },
                }] : []),
              ]}
              stopPropagation={true}
            />
            <HierarchyActionsMenu
              onAddChild={() => onAddChild(entity)}
              onEdit={() => onEdit(entity)}
              onDelete={() => onDelete(entity)}
              onChangeParent={onChangeParent ? () => onChangeParent(entity) : undefined}
              hasParent={hasParent}
            />
          </div>
        </Card>
      </motion.div>

      <AnimatePresence initial={false}>
        {isExpanded && node.children.length > 0 && (
          <motion.div
            key={`${node.id}-children`}
            variants={nodeVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="mt-2 ps-6 border-l border-dashed border-gray-200 dark:border-gray-700"
          >
            {node.children.map((child, idx) => (
              <HierarchyNodeCard
                key={child.id}
                node={child}
                depth={depth + 1}
                isExpanded={expandedIds.has(child.id)}
                onToggle={onToggle}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                onChangeParent={onChangeParent}
                onView={onView}
                onViewDetail={onViewDetail}
                highlightQuery={highlightQuery}
                index={index + idx + 1}
                schema={schema}
                expandedIds={expandedIds}
                showUserDetails={showUserDetails}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const HierarchyView: React.FC<HierarchyViewProps> = ({
  schema,
  items,
  searchTerm,
  onAddChild,
  onEdit,
  onDelete,
  onChangeParent,
  onView,
  onViewDetail,
  expandAllTrigger,
  collapseAllTrigger,
  isLoading = false,
  showUserDetails = false,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { roots, nodeMap } = useMemo(() => buildHierarchyTree(items || []), [items]);

  const normalizedSearch = (searchTerm || '').trim().toLowerCase();

  const matchedIds = useMemo(() => {
    if (!normalizedSearch) return new Set<string>();
    const matches = new Set<string>();

    for (const node of nodeMap.values()) {
      const data = node.entity;
      const candidateFields = [
        getValueByRole(schema as any, data, 'title'),
        getSingleValueByRole(schema as any, data, 'subtitle', data.email),
        getSingleValueByRole(schema as any, data, 'code'),
        data.name,
        data.title,
        data.email,
        data.description,
        data.code,
      ];

      if (
        candidateFields.some(
          (val) => typeof val === 'string' && val.toLowerCase().includes(normalizedSearch)
        ) ||
        candidateFields.some(
          (val) => typeof val === 'number' && String(val).toLowerCase().includes(normalizedSearch)
        )
      ) {
        matches.add(node.id);
      }
    }

    // Auto-expand all ancestor chains for matched nodes
    if (matches.size > 0) {
      const nextExpanded = new Set<string>();
      matches.forEach((id) => {
        const ancestors = getAncestorIds(nodeMap, id);
        ancestors.forEach((ancestorId) => nextExpanded.add(ancestorId));
      });
      // Merge into existing expandedIds to keep user interactions
      setExpandedIds((prev) => {
        const merged = new Set(prev);
        nextExpanded.forEach((id) => merged.add(id));
        return merged;
      });
    }

    return matches;
  }, [normalizedSearch, nodeMap, schema]);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    nodeMap.forEach((node) => {
      if (node.children.length > 0) {
        allIds.add(node.id);
      }
    });
    setExpandedIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // External triggers from parent (e.g., toolbar buttons)
  React.useEffect(() => {
    if (expandAllTrigger === undefined) return;
    handleExpandAll();
  }, [expandAllTrigger]);

  React.useEffect(() => {
    if (collapseAllTrigger === undefined) return;
    handleCollapseAll();
  }, [collapseAllTrigger]);

  const effectiveRoots = useMemo(() => {
    if (!normalizedSearch || matchedIds.size === 0) return roots;

    // When searching, filter to only show nodes that match or are ancestors of matches
    return filterHierarchyTree(roots, matchedIds);
  }, [roots, normalizedSearch, matchedIds]);

  // Skeleton component for hierarchy cards
  const HierarchySkeleton = ({ depth = 0, index = 0 }: { depth?: number; index?: number }) => {
    // Show nested skeleton for some items to simulate hierarchy structure
    const showNested = depth < 2 && index % 3 === 0;
    
    return (
      <div className={cn("space-y-1", depth === 0 && "mb-4")}>
        <Card className="border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2 pe-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </CardContent>
        </Card>
        {showNested && (
          <div className="mt-2 ps-6 border-l border-dashed border-gray-200 dark:border-gray-700">
            <HierarchySkeleton depth={depth + 1} index={index} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Hierarchy view • {isLoading ? 'Loading...' : `${items?.length || 0} item(s)`}
      </div>

      <div>
        {isLoading ? (
          // Show skeleton loaders
          Array.from({ length: 3 }).map((_, index) => (
            <HierarchySkeleton key={`skeleton-${index}`} depth={0} index={index} />
          ))
        ) : (
          effectiveRoots.map((root, index) => (
            <HierarchyNodeCard
              key={root.id}
              node={root}
              depth={0}
              isExpanded={expandedIds.has(root.id)}
              onToggle={handleToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onChangeParent={onChangeParent}
              onView={onView}
              onViewDetail={onViewDetail}
              highlightQuery={normalizedSearch}
              index={index}
              schema={schema}
              expandedIds={expandedIds}
              showUserDetails={showUserDetails}
            />
          ))
        )}
      </div>
    </div>
  );
};

HierarchyView.displayName = 'HierarchyView';


