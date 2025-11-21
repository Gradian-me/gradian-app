'use client';

import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonMinimal, Badge } from '@/gradian-ui/form-builder/form-elements';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Edit, Pencil } from 'lucide-react';
import { FormSection, FormSchema } from '../types/form-schema';
import { SectionEditor } from './SectionEditor';
import { SchemaBuilderDialog } from './SchemaBuilderDialog';
import { config } from '@/lib/config';
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { cacheSchemaClientSide } from '@/gradian-ui/schema-manager/utils/schema-client-cache';
import { useQueryClient } from '@tanstack/react-query';

export interface SortableSectionProps {
  section: FormSection;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<FormSection>) => void;
  fields: any[];
  sections: FormSection[];
  onAddField: (sectionId?: string) => void; // Optional sectionId - will use current section if not provided
  onFieldUpdate: (fieldId: string, updates: any) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldMove?: (fieldId: string, direction: 'up' | 'down') => void;
  onFieldDragEnd?: (event: DragEndEvent, sectionId: string) => void;
  config?: any;
  currentSchemaId?: string;
  isIncomplete?: boolean;
}

export function SortableSection({ 
  section, 
  children, 
  isExpanded, 
  onToggle, 
  onDelete,
  onUpdate,
  fields,
  sections,
  onAddField,
  onFieldUpdate,
  onFieldDelete,
  onFieldMove,
  onFieldDragEnd,
  config,
  currentSchemaId,
  isIncomplete = false
}: SortableSectionProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [showSchemaDialog, setShowSchemaDialog] = useState(false);
  const [targetSchemaName, setTargetSchemaName] = useState<string | null>(null);
  const [targetSchemaId, setTargetSchemaId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Check if section is relation-based and fetch target schema name
  useEffect(() => {
    const targetSchema = section.repeatingConfig?.targetSchema;
    const isRelationBased = section.isRepeatingSection && targetSchema;
    
    if (isRelationBased && targetSchema) {
      setTargetSchemaId(targetSchema); // Set immediately so dialog can render
      const fetchTargetSchemaName = async () => {
        try {
          const response = await apiRequest<FormSchema>(`/api/schemas/${targetSchema}`);
          if (response.success && response.data) {
            await cacheSchemaClientSide(response.data, { queryClient, persist: false });
            const schema = response.data;
            setTargetSchemaName(schema.plural_name || schema.singular_name || targetSchema);
            return;
          }
        } catch (error) {
          console.error('Error fetching target schema:', error);
          // Fallback to schema ID if fetch fails
        }
        setTargetSchemaName(targetSchema || null);
      };
      fetchTargetSchemaName();
    } else {
      setTargetSchemaName(null);
      setTargetSchemaId(null);
    }
  }, [section.isRepeatingSection, section.repeatingConfig?.targetSchema, queryClient]);

  const isInactive = section.inactive;

  return (
    <>
      <div ref={setNodeRef} style={style} className="relative">
        <Card
          className={`w-full border hover:shadow-sm transition-all duration-200 ${
          isDragging 
            ? 'border-violet-400 shadow-lg ring-2 ring-violet-400 bg-white dark:bg-gray-900' 
            : isInactive
              ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 opacity-60'
            : isIncomplete 
              ? 'border-amber-300 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/40' 
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
          }`}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                  {...attributes}
                  {...listeners}
                  className={`cursor-grab active:cursor-grabbing transition-colors mt-1 ${
                    isInactive
                      ? 'text-gray-300 dark:text-gray-600'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  title="Drag to reorder section"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle
                      className={`text-base font-semibold truncate ${
                      isInactive 
                        ? 'text-gray-500 dark:text-gray-400' 
                        : isIncomplete 
                          ? 'text-amber-700 dark:text-amber-400' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {section.title || 'Untitled Section'}
                    </CardTitle>
                    {/* Don't show badge for repeating sections when field count is 0 */}
                    {!(section.isRepeatingSection && fields.length === 0) && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-100"
                      >
                        {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                      </Badge>
                    )}
                    {isInactive && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        Inactive
                      </Badge>
                    )}
                    {isIncomplete && !isInactive && (
                      <Badge variant="warning" size="sm" className="text-[10px] px-1.5 py-0">
                        Incomplete
                      </Badge>
                    )}
                    {section.isRepeatingSection && (
                      <Badge variant="primary" size="sm" className="text-[10px] px-1.5 py-0">
                        Repeating
                      </Badge>
                    )}
                    {targetSchemaName && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (targetSchemaId) {
                            setShowSchemaDialog(true);
                          }
                        }}
                        className="shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full"
                      >
                        <Badge 
                          variant="primary" 
                          size="sm" 
                          className="cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                        >
                          {targetSchemaName}
                        </Badge>
                      </button>
                    )}
                  </div>
                  {section.description && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {section.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDialog(true)}
                >
                  <Pencil className="h-3 w-3 me-2" />
                  Edit Section
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {showDialog && (
        <SectionEditor
          section={section}
          fields={fields}
          onUpdate={onUpdate}
          onDelete={() => {
            setShowDialog(false);
            onDelete();
          }}
          onAddField={(sectionId) => onAddField(sectionId || section.id)}
          onFieldUpdate={onFieldUpdate}
          onFieldDelete={onFieldDelete}
          onFieldMove={onFieldMove}
          sections={sections}
          config={config}
          currentSchemaId={currentSchemaId}
          onClose={() => setShowDialog(false)}
        />
      )}

      {targetSchemaId ? (
        <SchemaBuilderDialog
          schemaId={targetSchemaId}
          fetchSchema={async (id: string) => {
            const apiBasePath = config?.schemaApi?.basePath || '/api/schemas';
            const response = await fetch(`${apiBasePath}/${id}`);
            const result = await response.json();
            if (result.success) {
              return result.data;
            } else {
              throw new Error('Failed to fetch schema');
            }
          }}
          saveSchema={async (id: string, schema: FormSchema) => {
            const apiBasePath = config?.schemaApi?.basePath || '/api/schemas';
            const { id: _schemaId, ...payload } = schema;
            const response = await fetch(`${apiBasePath}/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!result.success) {
              throw new Error('Failed to save schema');
            }
          }}
          open={showSchemaDialog}
          onOpenChange={setShowSchemaDialog}
        />
      ) : null}
    </>
  );
}

