'use client';

import { Button } from '../../../components/ui/button';
import { TextInput, Textarea, NumberInput, Switch, Select, Slider, ButtonMinimal, NameInput } from '@/gradian-ui/form-builder/form-elements';
import { Pencil, Trash2 } from 'lucide-react';
import { SectionEditorProps } from '../types/builder';
import { FieldEditor } from './FieldEditor';
import { SortableField } from './SortableField';
import { AddButtonFull } from '@/gradian-ui/form-builder/form-elements';
import { useMemo, useState, useEffect } from 'react';
import { FormSchema } from '../types/form-schema';
import { generateSchemaId } from '../utils/schema-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function SectionEditor({
  section,
  fields,
  onUpdate,
  onDelete,
  onAddField,
  onFieldUpdate,
  onFieldDelete,
  onFieldMove,
  sections,
  config,
  currentSchemaId,
  onClose,
}: SectionEditorProps & { onClose?: () => void }) {
  const [tempSection, setTempSection] = useState(section);
  const [relationTypes, setRelationTypes] = useState<Array<{ id: string; label: string }>>([]);
  const [availableSchemas, setAvailableSchemas] = useState<Array<{ id: string; name: string }>>([]);
  const [isSectionIdCustom, setIsSectionIdCustom] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setTempSection(section);
    setIsSectionIdCustom(false);
  }, [section]);

  const sortedFields = useMemo(() => {
    return fields.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [fields]);

  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = sortedFields.findIndex(f => f.id === active.id);
    const newIndex = sortedFields.findIndex(f => f.id === over.id);
    
    if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
      // Create a new array with the reordered fields
      const reordered = [...sortedFields];
      const [movedField] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, movedField);
      
      // Update the order for all affected fields
      // React 18 automatically batches these updates
      reordered.forEach((field, idx) => {
        onFieldUpdate(field.id, { order: idx + 1 });
      });
    }
  };

  const isRelationBased = tempSection.isRepeatingSection && 
    tempSection.repeatingConfig?.targetSchema && 
    tempSection.repeatingConfig?.relationTypeId;

  // Fetch relation types
  useEffect(() => {
    const fetchRelationTypes = async () => {
      try {
        const response = await fetch('/api/data/relation-types');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setRelationTypes(result.data || []);
          }
        }
      } catch (error) {
        console.error('Error fetching relation types:', error);
      }
    };

    // Fetch available schemas
    const fetchSchemas = async () => {
      try {
        const response = await fetch('/api/schemas');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Filter out current schema from available schemas
            const schemas = result.data
              .filter((s: FormSchema) => s.id !== currentSchemaId)
              .map((s: FormSchema) => ({ id: s.id, name: s.plural_name || s.singular_name }));
            setAvailableSchemas(schemas);
          }
        }
      } catch (error) {
        console.error('Error fetching schemas:', error);
      }
    };

    if (tempSection.isRepeatingSection) {
      fetchRelationTypes();
      fetchSchemas();
    }
  }, [tempSection.isRepeatingSection, currentSchemaId]);

  // Check if a field is incomplete (has default values)
  const isFieldIncomplete = (field: any): boolean => {
    return (field.label === 'New Field' && field.name === 'newField') || 
           !field.label || 
           !field.name ||
           !field.component ||
           field.label.trim() === '' ||
           field.name.trim() === '';
  };

  // Check if there are any incomplete fields
  const hasIncompleteFields = fields.some(isFieldIncomplete);

  // Check if the section exists in the schema
  const sectionExistsInSchema = sections.some(s => s.id === section.id);
  
  // Check if this is a new section that hasn't been saved yet (still has default title)
  const isNewUnsavedSection = section.title === 'New Section' && sectionExistsInSchema;
  
  // Check if there are unsaved changes (tempSection differs from original section)
  const hasUnsavedChanges = JSON.stringify(tempSection) !== JSON.stringify(section);
  
  // Check if the title is invalid (empty, whitespace only, or "New Section")
  const isTitleInvalid = !tempSection.title || 
                         tempSection.title.trim() === '' || 
                         tempSection.title.trim() === 'New Section';
  
  // Disable "Add Field" if:
  // 1. Section doesn't exist in schema, OR
  // 2. It's a new section that hasn't been saved (still has default "New Section" title), OR
  // 3. There are unsaved changes (must save before adding fields), OR
  // 4. There are incomplete fields
  const canAddField = sectionExistsInSchema && !isNewUnsavedSection && !hasUnsavedChanges && !hasIncompleteFields;
  
  // Disable "Save" if:
  // 1. Title is invalid (empty, whitespace, or "New Section"), OR
  // 2. There are incomplete fields
  const canSave = !isTitleInvalid && !hasIncompleteFields;

  const handleSave = () => {
    if (hasIncompleteFields || isTitleInvalid) {
      // Show error or prevent save
      return;
    }
    onUpdate(tempSection);
    onClose?.();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle>Edit Section</DialogTitle>
          <DialogDescription>
            Configure section properties and fields
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-5 py-4">
          <TextInput
            config={{ name: 'section-title', label: 'Section Title', placeholder: 'Section title...' }}
            value={tempSection.title || ''}
            onChange={(newTitle) => {
              setTempSection((prev) => {
                const updated = { ...prev, title: newTitle };
                if (!isSectionIdCustom) {
                  updated.id = generateSchemaId(newTitle);
                }
                return updated;
              });
            }}
            error={
              isTitleInvalid
                ? 'Please enter a valid section title (cannot be empty or "New Section").'
                : undefined
            }
          />
          <div>
            <NameInput
              config={{ name: 'section-id', label: 'Section ID', placeholder: 'Generated from the section title' }}
              value={tempSection.id}
              onChange={(newValue) => setTempSection(prev => ({ ...prev, id: newValue }))}
              isCustomizable
              customMode={isSectionIdCustom}
              onCustomModeChange={(custom) => {
                if (!custom) {
                  setTempSection(prev => ({
                    ...prev,
                    id: generateSchemaId(prev.title || ''),
                  }));
                }
                setIsSectionIdCustom(custom);
              }}
              helperText="Section IDs auto-generate from the title. Customize if you need a specific identifier."
            />
          </div>
          <Textarea
            config={{ name: 'section-description', label: 'Description', placeholder: 'Section description (optional)...' }}
            value={tempSection.description || ''}
            onChange={(value) => setTempSection({ ...tempSection, description: value })}
            rows={2}
            resize="none"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              config={{ name: 'initial-state', label: 'Initial State' }}
              value={tempSection.initialState || 'expanded'}
              onValueChange={(value) => setTempSection({ ...tempSection, initialState: value as 'expanded' | 'collapsed' })}
              options={[
                { value: 'expanded', label: 'Expanded' },
                { value: 'collapsed', label: 'Collapsed' }
              ]}
            />
            <div>
              <Slider
                config={{
                  name: 'columns',
                  label: 'Columns',
                }}
                value={tempSection.columns || 2}
                onChange={(value) => setTempSection({ ...tempSection, columns: value })}
                min={1}
                max={4}
                step={1}
              />
            </div>
          </div>
          
          <div className="space-y-3 pb-2 border-b border-gray-100">
            <Switch
              config={{ name: `inactive-${section.id}`, label: 'Inactive' }}
              value={tempSection.inactive || false}
              onChange={(checked: boolean) => setTempSection({ ...tempSection, inactive: checked })}
            />
            <Switch
              config={{ name: `repeating-${section.id}`, label: 'Repeating Section' }}
              value={tempSection.isRepeatingSection || false}
              onChange={(checked: boolean) => {
                setTempSection({
                  ...tempSection,
                  isRepeatingSection: checked,
                  repeatingConfig:
                    checked && !tempSection.repeatingConfig
                      ? { minItems: 0, maxItems: undefined }
                      : tempSection.repeatingConfig,
                });
              }}
            />
          </div>

          {/* Repeating Section Configuration */}
          {tempSection.isRepeatingSection && (
          <div className="pt-4 space-y-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200"></div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Configuration</span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            
            {/* Relation-based configuration */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                config={{ name: 'target-schema', label: 'Target Schema', placeholder: 'Select target schema...' }}
                value={tempSection.repeatingConfig?.targetSchema || ''}
                onValueChange={(value) =>
                  setTempSection({
                    ...tempSection,
                    repeatingConfig: { ...tempSection.repeatingConfig, targetSchema: value || undefined },
                  })
                }
                options={[
                  { value: '', label: 'Select target schema...' },
                  ...availableSchemas.map((schema) => ({ value: schema.id, label: schema.name })),
                ]}
              />

              <Select
                config={{ name: 'relation-type', label: 'Relation Type', placeholder: 'Select relation type...' }}
                value={tempSection.repeatingConfig?.relationTypeId || ''}
                onValueChange={(value) =>
                  setTempSection({
                    ...tempSection,
                    repeatingConfig: { ...tempSection.repeatingConfig, relationTypeId: value || undefined },
                  })
                }
                options={[
                  { value: '', label: 'Select relation type...' },
                  ...relationTypes.map((rt) => ({ value: rt.id, label: rt.label })),
                ]}
              />
            </div>

            {/* Common repeating config fields */}
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                config={{ name: 'min-items', label: 'Min Items' }}
                value={tempSection.repeatingConfig?.minItems ?? ''}
                onChange={(value) =>
                  setTempSection({
                    ...tempSection,
                    repeatingConfig: {
                      ...tempSection.repeatingConfig,
                      minItems: value === '' ? undefined : Number(value),
                    },
                  })
                }
                min={0}
              />
              <NumberInput
                config={{ name: 'max-items', label: 'Max Items' }}
                value={tempSection.repeatingConfig?.maxItems ?? ''}
                onChange={(value) =>
                  setTempSection({
                    ...tempSection,
                    repeatingConfig: {
                      ...tempSection.repeatingConfig,
                      maxItems: value === '' ? undefined : Number(value),
                    },
                  })
                }
                min={0}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                config={{ name: 'add-button-text', label: 'Add Button Text', placeholder: 'Add item...' }}
                value={tempSection.repeatingConfig?.addButtonText || ''}
                onChange={(value) =>
                  setTempSection({
                    ...tempSection,
                    repeatingConfig: { ...tempSection.repeatingConfig, addButtonText: value || undefined },
                  })
                }
              />
              <TextInput
                config={{ name: 'remove-button-text', label: 'Remove Button Text', placeholder: 'Remove...' }}
                value={tempSection.repeatingConfig?.removeButtonText || ''}
                onChange={(value) =>
                  setTempSection({
                    ...tempSection,
                    repeatingConfig: { ...tempSection.repeatingConfig, removeButtonText: value || undefined },
                  })
                }
              />
            </div>
            <TextInput
              config={{ name: 'empty-message', label: 'Empty Message', placeholder: 'No items yet...' }}
              value={tempSection.repeatingConfig?.emptyMessage || ''}
              onChange={(value) =>
                setTempSection({
                  ...tempSection,
                  repeatingConfig: { ...tempSection.repeatingConfig, emptyMessage: value || undefined },
                })
              }
            />
              
              {isRelationBased && (
                <>
                  <div>
                    <Select
                      config={{ name: 'delete-type', label: 'Delete Type' }}
                      value={tempSection.repeatingConfig?.deleteType || 'itemAndRelation'}
                      onValueChange={(value) =>
                        setTempSection({
                          ...tempSection,
                          repeatingConfig: {
                            ...tempSection.repeatingConfig,
                            deleteType: value as 'relationOnly' | 'itemAndRelation',
                          },
                        })
                      }
                      options={[
                        { value: 'relationOnly', label: 'Delete relation only (keep item)' },
                        { value: 'itemAndRelation', label: 'Delete item and relation' },
                      ]}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {tempSection.repeatingConfig?.deleteType === 'relationOnly' 
                        ? 'Only the relation will be deleted. The item will remain in the target schema.'
                        : 'Both the relation and the item will be permanently deleted.'}
                    </p>
                  </div>
                  <div>
                    <Select
                      config={{ name: 'add-type', label: 'Add Type' }}
                      value={tempSection.repeatingConfig?.addType || 'addOnly'}
                      onValueChange={(value) =>
                        setTempSection({
                          ...tempSection,
                          repeatingConfig: {
                            ...tempSection.repeatingConfig,
                            addType: value as 'addOnly' | 'canSelectFromData' | 'mustSelectFromData',
                          },
                        })
                      }
                      options={[
                        { value: 'addOnly', label: 'Add only (create new items)' },
                        { value: 'canSelectFromData', label: 'Can select from existing data' },
                        { value: 'mustSelectFromData', label: 'Must select from existing data' },
                      ]}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {tempSection.repeatingConfig?.addType === 'addOnly' 
                        ? 'Users can only create new items. No selection from existing data.'
                        : tempSection.repeatingConfig?.addType === 'canSelectFromData'
                        ? 'Users can create new items or select from existing data. Both "Add" and "Select" buttons will be shown.'
                        : 'Users can only select from existing data. Only "Select" button will be shown.'}
                    </p>
                  </div>
                  {(tempSection.repeatingConfig?.addType === 'canSelectFromData' || tempSection.repeatingConfig?.addType === 'mustSelectFromData') && (
                    <div className="space-y-1.5">
                      <Switch
                        config={{ name: `unique-selection-${section.id}`, label: 'Unique Selection' }}
                        value={tempSection.repeatingConfig?.isUnique || false}
                        onChange={(checked: boolean) =>
                          setTempSection({
                            ...tempSection,
                            repeatingConfig: { ...tempSection.repeatingConfig, isUnique: checked },
                          })
                        }
                      />
                      <p className="text-xs text-gray-500 pl-8">
                        If enabled, each item can only be selected once. Already selected items will be excluded from the picker.
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <span className="font-medium">Relation-based section:</span> Fields are managed in the target schema "{tempSection.repeatingConfig?.targetSchema}". 
                    </p>
                  </div>
                </>
              )}
          </div>
        )}

          {/* Fields Section - Only show for non-relation-based repeating sections or regular sections */}
          {(!tempSection.isRepeatingSection || !isRelationBased) && (
          <div className="pt-4 space-y-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900">Fields</h4>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{fields.length}</span>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No fields yet. Click "Add Field" to get started.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFieldDragEnd}
              >
                <SortableContext
                  items={sortedFields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sortedFields.map((field) => {
                      const isIncomplete = isFieldIncomplete(field);
                      return (
                        <SortableField 
                          key={field.id} 
                          id={field.id} 
                          isIncomplete={isIncomplete}
                          isInactive={field.inactive}
                        >
                          <FieldEditor
                            field={field}
                            onUpdate={(updates) => onFieldUpdate(field.id, updates)}
                            onDelete={() => onFieldDelete(field.id)}
                            sections={sections}
                            isIncomplete={isIncomplete}
                          />
                        </SortableField>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            
            <AddButtonFull
              label="Add Field"
              onClick={() => onAddField(section.id)}
              iconSize="w-4 h-4"
              textSize="text-sm"
              fullWidth={true}
              disabled={!canAddField}
            />
            {(!sectionExistsInSchema || isNewUnsavedSection) && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                <span className="text-amber-600">⚠</span>
                <span>Please save the section before adding fields.</span>
              </div>
            )}
            {sectionExistsInSchema && !isNewUnsavedSection && hasUnsavedChanges && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                <span className="text-amber-600">⚠</span>
                <span>Please save your changes before adding fields.</span>
              </div>
            )}
            {hasIncompleteFields && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                <span className="text-amber-600">⚠</span>
                <span>Please complete the configuration for the new field before adding another field or saving the section.</span>
              </div>
            )}
          </div>
          )}
          </div>
        </div>
        <DialogFooter className="px-6 pt-4 pb-6 border-t border-gray-100 shrink-0 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto text-sm md:text-base">
            Cancel
          </Button>
            <Button 
              onClick={handleSave} 
              disabled={!canSave}
              className="w-full sm:w-auto text-sm md:text-base"
            >
                <span className="hidden md:inline">Save Changes</span>
                <span className="md:hidden">Save</span>
              </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

