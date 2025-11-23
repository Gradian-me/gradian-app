'use client';

import { Button } from '../../../components/ui/button';
import { TextInput, Textarea, NumberInput, Switch, Select, Slider, ButtonMinimal, NameInput, PopupPicker } from '@/gradian-ui/form-builder/form-elements';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  const [isTargetSchemaPickerOpen, setIsTargetSchemaPickerOpen] = useState(false);
  const [isRelationTypePickerOpen, setIsRelationTypePickerOpen] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Initialize tempSection from section
    // If it's a repeating section without fieldRelationType, default to 'connectToSchema'
    const updatedSection = { ...section };
    if (updatedSection.isRepeatingSection && updatedSection.repeatingConfig && !updatedSection.repeatingConfig.fieldRelationType) {
      updatedSection.repeatingConfig = {
        ...updatedSection.repeatingConfig,
        fieldRelationType: 'connectToSchema',
      };
    }
    setTempSection(updatedSection);
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
    tempSection.repeatingConfig?.fieldRelationType === 'connectToSchema' &&
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
            // Sort relation types by label
            const sorted = (result.data || []).sort((a: any, b: any) => 
              (a.label || '').localeCompare(b.label || '')
            );
            setRelationTypes(sorted);
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
            // Filter out current schema from available schemas and sort by name
            const schemas = result.data
              .filter((s: FormSchema) => s.id !== currentSchemaId)
              .map((s: FormSchema) => ({ id: s.id, name: s.plural_name || s.singular_name }))
              .sort((a: { id: string; name: string }, b: { id: string; name: string }) => a.name.localeCompare(b.name));
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
  
  // Check if connectToSchema requires target schema and relation type
  const requiresConnectionConfig = tempSection.isRepeatingSection && 
    tempSection.repeatingConfig?.fieldRelationType === 'connectToSchema';
  const hasConnectionConfig = requiresConnectionConfig &&
    tempSection.repeatingConfig?.targetSchema &&
    tempSection.repeatingConfig?.relationTypeId;
  const isConnectionConfigIncomplete = requiresConnectionConfig && !hasConnectionConfig;

  // Determine if fields can be added (for repeating sections, only if fieldRelationType is 'addFields' or undefined)
  const canAddFieldsToSection = !tempSection.isRepeatingSection || 
    (tempSection.repeatingConfig?.fieldRelationType === 'addFields' || tempSection.repeatingConfig?.fieldRelationType === undefined);

  // Disable "Add Field" if:
  // 1. Section doesn't exist in schema, OR
  // 2. It's a new section that hasn't been saved (still has default "New Section" title), OR
  // 3. There are unsaved changes (must save before adding fields), OR
  // 4. There are incomplete fields, OR
  // 5. Field relation type is 'connectToSchema' (fields are managed in target schema)
  const canAddField = sectionExistsInSchema && 
    !isNewUnsavedSection && 
    !hasUnsavedChanges && 
    !hasIncompleteFields &&
    canAddFieldsToSection;
  
  // Disable "Save" if:
  // 1. Title is invalid (empty, whitespace, or "New Section"), OR
  // 2. There are incomplete fields, OR
  // 3. Connection config is incomplete (connectToSchema selected but missing target schema or relation type)
  const canSave = !isTitleInvalid && !hasIncompleteFields && !isConnectionConfigIncomplete;

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
                      ? { fieldRelationType: 'connectToSchema', minItems: 0, maxItems: undefined }
                      : tempSection.repeatingConfig,
                });
              }}
            />
            {/* Field Relation Type Toggle Group - Only show for repeating sections */}
            {tempSection.isRepeatingSection && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Field Relation Type</label>
                <ToggleGroup
                  type="single"
                  value={tempSection.repeatingConfig?.fieldRelationType || 'connectToSchema'}
                  onValueChange={(value) => {
                    if (value) {
                      setTempSection({
                        ...tempSection,
                        repeatingConfig: {
                          ...tempSection.repeatingConfig,
                          fieldRelationType: value as 'addFields' | 'connectToSchema',
                          // Clear targetSchema and relationTypeId when switching to 'addFields'
                          ...(value === 'addFields' && {
                            targetSchema: undefined,
                            relationTypeId: undefined,
                          }),
                        },
                      });
                    }
                  }}
                  className="w-full"
                >
                  <ToggleGroupItem value="connectToSchema" className="flex-1">
                    Connect To Schema
                  </ToggleGroupItem>
                  <ToggleGroupItem value="addFields" className="flex-1">
                    Add Fields
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs text-gray-500">
                  {tempSection.repeatingConfig?.fieldRelationType === 'connectToSchema'
                    ? 'Fields will be managed in the connected schema. Configure target schema and relation type below.'
                    : 'Fields will be added directly to this section.'}
                </p>
              </div>
            )}
            {/* Show N.A switch option only for repeating sections (not with minItems > 1) */}
            {tempSection.isRepeatingSection && (tempSection.repeatingConfig?.minItems ?? 0) <= 1 && (
              <Switch
                config={{ name: `show-not-applicable-${section.id}`, label: 'Show Not Applicable Switch' }}
                value={tempSection.showNotApplicable === true}
                onChange={(checked: boolean) => {
                  const updates: any = { showNotApplicable: checked };
                  // When enabling N.A switch, set minItems to 0
                  if (checked) {
                    updates.repeatingConfig = {
                      ...tempSection.repeatingConfig,
                      minItems: 0,
                    };
                  }
                  setTempSection({ ...tempSection, ...updates });
                }}
              />
            )}
          </div>

          {/* Repeating Section Configuration */}
          {tempSection.isRepeatingSection && (
          <div className="pt-4 space-y-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200"></div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Configuration</span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            
            {/* Relation-based configuration - Only show when fieldRelationType is 'connectToSchema' */}
            {tempSection.repeatingConfig?.fieldRelationType === 'connectToSchema' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Target Schema <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-between ${!tempSection.repeatingConfig?.targetSchema && isConnectionConfigIncomplete ? 'border-red-300' : ''}`}
                    onClick={() => setIsTargetSchemaPickerOpen(true)}
                  >
                    <span className="truncate">
                      {tempSection.repeatingConfig?.targetSchema
                        ? availableSchemas.find(s => s.id === tempSection.repeatingConfig?.targetSchema)?.name || tempSection.repeatingConfig.targetSchema
                        : 'Select target schema...'}
                    </span>
                  </Button>
                  {!tempSection.repeatingConfig?.targetSchema && isConnectionConfigIncomplete && (
                    <p className="text-xs text-red-600">Target schema is required when using "Connect To Schema"</p>
                  )}
                  <PopupPicker
                    isOpen={isTargetSchemaPickerOpen}
                    onClose={() => setIsTargetSchemaPickerOpen(false)}
                    staticItems={availableSchemas.map(s => ({ id: s.id, name: s.name, title: s.name }))}
                    onSelect={async (selections, rawItems) => {
                      if (selections.length > 0 && rawItems.length > 0) {
                    setTempSection({
                      ...tempSection,
                          repeatingConfig: { ...tempSection.repeatingConfig, targetSchema: selections[0].id || undefined },
                        });
                      }
                      setIsTargetSchemaPickerOpen(false);
                    }}
                    title="Select Target Schema"
                    description="Choose a schema to link to this repeating section"
                    allowMultiselect={false}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Relation Type <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-between ${!tempSection.repeatingConfig?.relationTypeId && isConnectionConfigIncomplete ? 'border-red-300' : ''}`}
                    onClick={() => setIsRelationTypePickerOpen(true)}
                  >
                    <span className="truncate">
                      {tempSection.repeatingConfig?.relationTypeId
                        ? relationTypes.find(rt => rt.id === tempSection.repeatingConfig?.relationTypeId)?.label || tempSection.repeatingConfig.relationTypeId
                        : 'Select relation type...'}
                    </span>
                  </Button>
                  {!tempSection.repeatingConfig?.relationTypeId && isConnectionConfigIncomplete && (
                    <p className="text-xs text-red-600">Relation type is required when using "Connect To Schema"</p>
                  )}
                  <PopupPicker
                    isOpen={isRelationTypePickerOpen}
                    onClose={() => setIsRelationTypePickerOpen(false)}
                    staticItems={relationTypes.map(rt => ({ id: rt.id, name: rt.label, title: rt.label }))}
                    onSelect={async (selections, rawItems) => {
                      if (selections.length > 0 && rawItems.length > 0) {
                    setTempSection({
                      ...tempSection,
                          repeatingConfig: { ...tempSection.repeatingConfig, relationTypeId: selections[0].id || undefined },
                        });
                      }
                      setIsRelationTypePickerOpen(false);
                    }}
                    title="Select Relation Type"
                    description="Choose a relation type for this repeating section"
                    allowMultiselect={false}
                  />
                </div>
              </div>
              {isConnectionConfigIncomplete && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    <span className="font-medium">Required:</span> Please select both Target Schema and Relation Type to save this section.
                  </p>
                </div>
              )}
            </div>
            )}

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

          {/* Fields Section - Only show for non-repeating sections or repeating sections with 'addFields' type */}
          {(!tempSection.isRepeatingSection || !tempSection.repeatingConfig || tempSection.repeatingConfig?.fieldRelationType === 'addFields' || tempSection.repeatingConfig?.fieldRelationType === undefined) && (
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
          <div className="w-full space-y-2">
            {isConnectionConfigIncomplete && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                <span className="text-red-600">⚠</span>
                <span>Please select both Target Schema and Relation Type to save this section.</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
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
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

