'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Eye, EyeOff, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { getNodeBackgroundColor, getNodeBorderColor, getEdgeColor } from '../utils/color-mapper';
import { cn } from '@/gradian-ui/shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import type { NodeType, RelationType, Schema } from './GraphViewer';

export interface GraphLegendProps {
  nodeTypes?: NodeType[];
  relationTypes?: RelationType[];
  schemas?: Schema[];
  isOpen: boolean;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  hiddenNodeTypeIds?: Set<string>;
  hiddenRelationTypeIds?: Set<string>;
  hiddenSchemaIds?: Set<string>;
  onToggleNodeTypeVisibility?: (nodeTypeId: string) => void;
  onToggleRelationTypeVisibility?: (relationTypeId: string) => void;
  onToggleSchemaVisibility?: (schemaId: string) => void;
  onResetVisibility?: () => void;
}

export function GraphLegend({
  nodeTypes,
  relationTypes,
  schemas,
  isOpen,
  onClose,
  position = 'top-right',
  hiddenNodeTypeIds = new Set(),
  hiddenRelationTypeIds = new Set(),
  hiddenSchemaIds = new Set(),
  onToggleNodeTypeVisibility,
  onToggleRelationTypeVisibility,
  onToggleSchemaVisibility,
  onResetVisibility,
}: GraphLegendProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set(['schemas', 'types']));
  
  const hasContent = (schemas && schemas.length > 0) || (nodeTypes && nodeTypes.length > 0) || (relationTypes && relationTypes.length > 0);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  if (!hasContent) {
    return null;
  }

  const positionClasses = {
    'top-right': 'top-full right-0 mt-2',
    'top-left': 'top-full left-0 mt-2',
    'bottom-right': 'bottom-full right-0 mb-2',
    'bottom-left': 'bottom-full left-0 mb-2',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`absolute ${positionClasses[position]} z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[280px] max-w-[400px] flex flex-col h-[400px]`}
        >
            <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Legend</h3>
              <div className="flex items-center gap-1">
                {onResetVisibility && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onResetVisibility}
                    title="Show all items"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onClose}
                  title="Close legend"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 overflow-hidden">
              <div className="py-4">
                {/* Toggle Groups at Top - Schemas and Types grouped by color */}
                <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              {/* Schemas Group */}
              {schemas && schemas.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleGroup('schemas')}
                    className="flex items-center justify-between w-full text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span>Schemas</span>
                    {expandedGroups.has('schemas') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  {expandedGroups.has('schemas') && (
                    <div className="space-y-1.5 ml-2">
                      {schemas.map((schema) => {
                        const isHidden = hiddenSchemaIds.has(schema.id);
                        const backgroundColor = getNodeBackgroundColor(schema.color);
                        const borderColor = getNodeBorderColor(schema.color);
                        return (
                          <button
                            key={schema.id}
                            onClick={() => onToggleSchemaVisibility?.(schema.id)}
                            className={cn(
                              "flex items-center gap-2 text-sm w-full text-start p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                              isHidden && "opacity-50"
                            )}
                          >
                            <div
                              className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center"
                              style={{ 
                                backgroundColor,
                                borderColor,
                              }}
                            >
                              {schema.icon && (
                                <IconRenderer iconName={schema.icon} className="h-2.5 w-2.5" />
                              )}
                            </div>
                            <span className={cn(
                              "text-gray-900 dark:text-gray-100 flex-1",
                              isHidden && "line-through"
                            )}>
                              {schema.label}
                            </span>
                            {isHidden ? (
                              <EyeOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Types Group */}
              {nodeTypes && nodeTypes.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleGroup('types')}
                    className="flex items-center justify-between w-full text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span>Types</span>
                    {expandedGroups.has('types') ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  {expandedGroups.has('types') && (
                    <div className="space-y-1.5 ml-2">
                      {nodeTypes.map((type) => {
                        const isHidden = hiddenNodeTypeIds.has(type.id);
                        const backgroundColor = getNodeBackgroundColor(type.color);
                        const borderColor = getNodeBorderColor(type.color);
                        return (
                          <button
                            key={type.id}
                            onClick={() => onToggleNodeTypeVisibility?.(type.id)}
                            className={cn(
                              "flex items-center gap-2 text-sm w-full text-start p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                              isHidden && "opacity-50"
                            )}
                          >
                            <div
                              className="w-4 h-4 rounded border-2 flex-shrink-0"
                              style={{ 
                                backgroundColor,
                                borderColor,
                              }}
                            />
                            <span className={cn(
                              "text-gray-900 dark:text-gray-100 flex-1",
                              isHidden && "line-through"
                            )}>
                              {type.label}
                            </span>
                            {isHidden ? (
                              <EyeOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {relationTypes && relationTypes.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  Relations
                </h4>
                <div className="space-y-2">
                  {relationTypes.map((type) => {
                    const isHidden = hiddenRelationTypeIds.has(type.id);
                    const edgeColor = getEdgeColor(type.color);
                    return (
                      <button
                        key={type.id}
                        onClick={() => onToggleRelationTypeVisibility?.(type.id)}
                        className={cn(
                          "flex items-center gap-2 text-sm w-full text-start p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                          isHidden && "opacity-50"
                        )}
                      >
                        <div
                          className="w-8 h-1 rounded flex-shrink-0"
                          style={{ backgroundColor: edgeColor }}
                        />
                        <span className={cn(
                          "text-gray-900 dark:text-gray-100 flex-1",
                          isHidden && "line-through"
                        )}>
                          {type.label}
                        </span>
                        {isHidden ? (
                          <EyeOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
              </div>
            </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

