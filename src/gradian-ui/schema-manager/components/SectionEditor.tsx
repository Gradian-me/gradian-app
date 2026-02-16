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
  getDefaultLanguage,
  getT,
  resolveFromTranslationsArray,
  resolveDisplayLabel,
  isTranslationArray,
  recordToTranslationArray,
} from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
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
  const [isSectionIdCustom, setIsSectionIdCustom] = useState(false);
  const [isTargetSchemaPickerOpen, setIsTargetSchemaPickerOpen] = useState(false);
  const [isRelationTypePickerOpen, setIsRelationTypePickerOpen] = useState(false);
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const sectionEditTitle = getT(TRANSLATION_KEYS.SECTION_EDIT_TITLE, language, defaultLang);
  const sectionDescDialog = getT(TRANSLATION_KEYS.SECTION_DESCRIPTION_DIALOG, language, defaultLang);
  const sectionLabelTitle = getT(TRANSLATION_KEYS.SECTION_LABEL_TITLE, language, defaultLang);
  const sectionPlaceholderTitle = getT(TRANSLATION_KEYS.SECTION_PLACEHOLDER_TITLE, language, defaultLang);
  const sectionLabelId = getT(TRANSLATION_KEYS.SECTION_LABEL_ID, language, defaultLang);
  const sectionPlaceholderId = getT(TRANSLATION_KEYS.SECTION_PLACEHOLDER_ID, language, defaultLang);
  const sectionHelperId = getT(TRANSLATION_KEYS.SECTION_HELPER_ID, language, defaultLang);
  const sectionLabelDesc = getT(TRANSLATION_KEYS.SECTION_LABEL_DESCRIPTION, language, defaultLang);
  const sectionPlaceholderDesc = getT(TRANSLATION_KEYS.SECTION_PLACEHOLDER_DESCRIPTION, language, defaultLang);
  const sectionLabelInitialState = getT(TRANSLATION_KEYS.SECTION_LABEL_INITIAL_STATE, language, defaultLang);
  const sectionOptionExpanded = getT(TRANSLATION_KEYS.SECTION_OPTION_EXPANDED, language, defaultLang);
  const sectionOptionCollapsed = getT(TRANSLATION_KEYS.SECTION_OPTION_COLLAPSED, language, defaultLang);
  const sectionLabelColumns = getT(TRANSLATION_KEYS.SECTION_LABEL_COLUMNS, language, defaultLang);
  const sectionLabelInactive = getT(TRANSLATION_KEYS.LABEL_INACTIVE, language, defaultLang);
  const sectionLabelRepeating = getT(TRANSLATION_KEYS.SECTION_LABEL_REPEATING, language, defaultLang);
  const sectionLabelFieldRelationType = getT(TRANSLATION_KEYS.SECTION_LABEL_FIELD_RELATION_TYPE, language, defaultLang);
  const sectionOptionConnect = getT(TRANSLATION_KEYS.SECTION_OPTION_CONNECT_TO_SCHEMA, language, defaultLang);
  const sectionOptionAddFields = getT(TRANSLATION_KEYS.SECTION_OPTION_ADD_FIELDS, language, defaultLang);
  const sectionDescConnect = getT(TRANSLATION_KEYS.SECTION_DESC_CONNECT_TO_SCHEMA, language, defaultLang);
  const sectionDescAddFields = getT(TRANSLATION_KEYS.SECTION_DESC_ADD_FIELDS, language, defaultLang);
  const sectionLabelShowNA = getT(TRANSLATION_KEYS.SECTION_LABEL_SHOW_NOT_APPLICABLE, language, defaultLang);
  const sectionLabelConfig = getT(TRANSLATION_KEYS.SECTION_LABEL_CONFIGURATION, language, defaultLang);
  const sectionLabelTargetSchema = getT(TRANSLATION_KEYS.SECTION_LABEL_TARGET_SCHEMA, language, defaultLang);
  const sectionPlaceholderTargetSchema = getT(TRANSLATION_KEYS.SECTION_PLACEHOLDER_SELECT_TARGET_SCHEMA, language, defaultLang);
  const sectionMsgTargetRequired = getT(TRANSLATION_KEYS.SECTION_MSG_TARGET_SCHEMA_REQUIRED, language, defaultLang);
  const sectionLabelRelationType = getT(TRANSLATION_KEYS.SECTION_LABEL_RELATION_TYPE, language, defaultLang);
  const sectionPlaceholderRelationType = getT(TRANSLATION_KEYS.SECTION_PLACEHOLDER_SELECT_RELATION_TYPE, language, defaultLang);
  const sectionMsgRelationRequired = getT(TRANSLATION_KEYS.SECTION_MSG_RELATION_TYPE_REQUIRED, language, defaultLang);
  const sectionMsgRequiredBoth = getT(TRANSLATION_KEYS.SECTION_MSG_REQUIRED_BOTH, language, defaultLang);
  const sectionLabelMinItems = getT(TRANSLATION_KEYS.SECTION_LABEL_MIN_ITEMS, language, defaultLang);
  const sectionLabelMaxItems = getT(TRANSLATION_KEYS.SECTION_LABEL_MAX_ITEMS, language, defaultLang);
  const sectionTitleSelectTarget = getT(TRANSLATION_KEYS.SECTION_TITLE_SELECT_TARGET_SCHEMA, language, defaultLang);
  const sectionDescSelectTarget = getT(TRANSLATION_KEYS.SECTION_DESC_SELECT_TARGET_SCHEMA, language, defaultLang);
  const sectionTitleSelectRelation = getT(TRANSLATION_KEYS.SECTION_TITLE_SELECT_RELATION_TYPE, language, defaultLang);
  const sectionDescSelectRelation = getT(TRANSLATION_KEYS.SECTION_DESC_SELECT_RELATION_TYPE, language, defaultLang);
  const sectionErrorTitleInvalid = getT(TRANSLATION_KEYS.SECTION_ERROR_TITLE_INVALID, language, defaultLang);
  const buttonCancel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const buttonSaveChanges = getT(TRANSLATION_KEYS.FIELD_LABEL_SAVE_CHANGES, language, defaultLang);
  const buttonSave = getT(TRANSLATION_KEYS.BUTTON_SAVE, language, defaultLang);
  const labelAddField = getT(TRANSLATION_KEYS.SCHEMA_LABEL_ADD_FIELD, language, defaultLang);
  const labelFields = getT(TRANSLATION_KEYS.SECTION_LABEL_FIELDS, language, defaultLang);
  const msgNoFieldsYet = getT(TRANSLATION_KEYS.SECTION_MSG_NO_FIELDS_YET, language, defaultLang);
  const sectionDescAddOnly = getT(TRANSLATION_KEYS.SECTION_DESC_ADD_ONLY, language, defaultLang);
  const sectionDescCanSelect = getT(TRANSLATION_KEYS.SECTION_DESC_CAN_SELECT, language, defaultLang);
  const sectionDescMustSelect = getT(TRANSLATION_KEYS.SECTION_DESC_MUST_SELECT, language, defaultLang);
  const sectionLabelUniqueSelection = getT(TRANSLATION_KEYS.SECTION_LABEL_UNIQUE_SELECTION, language, defaultLang);
  const sectionDescUniqueSelection = getT(TRANSLATION_KEYS.SECTION_DESC_UNIQUE_SELECTION, language, defaultLang);
  const sectionMsgRelationBased = getT(TRANSLATION_KEYS.SECTION_MSG_RELATION_BASED, language, defaultLang);
  const sectionMsgFieldsManagedInTarget = getT(TRANSLATION_KEYS.SECTION_MSG_FIELDS_MANAGED_IN_TARGET, language, defaultLang);
  const msgSaveBeforeAddFields = getT(TRANSLATION_KEYS.SECTION_MSG_SAVE_BEFORE_ADD_FIELDS, language, defaultLang);
  const sectionLabelDeleteType = getT(TRANSLATION_KEYS.SECTION_LABEL_DELETE_TYPE, language, defaultLang);
  const sectionOptionDeleteRelationOnly = getT(TRANSLATION_KEYS.SECTION_OPTION_DELETE_RELATION_ONLY, language, defaultLang);
  const sectionOptionDeleteItemAndRelation = getT(TRANSLATION_KEYS.SECTION_OPTION_DELETE_ITEM_AND_RELATION, language, defaultLang);
  const sectionDescDeleteRelationOnly = getT(TRANSLATION_KEYS.SECTION_DESC_DELETE_RELATION_ONLY, language, defaultLang);
  const sectionDescDeleteItemAndRelation = getT(TRANSLATION_KEYS.SECTION_DESC_DELETE_ITEM_AND_RELATION, language, defaultLang);
  const sectionLabelAddType = getT(TRANSLATION_KEYS.SECTION_LABEL_ADD_TYPE, language, defaultLang);
  const sectionOptionAddOnly = getT(TRANSLATION_KEYS.SECTION_OPTION_ADD_ONLY, language, defaultLang);
  const sectionOptionCanSelectFromData = getT(TRANSLATION_KEYS.SECTION_OPTION_CAN_SELECT_FROM_DATA, language, defaultLang);
  const sectionOptionMustSelectFromData = getT(TRANSLATION_KEYS.SECTION_OPTION_MUST_SELECT_FROM_DATA, language, defaultLang);

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
    // Derive title/description from translations if missing (e.g. legacy data)
    if (!updatedSection.title && updatedSection.titleTranslations?.length) {
      updatedSection.title = resolveFromTranslationsArray(updatedSection.titleTranslations, defaultLang, defaultLang);
    }
    if (!updatedSection.description && updatedSection.descriptionTranslations?.length) {
      updatedSection.description = resolveFromTranslationsArray(updatedSection.descriptionTranslations, defaultLang, defaultLang);
    }
    setTempSection(updatedSection);
    setIsSectionIdCustom(false);
  }, [section, defaultLang]);

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

  // Check if a field is incomplete (has default values)
  // Resolve label/name to string (API may return translation arrays/objects)
  const isFieldIncomplete = (field: any): boolean => {
    const labelStr = typeof field.label === 'string' ? field.label : resolveDisplayLabel(field.label, language, defaultLang);
    const nameStr = typeof field.name === 'string' ? field.name : String(field.name ?? '');
    return (field.label === 'New Field' && field.name === 'newField') || 
           !field.label || 
           !field.name ||
           !field.component ||
           labelStr.trim() === '' ||
           nameStr.trim() === '';
  };

  // Check if there are any incomplete fields
  const hasIncompleteFields = fields.some(isFieldIncomplete);

  // Check if the section exists in the schema
  const sectionExistsInSchema = sections.some(s => s.id === section.id);
  
  // Check if this is a new section that hasn't been saved yet (still has default title)
  const isNewUnsavedSection = section.title === 'New Section' && sectionExistsInSchema;
  
  // Check if there are unsaved changes (tempSection differs from original section)
  const hasUnsavedChanges = JSON.stringify(tempSection) !== JSON.stringify(section);
  
  // Resolve section title to string (API may return translation array/object)
  const titleStr = typeof tempSection.title === 'string' ? tempSection.title : resolveDisplayLabel(tempSection.title, language, defaultLang);
  // Check if the title is invalid (empty, whitespace only, or "New Section")
  const isTitleInvalid = !titleStr || 
                         titleStr.trim() === '' || 
                         titleStr.trim() === 'New Section';
  
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
          <DialogTitle>{sectionEditTitle}</DialogTitle>
          <DialogDescription>
            {sectionDescDialog}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-5 py-4">
          <TextInput
            config={{ name: 'section-title', label: sectionLabelTitle, placeholder: sectionPlaceholderTitle }}
            value={
              tempSection.titleTranslations ??
              (tempSection.title
                ? recordToTranslationArray({ [defaultLang]: tempSection.title })
                : [])
            }
            onChange={(value) => {
              if (isTranslationArray(value)) {
                const title = resolveFromTranslationsArray(value, defaultLang, defaultLang) || tempSection.title || '';
                setTempSection((prev) => {
                  const updated = { ...prev, titleTranslations: value, title };
                  if (!isSectionIdCustom) updated.id = generateSchemaId(title);
                  return updated;
                });
              } else if (typeof value === 'string') {
                setTempSection((prev) => {
                  const updated = { ...prev, title: value };
                  if (!isSectionIdCustom) updated.id = generateSchemaId(value);
                  return updated;
                });
              }
            }}
            error={
              isTitleInvalid
                ? sectionErrorTitleInvalid
                : undefined
            }
            allowTranslation
            language={language}
            defaultLanguage={defaultLang}
          />
          <div>
            <NameInput
              config={{ name: 'section-id', label: sectionLabelId, placeholder: sectionPlaceholderId }}
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
              helperText={sectionHelperId}
            />
          </div>
          <Textarea
            config={{ name: 'section-description', label: sectionLabelDesc, placeholder: sectionPlaceholderDesc }}
            value={
              tempSection.descriptionTranslations ??
              (tempSection.description
                ? recordToTranslationArray({ [defaultLang]: tempSection.description })
                : [])
            }
            onChange={(value) => {
              if (isTranslationArray(value)) {
                setTempSection({
                  ...tempSection,
                  descriptionTranslations: value,
                  description:
                    resolveFromTranslationsArray(value, defaultLang, defaultLang) || tempSection.description || '',
                });
              } else if (typeof value === 'string') {
                setTempSection({ ...tempSection, description: value });
              }
            }}
            rows={2}
            resize="none"
            allowTranslation
            language={language}
            defaultLanguage={defaultLang}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              config={{ name: 'initial-state', label: sectionLabelInitialState }}
              value={tempSection.initialState || 'expanded'}
              onValueChange={(value) => setTempSection({ ...tempSection, initialState: value as 'expanded' | 'collapsed' })}
              options={[
                { value: 'expanded', label: sectionOptionExpanded },
                { value: 'collapsed', label: sectionOptionCollapsed }
              ]}
            />
            <div>
              <Slider
                config={{
                  name: 'columns',
                  label: sectionLabelColumns,
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
              config={{ name: `inactive-${section.id}`, label: sectionLabelInactive }}
              value={tempSection.inactive || false}
              onChange={(checked: boolean) => setTempSection({ ...tempSection, inactive: checked })}
            />
            <Switch
              config={{ name: `repeating-${section.id}`, label: sectionLabelRepeating }}
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{sectionLabelFieldRelationType}</label>
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
                    {sectionOptionConnect}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="addFields" className="flex-1">
                    {sectionOptionAddFields}
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs text-gray-500">
                  {tempSection.repeatingConfig?.fieldRelationType === 'connectToSchema'
                    ? sectionDescConnect
                    : sectionDescAddFields}
                </p>
              </div>
            )}
            {/* Show N.A switch option only for repeating sections (not with minItems > 1) */}
            {tempSection.isRepeatingSection && (tempSection.repeatingConfig?.minItems ?? 0) <= 1 && (
              <Switch
                config={{ name: `show-not-applicable-${section.id}`, label: sectionLabelShowNA }}
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
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{sectionLabelConfig}</span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            
            {/* Relation-based configuration - Only show when fieldRelationType is 'connectToSchema' */}
            {tempSection.repeatingConfig?.fieldRelationType === 'connectToSchema' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {sectionLabelTargetSchema} <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-between ${!tempSection.repeatingConfig?.targetSchema && isConnectionConfigIncomplete ? 'border-red-300' : ''}`}
                    onClick={() => setIsTargetSchemaPickerOpen(true)}
                  >
                    <span className="truncate">
                      {tempSection.repeatingConfig?.targetSchema || sectionPlaceholderTargetSchema}
                    </span>
                  </Button>
                  {!tempSection.repeatingConfig?.targetSchema && isConnectionConfigIncomplete && (
                    <p className="text-xs text-red-600">{sectionMsgTargetRequired}</p>
                  )}
                  <PopupPicker
                    isOpen={isTargetSchemaPickerOpen}
                    onClose={() => setIsTargetSchemaPickerOpen(false)}
                    sourceUrl="/api/schemas"
                    excludeIds={currentSchemaId ? [currentSchemaId] : []}
                    selectedIds={tempSection.repeatingConfig?.targetSchema ? [tempSection.repeatingConfig.targetSchema] : []}
                    onSelect={async (selections, rawItems) => {
                      if (selections.length > 0) {
                        setTempSection({
                          ...tempSection,
                          repeatingConfig: { 
                            ...tempSection.repeatingConfig, 
                            targetSchema: selections[0].id || undefined 
                          },
                        });
                      }
                      setIsTargetSchemaPickerOpen(false);
                    }}
                    title={sectionTitleSelectTarget}
                    description={sectionDescSelectTarget}
                    allowMultiselect={false}
                    columnMap={{
                      response: { data: 'data' },
                      item: { 
                        id: 'id', 
                        label: 'plural_name',
                        title: 'plural_name',
                        name: 'singular_name',
                      },
                    }}
                    sortType="ASC"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {sectionLabelRelationType} <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-between ${!tempSection.repeatingConfig?.relationTypeId && isConnectionConfigIncomplete ? 'border-red-300' : ''}`}
                    onClick={() => setIsRelationTypePickerOpen(true)}
                  >
                    <span className="truncate">
                      {tempSection.repeatingConfig?.relationTypeId || sectionPlaceholderRelationType}
                    </span>
                  </Button>
                  {!tempSection.repeatingConfig?.relationTypeId && isConnectionConfigIncomplete && (
                    <p className="text-xs text-red-600">{sectionMsgRelationRequired}</p>
                  )}
                  <PopupPicker
                    isOpen={isRelationTypePickerOpen}
                    onClose={() => setIsRelationTypePickerOpen(false)}
                    schemaId="relation-types"
                    selectedIds={tempSection.repeatingConfig?.relationTypeId ? [tempSection.repeatingConfig.relationTypeId] : []}
                    onSelect={async (selections, rawItems) => {
                      if (selections.length > 0) {
                        setTempSection({
                          ...tempSection,
                          repeatingConfig: { 
                            ...tempSection.repeatingConfig, 
                            relationTypeId: selections[0].id || undefined 
                          },
                        });
                      }
                      setIsRelationTypePickerOpen(false);
                    }}
                    title={sectionTitleSelectRelation}
                    description={sectionDescSelectRelation}
                    allowMultiselect={false}
                    columnMap={{
                      response: { data: 'data' },
                      item: { 
                        id: 'id', 
                        label: 'label',
                        title: 'label',
                      },
                    }}
                    sortType="ASC"
                  />
                </div>
              </div>
              {isConnectionConfigIncomplete && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    {sectionMsgRequiredBoth}
                  </p>
                </div>
              )}
            </div>
            )}

            {/* Common repeating config fields */}
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                config={{ name: 'min-items', label: sectionLabelMinItems }}
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
                config={{ name: 'max-items', label: sectionLabelMaxItems }}
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
                      config={{ name: 'delete-type', label: sectionLabelDeleteType }}
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
                        { value: 'relationOnly', label: sectionOptionDeleteRelationOnly },
                        { value: 'itemAndRelation', label: sectionOptionDeleteItemAndRelation },
                      ]}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {tempSection.repeatingConfig?.deleteType === 'relationOnly' 
                        ? sectionDescDeleteRelationOnly
                        : sectionDescDeleteItemAndRelation}
                    </p>
                  </div>
                  <div>
                    <Select
                      config={{ name: 'add-type', label: sectionLabelAddType }}
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
                        { value: 'addOnly', label: sectionOptionAddOnly },
                        { value: 'canSelectFromData', label: sectionOptionCanSelectFromData },
                        { value: 'mustSelectFromData', label: sectionOptionMustSelectFromData },
                      ]}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {tempSection.repeatingConfig?.addType === 'addOnly' 
                        ? sectionDescAddOnly
                        : tempSection.repeatingConfig?.addType === 'canSelectFromData'
                        ? sectionDescCanSelect
                        : sectionDescMustSelect}
                    </p>
                  </div>
                  {(tempSection.repeatingConfig?.addType === 'canSelectFromData' || tempSection.repeatingConfig?.addType === 'mustSelectFromData') && (
                    <div className="space-y-1.5">
                      <Switch
                        config={{ name: `unique-selection-${section.id}`, label: sectionLabelUniqueSelection }}
                        value={tempSection.repeatingConfig?.isUnique || false}
                        onChange={(checked: boolean) =>
                          setTempSection({
                            ...tempSection,
                            repeatingConfig: { ...tempSection.repeatingConfig, isUnique: checked },
                          })
                        }
                      />
                      <p className="text-xs text-gray-500 ps-8">
                        {sectionDescUniqueSelection}
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <span className="font-medium">{sectionMsgRelationBased}</span> {sectionMsgFieldsManagedInTarget} &quot;{tempSection.repeatingConfig?.targetSchema}&quot;.
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
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{labelFields}</h4>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{fields.length}</span>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">{msgNoFieldsYet}</p>
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
              label={labelAddField}
              onClick={() => onAddField(section.id)}
              iconSize="w-4 h-4"
              textSize="text-xs"
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
                <span>{msgSaveBeforeAddFields}</span>
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
                <span>{sectionMsgRequiredBoth}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto text-xs">
                {buttonCancel}
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!canSave}
                className="w-full sm:w-auto text-xs"
              >
                <span className="hidden md:inline">{buttonSaveChanges}</span>
                <span className="md:hidden">{buttonSave}</span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

