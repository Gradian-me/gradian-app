'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/gradian-ui/form-builder/form-elements';
import { getInitials } from '@/gradian-ui/data-display/utils';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { getSingleValueByRole, getValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { cn } from '@/gradian-ui/shared/utils';
import { HierarchyNode, buildHierarchyTree, getAncestorIds, getParentIdFromEntity } from '@/gradian-ui/schema-manager/utils/hierarchy-utils';
import { HierarchyActionsMenu } from './HierarchyActionsMenu';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Skeleton } from '@/components/ui/skeleton';

export interface HierarchyViewProps {
  schema: FormSchema;
  items: any[];
  searchTerm: string;
  onAddChild: (entity: any) => void;
  onEdit: (entity: any) => void;
  onDelete: (entity: any) => void;
  onChangeParent?: (entity: any) => void;
  onView?: (entity: any) => void; // Callback for viewing entity details (opens card dialog)
  expandAllTrigger?: number;
  collapseAllTrigger?: number;
  isLoading?: boolean; // Loading state for skeleton display
}

const nodeVariants = {
  collapsed: { opacity: 0, height: 0 },
  expanded: { opacity: 1, height: 'auto' },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      delay: Math.min(index * 0.02, 0.18),
    },
  }),
};

const cardHoverVariants = {
  hover: {
    scale: 1.01,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  tap: {
    scale: 0.995,
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
  onView?: (entity: any) => void; // Callback for viewing entity details
  highlightQuery: string;
  index: number;
  schema: FormSchema;
  expandedIds: Set<string>;
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
  highlightQuery,
  index,
  schema,
  expandedIds,
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
  const avatarField =
    getSingleValueByRole(schema, entity, 'avatar', entity.name) ||
    entity.name ||
    title;

  const hasChildren = node.children.length > 0;
  const hasParent = Boolean(getParentIdFromEntity(entity));

  return (
    <div className="space-y-1">
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
            'flex items-center justify-between gap-2',
            onView && 'cursor-pointer hover:border-violet-300 dark:hover:border-violet-600'
          )}
          onClick={onView ? () => onView(entity) : undefined}
        >
          <CardContent className="flex items-center gap-3 p-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded-md border text-gray-500 dark:text-gray-400',
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
              <Avatar
                fallback={getInitials(avatarField)}
                size="sm"
                variant="primary"
                className="shrink-0 border border-violet-200 dark:border-violet-500/80"
              >
                {getInitials(avatarField)}
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {renderHighlightedText(String(title), highlightQuery)}
                </div>
                {subtitle && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {renderHighlightedText(String(subtitle), highlightQuery)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <div className="pr-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* View and Edit buttons - matching DynamicCardActionButtons list view style */}
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onView(entity);
                }}
                className="h-8 w-8 p-0 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all duration-200"
                title="View Details"
              >
                <IconRenderer iconName="Eye" className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEdit(entity);
                }}
                className="h-8 w-8 p-0 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-all duration-200"
                title="Edit"
              >
                <IconRenderer iconName="Edit" className="h-4 w-4" />
              </Button>
            )}
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
            className="pl-6 border-l border-dashed border-gray-200 dark:border-gray-700"
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
                highlightQuery={highlightQuery}
                index={index + idx + 1}
                schema={schema}
                expandedIds={expandedIds}
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
  expandAllTrigger,
  collapseAllTrigger,
  isLoading = false,
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
        data.name,
        data.title,
        data.email,
        data.description,
      ];

      if (
        candidateFields.some(
          (val) => typeof val === 'string' && val.toLowerCase().includes(normalizedSearch)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAllTrigger]);

  React.useEffect(() => {
    if (collapseAllTrigger === undefined) return;
    handleCollapseAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseAllTrigger]);

  const effectiveRoots = useMemo(() => {
    if (!normalizedSearch || matchedIds.size === 0) return roots;

    // When searching, keep all roots but hierarchy visibility is controlled by highlight + expansion
    return roots;
  }, [roots, normalizedSearch, matchedIds]);

  // Skeleton component for hierarchy cards
  const HierarchySkeleton = ({ depth = 0, index = 0 }: { depth?: number; index?: number }) => {
    // Show nested skeleton for some items to simulate hierarchy structure
    const showNested = depth < 2 && index % 3 === 0;
    
    return (
      <div className="space-y-1">
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
            <div className="flex items-center gap-2 pr-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </CardContent>
        </Card>
        {showNested && (
          <div className="pl-6 border-l border-dashed border-gray-200 dark:border-gray-700">
            <HierarchySkeleton depth={depth + 1} index={index} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Hierarchy view • {isLoading ? 'Loading...' : `${items?.length || 0} item(s)`}
      </div>

      <div className="space-y-2">
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
              highlightQuery={normalizedSearch}
              index={index}
              schema={schema}
              expandedIds={expandedIds}
            />
          ))
        )}
      </div>
    </div>
  );
};

HierarchyView.displayName = 'HierarchyView';


