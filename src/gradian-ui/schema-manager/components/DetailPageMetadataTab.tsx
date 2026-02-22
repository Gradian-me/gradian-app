'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select as UiSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TextInput, Textarea, NumberInput, Slider, SortableSelector, Select as FormSelect, IconInput } from '@/gradian-ui/form-builder/form-elements';
import type { SortableSelectorItem } from '@/gradian-ui/form-builder/form-elements';
import { FormSchema, DetailPageMetadata, DetailPageSection, ComponentRendererConfig, RepeatingTableRendererConfig, QuickAction, FormField } from '../types/form-schema';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { useAiAgents } from '@/domains/ai-builder';
import { LanguageSelector } from '@/gradian-ui/form-builder/form-elements/components/LanguageSelector';
import { getT, getDefaultLanguage, isTranslationArray, recordToTranslationArray, resolveDisplayLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

interface DetailPageMetadataTabProps {
  schema: FormSchema;
  onUpdate: (updates: Partial<FormSchema>) => void;
}

export function DetailPageMetadataTab({ schema, onUpdate }: DetailPageMetadataTabProps) {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const titleDetailSections = getT(TRANSLATION_KEYS.SCHEMA_TITLE_DETAIL_PAGE_SECTIONS, language, defaultLang);
  const titleQuickActions = getT(TRANSLATION_KEYS.SCHEMA_TITLE_QUICK_ACTIONS, language, defaultLang);
  const titleTableRenderers = getT(TRANSLATION_KEYS.SCHEMA_TITLE_TABLE_RENDERERS, language, defaultLang);
  const titleComponentRenderers = getT(TRANSLATION_KEYS.SCHEMA_TITLE_COMPONENT_RENDERERS, language, defaultLang);
  const titleLayout = getT(TRANSLATION_KEYS.SCHEMA_TITLE_LAYOUT, language, defaultLang);
  const titleHeader = getT(TRANSLATION_KEYS.SCHEMA_TITLE_HEADER, language, defaultLang);
  const msgNoSections = getT(TRANSLATION_KEYS.DETAIL_MSG_NO_SECTIONS, language, defaultLang);
  const msgNoQuickActions = getT(TRANSLATION_KEYS.DETAIL_MSG_NO_QUICK_ACTIONS, language, defaultLang);
  const msgNoTableRenderers = getT(TRANSLATION_KEYS.DETAIL_MSG_NO_TABLE_RENDERERS, language, defaultLang);
  const msgNoComponentRenderers = getT(TRANSLATION_KEYS.DETAIL_MSG_NO_COMPONENT_RENDERERS, language, defaultLang);
  const buttonAddSection = getT(TRANSLATION_KEYS.DETAIL_BUTTON_ADD_SECTION, language, defaultLang);
  const buttonAddAction = getT(TRANSLATION_KEYS.DETAIL_BUTTON_ADD_ACTION, language, defaultLang);
  const buttonAddTable = getT(TRANSLATION_KEYS.DETAIL_BUTTON_ADD_TABLE, language, defaultLang);
  const buttonAddComponent = getT(TRANSLATION_KEYS.DETAIL_BUTTON_ADD_COMPONENT, language, defaultLang);
  const labelUntitledSection = getT(TRANSLATION_KEYS.SCHEMA_LABEL_UNTITLED_SECTION, language, defaultLang);
  const labelUntitledAction = getT(TRANSLATION_KEYS.DETAIL_LABEL_UNTITLED_ACTION, language, defaultLang);
  const labelUntitledTable = getT(TRANSLATION_KEYS.DETAIL_LABEL_UNTITLED_TABLE, language, defaultLang);
  const labelUntitledComponent = getT(TRANSLATION_KEYS.DETAIL_LABEL_UNTITLED_COMPONENT, language, defaultLang);
  const labelSectionSingular = getT(TRANSLATION_KEYS.SCHEMA_LABEL_SECTION_COUNT, language, defaultLang);
  const labelSectionsPlural = getT(TRANSLATION_KEYS.SCHEMA_LABEL_SECTIONS_COUNT, language, defaultLang);
  const labelFieldSingular = getT(TRANSLATION_KEYS.SCHEMA_LABEL_FIELD_COUNT, language, defaultLang);
  const labelFieldsPlural = getT(TRANSLATION_KEYS.SCHEMA_LABEL_FIELDS_COUNT, language, defaultLang);
  const labelActionSingular = getT(TRANSLATION_KEYS.DETAIL_LABEL_ACTION_SINGULAR, language, defaultLang);
  const labelActionsPlural = getT(TRANSLATION_KEYS.DETAIL_LABEL_ACTIONS_PLURAL, language, defaultLang);
  const labelTableSingular = getT(TRANSLATION_KEYS.DETAIL_LABEL_TABLE_SINGULAR, language, defaultLang);
  const labelTablesPlural = getT(TRANSLATION_KEYS.DETAIL_LABEL_TABLES_PLURAL, language, defaultLang);
  const labelComponentSingular = getT(TRANSLATION_KEYS.DETAIL_LABEL_COMPONENT_SINGULAR, language, defaultLang);
  const labelComponentsPlural = getT(TRANSLATION_KEYS.DETAIL_LABEL_COMPONENTS_PLURAL, language, defaultLang);
  const labelColumnSingular = getT(TRANSLATION_KEYS.DETAIL_LABEL_COLUMN_SINGULAR, language, defaultLang);
  const labelColumnsPlural = getT(TRANSLATION_KEYS.DETAIL_LABEL_COLUMNS_PLURAL, language, defaultLang);
  const labelSelectedFields = getT(TRANSLATION_KEYS.DETAIL_LABEL_SELECTED_FIELDS, language, defaultLang);
  const labelAvailableFields = getT(TRANSLATION_KEYS.DETAIL_LABEL_AVAILABLE_FIELDS, language, defaultLang);
  const msgNoFieldsSelected = getT(TRANSLATION_KEYS.DETAIL_MSG_NO_FIELDS_SELECTED, language, defaultLang);
  const msgNoFieldsAvailable = getT(TRANSLATION_KEYS.DETAIL_MSG_NO_FIELDS_AVAILABLE, language, defaultLang);
  const labelShowBackButton = getT(TRANSLATION_KEYS.DETAIL_LABEL_SHOW_BACK_BUTTON, language, defaultLang);
  const labelShowActions = getT(TRANSLATION_KEYS.DETAIL_LABEL_SHOW_ACTIONS, language, defaultLang);
  const labelMainColumns = getT(TRANSLATION_KEYS.DETAIL_LABEL_MAIN_COLUMNS, language, defaultLang);
  const labelSidebarColumns = getT(TRANSLATION_KEYS.DETAIL_LABEL_SIDEBAR_COLUMNS, language, defaultLang);
  const labelColumnArea = getT(TRANSLATION_KEYS.DETAIL_LABEL_COLUMN_AREA, language, defaultLang);
  const optionMain = getT(TRANSLATION_KEYS.DETAIL_OPTION_MAIN, language, defaultLang);
  const optionSidebar = getT(TRANSLATION_KEYS.DETAIL_OPTION_SIDEBAR, language, defaultLang);
  const labelSelectedColumns = getT(TRANSLATION_KEYS.DETAIL_LABEL_SELECTED_COLUMNS, language, defaultLang);
  const msgNoColumnsSelected = getT(TRANSLATION_KEYS.DETAIL_MSG_NO_COLUMNS_SELECTED, language, defaultLang);
  const labelSectionId = getT(TRANSLATION_KEYS.SECTION_LABEL_ID, language, defaultLang);
  const labelTitle = getT(TRANSLATION_KEYS.DETAIL_LABEL_TITLE, language, defaultLang);
  const labelDescription = getT(TRANSLATION_KEYS.SECTION_LABEL_DESCRIPTION, language, defaultLang);
  const labelColumnSpan = getT(TRANSLATION_KEYS.DETAIL_LABEL_COLUMN_SPAN, language, defaultLang);
  const labelBadgeVariant = getT(TRANSLATION_KEYS.DETAIL_LABEL_BADGE_VARIANT, language, defaultLang);
  const labelEnforceBadgeVariant = getT(TRANSLATION_KEYS.DETAIL_LABEL_ENFORCE_BADGE_VARIANT, language, defaultLang);
  const labelBadgeClickable = getT(TRANSLATION_KEYS.DETAIL_LABEL_BADGE_CLICKABLE, language, defaultLang);
  const labelLayoutColumns = getT(TRANSLATION_KEYS.DETAIL_LABEL_LAYOUT_COLUMNS, language, defaultLang);
  const labelLayoutGap = getT(TRANSLATION_KEYS.DETAIL_LABEL_LAYOUT_GAP, language, defaultLang);
  const labelActionId = getT(TRANSLATION_KEYS.DETAIL_LABEL_ACTION_ID, language, defaultLang);
  const labelActionType = getT(TRANSLATION_KEYS.DETAIL_LABEL_ACTION_TYPE, language, defaultLang);
  const labelVariant = getT(TRANSLATION_KEYS.DETAIL_LABEL_VARIANT, language, defaultLang);
  const labelTargetSchema = getT(TRANSLATION_KEYS.DETAIL_LABEL_TARGET_SCHEMA, language, defaultLang);
  const placeholderSchemaId = getT(TRANSLATION_KEYS.DETAIL_PLACEHOLDER_SCHEMA_ID, language, defaultLang);
  const labelTargetUrl = getT(TRANSLATION_KEYS.DETAIL_LABEL_TARGET_URL, language, defaultLang);
  const labelRendererId = getT(TRANSLATION_KEYS.DETAIL_LABEL_RENDERER_ID, language, defaultLang);
  const labelRelationTypeId = getT(TRANSLATION_KEYS.DETAIL_LABEL_RELATION_TYPE_ID, language, defaultLang);
  const placeholderSectionIdFromTarget = getT(TRANSLATION_KEYS.DETAIL_PLACEHOLDER_SECTION_ID_FROM_TARGET, language, defaultLang);
  const labelSortingEnabled = getT(TRANSLATION_KEYS.DETAIL_LABEL_SORTING_ENABLED, language, defaultLang);
  const labelPaginationEnabled = getT(TRANSLATION_KEYS.DETAIL_LABEL_PAGINATION_ENABLED, language, defaultLang);
  const labelPageSize = getT(TRANSLATION_KEYS.DETAIL_LABEL_PAGE_SIZE, language, defaultLang);
  const labelComponentType = getT(TRANSLATION_KEYS.DETAIL_LABEL_COMPONENT_TYPE, language, defaultLang);
  const labelComponentName = getT(TRANSLATION_KEYS.DETAIL_LABEL_COMPONENT_NAME, language, defaultLang);
  const labelDataPath = getT(TRANSLATION_KEYS.DETAIL_LABEL_DATA_PATH, language, defaultLang);
  const labelGap = getT(TRANSLATION_KEYS.DETAIL_LABEL_GAP, language, defaultLang);
  const labelActions = getT(TRANSLATION_KEYS.DETAIL_LABEL_ACTIONS, language, defaultLang);
  const msgNoSectionsAvailable = getT(TRANSLATION_KEYS.DETAIL_MSG_NO_SECTIONS_AVAILABLE, language, defaultLang);
  const labelAiAgent = getT(TRANSLATION_KEYS.DETAIL_LABEL_AI_AGENT, language, defaultLang);
  const placeholderSelectAiAgent = getT(TRANSLATION_KEYS.DETAIL_PLACEHOLDER_SELECT_AI_AGENT, language, defaultLang);
  const labelSelectedSections = getT(TRANSLATION_KEYS.DETAIL_LABEL_SELECTED_SECTIONS, language, defaultLang);
  const labelRunType = getT(TRANSLATION_KEYS.DETAIL_LABEL_RUN_TYPE, language, defaultLang);
  const labelDisplayType = getT(TRANSLATION_KEYS.DETAIL_LABEL_DISPLAY_TYPE, language, defaultLang);
  const labelDefaultLanguage = getT(TRANSLATION_KEYS.DETAIL_LABEL_DEFAULT_LANGUAGE, language, defaultLang);
  const optionManual = getT(TRANSLATION_KEYS.DETAIL_OPTION_MANUAL, language, defaultLang);
  const optionAutomatic = getT(TRANSLATION_KEYS.DETAIL_OPTION_AUTOMATIC, language, defaultLang);
  const optionShowForm = getT(TRANSLATION_KEYS.DETAIL_OPTION_SHOW_FORM, language, defaultLang);
  const optionHideForm = getT(TRANSLATION_KEYS.DETAIL_OPTION_HIDE_FORM, language, defaultLang);
  const labelFieldLabel = getT(TRANSLATION_KEYS.FIELD_LABEL_LABEL, language, defaultLang);
  const placeholderSelectDefaultLanguage = getT(TRANSLATION_KEYS.DETAIL_PLACEHOLDER_SELECT_DEFAULT_LANGUAGE, language, defaultLang);
  const msgDefaultLanguageDescription = getT(TRANSLATION_KEYS.DETAIL_MSG_DEFAULT_LANGUAGE_DESCRIPTION, language, defaultLang);
  const msgLeaveEmptyShowAllFields = getT(TRANSLATION_KEYS.DETAIL_MSG_LEAVE_EMPTY_SHOW_ALL_FIELDS, language, defaultLang);
  const placeholderCustomComponentName = getT(TRANSLATION_KEYS.DETAIL_PLACEHOLDER_CUSTOM_COMPONENT_NAME, language, defaultLang);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sections: true,
    quickActions: false,
    tableRenderers: false,
    componentRenderers: false,
    layout: false,
    header: false,
  });
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const { agents } = useAiAgents();

  const detailPageMetadata: DetailPageMetadata = schema.detailPageMetadata || {};
  const allFields = schema.fields || [];
  const availableFields = allFields.filter(f => !f.inactive);
  const allSections = schema.sections || [];

  const convertFieldsToSelectorItems = (fields: FormField[]): SortableSelectorItem[] => {
    return fields.map(field => {
      // Check if field has badge-related properties
      const badgeVariant = (field as any).badgeVariant;
      const fieldColor = (field as any).color;
      const optionColor = field.options?.find(opt => opt.color)?.color;
      
      return {
        id: field.id,
        label: field.label || field.name,
        icon: field.icon ? <IconRenderer iconName={field.icon} className="h-3 w-3" /> : undefined,
        color: badgeVariant || fieldColor || optionColor,
      };
    });
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const toggleItem = (itemKey: string) => {
    setExpandedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const updateDetailPageMetadata = (updates: Partial<DetailPageMetadata>) => {
    onUpdate({ detailPageMetadata: { ...detailPageMetadata, ...updates } });
  };

  // Sections management
  const sections = detailPageMetadata.sections || [];
  const addSection = () => {
    const newSection: DetailPageSection = {
      id: `detail-section-${Date.now()}`,
      title: 'New Section',
      fieldIds: [],
      colSpan: 2,
      columnArea: 'main',
    };
    updateDetailPageMetadata({ sections: [...sections, newSection] });
    toggleItem(`section-${newSection.id}`);
  };

  const updateSection = (sectionId: string, updates: Partial<DetailPageSection>) => {
    const updated = sections.map(s => s.id === sectionId ? { ...s, ...updates } : s);
    updateDetailPageMetadata({ sections: updated });
  };

  const deleteSection = (sectionId: string) => {
    const updated = sections.filter(s => s.id !== sectionId);
    updateDetailPageMetadata({ sections: updated });
  };

  const getSelectedFieldsForSection = (section: DetailPageSection): SortableSelectorItem[] => {
    const fieldIds = section.fieldIds || [];
    const selectedFields = fieldIds
      .map(id => availableFields.find(f => f.id === id))
      .filter((f): f is FormField => f !== undefined);
    return convertFieldsToSelectorItems(selectedFields);
  };

  const getAvailableFieldsForSection = (section: DetailPageSection): SortableSelectorItem[] => {
    const fieldIds = section.fieldIds || [];
    const unselectedFields = availableFields.filter(f => !fieldIds.includes(f.id));
    return convertFieldsToSelectorItems(unselectedFields);
  };

  const handleSectionFieldSelectionChange = (sectionId: string, selectedItems: SortableSelectorItem[]) => {
    const fieldIds = selectedItems.map(item => item.id);
    updateSection(sectionId, { fieldIds });
  };

  // Quick Actions management
  const quickActions = detailPageMetadata.quickActions || [];
  const addQuickAction = () => {
    const newAction: QuickAction = {
      id: `quick-action-${Date.now()}`,
      label: 'New Action',
      action: 'goToUrl',
      variant: 'default',
    };
    updateDetailPageMetadata({ quickActions: [...quickActions, newAction] });
    toggleItem(`action-${newAction.id}`);
  };

  const updateQuickAction = (actionId: string, updates: Partial<QuickAction>) => {
    const updated = quickActions.map(a => a.id === actionId ? { ...a, ...updates } : a);
    updateDetailPageMetadata({ quickActions: updated });
  };

  const deleteQuickAction = (actionId: string) => {
    const updated = quickActions.filter(a => a.id !== actionId);
    updateDetailPageMetadata({ quickActions: updated });
  };

  // Table Renderers management
  const tableRenderers = detailPageMetadata.tableRenderers || [];
  const addTableRenderer = () => {
    const newRenderer: RepeatingTableRendererConfig = {
      id: `table-renderer-${Date.now()}`,
      schemaId: schema.id,
      sectionId: '',
      colSpan: 2,
      columnArea: 'main',
    };
    updateDetailPageMetadata({ tableRenderers: [...tableRenderers, newRenderer] });
    toggleItem(`table-${newRenderer.id}`);
  };

  const updateTableRenderer = (rendererId: string, updates: Partial<RepeatingTableRendererConfig>) => {
    const updated = tableRenderers.map(r => r.id === rendererId ? { ...r, ...updates } : r);
    updateDetailPageMetadata({ tableRenderers: updated });
  };

  const deleteTableRenderer = (rendererId: string) => {
    const updated = tableRenderers.filter(r => r.id !== rendererId);
    updateDetailPageMetadata({ tableRenderers: updated });
  };

  const getSelectedColumns = (renderer: RepeatingTableRendererConfig): SortableSelectorItem[] => {
    const columns = renderer.columns || [];
    const selectedFields = columns
      .map(id => availableFields.find(f => f.id === id))
      .filter((f): f is FormField => f !== undefined);
    return convertFieldsToSelectorItems(selectedFields);
  };

  const getAvailableColumns = (renderer: RepeatingTableRendererConfig): SortableSelectorItem[] => {
    const columns = renderer.columns || [];
    const unselectedFields = availableFields.filter(f => !columns.includes(f.id));
    return convertFieldsToSelectorItems(unselectedFields);
  };

  const handleTableColumnSelectionChange = (rendererId: string, selectedItems: SortableSelectorItem[]) => {
    const fieldIds = selectedItems.map(item => item.id);
    updateTableRenderer(rendererId, { columns: fieldIds });
  };

  // Component Renderers management
  const componentRenderers = detailPageMetadata.componentRenderers || [];
  const addComponentRenderer = () => {
    const newRenderer: ComponentRendererConfig = {
      id: `component-renderer-${Date.now()}`,
      componentType: 'kpi',
      colSpan: 2,
    };
    updateDetailPageMetadata({ componentRenderers: [...componentRenderers, newRenderer] });
    toggleItem(`component-${newRenderer.id}`);
  };

  const updateComponentRenderer = (rendererId: string, updates: Partial<ComponentRendererConfig>) => {
    const updated = componentRenderers.map(r => r.id === rendererId ? { ...r, ...updates } : r);
    updateDetailPageMetadata({ componentRenderers: updated });
  };

  const deleteComponentRenderer = (rendererId: string) => {
    const updated = componentRenderers.filter(r => r.id !== rendererId);
    updateDetailPageMetadata({ componentRenderers: updated });
  };

  return (
    <div className="space-y-4">
      {/* Sections */}
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30 overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('sections')}
                className="h-8 w-8 p-0"
              >
                {expandedSections.sections ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <CardTitle>{titleDetailSections}</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {sections.length} {sections.length === 1 ? labelSectionSingular : labelSectionsPlural}
              </Badge>
            </div>
            <Button onClick={addSection} size="sm" variant="outline" className="text-xs">
              <Plus className="h-4 w-4 me-2" />
              {buttonAddSection}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {expandedSections.sections && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <CardContent className="space-y-4">
                {sections.length === 0 ? (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-gray-500"
                  >
                    {msgNoSections}
                  </motion.p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {sections.map((section, index) => (
                      <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index * 0.05,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                        layout
                      >
                        <Card className="border-gray-200">
                          <CardHeader className="6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItem(`section-${section.id}`)}
                                  className="h-8 w-8 p-0"
                                >
                                  <motion.div
                                    animate={{ rotate: expandedItems[`section-${section.id}`] ? 180 : 0 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </motion.div>
                                </Button>
                                <CardTitle 
                                  className="text-base cursor-pointer hover:text-violet-600 transition-colors flex-1"
                                  onClick={() => toggleItem(`section-${section.id}`)}
                                >
                                  {resolveDisplayLabel(section.title, language, defaultLang) || labelUntitledSection}
                                </CardTitle>
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.1 }}
                                >
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {section.fieldIds?.length || 0} {section.fieldIds?.length === 1 ? labelFieldSingular : labelFieldsPlural}
                                  </Badge>
                                </motion.div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteSection(section.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <AnimatePresence>
                            {expandedItems[`section-${section.id}`] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ 
                                  duration: 0.3, 
                                  ease: [0.4, 0, 0.2, 1],
                                  opacity: { duration: 0.2 }
                                }}
                                style={{ overflow: 'hidden' }}
                              >
                                <CardContent className="space-y-4 pt-2">
                      <div>
                        <TextInput
                          config={{ name: 'section-id', label: labelSectionId }}
                          value={section.id}
                          onChange={() => {}}
                          disabled
                          className="[&_input]:bg-gray-50"
                        />
                      </div>
                      <div>
                        <TextInput
                          config={{ name: 'section-title', label: labelTitle }}
                          value={
                            isTranslationArray(section.title)
                              ? section.title
                              : recordToTranslationArray({ [defaultLang]: typeof section.title === 'string' ? (section.title || '') : '' })
                          }
                          onChange={(value) => updateSection(section.id, { title: value })}
                          allowTranslation
                        />
                      </div>
                      <div>
                        <Textarea
                          config={{ name: 'section-description', label: labelDescription }}
                          value={
                            isTranslationArray(section.description)
                              ? section.description
                              : recordToTranslationArray({ [defaultLang]: typeof section.description === 'string' ? (section.description || '') : '' })
                          }
                          onChange={(value) => updateSection(section.id, { description: value })}
                          rows={2}
                          allowTranslation
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Slider
                            config={{ name: 'col-span', label: labelColumnSpan }}
                            value={section.colSpan || 2}
                            onChange={(value: number) => updateSection(section.id, { colSpan: value })}
                            min={1}
                            max={2}
                            step={1}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelColumnArea}</Label>
                          <UiSelect
                            value={section.columnArea || 'main'}
                            onValueChange={(value: 'main' | 'sidebar') => updateSection(section.id, { columnArea: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main">{optionMain}</SelectItem>
                              <SelectItem value="sidebar">{optionSidebar}</SelectItem>
                            </SelectContent>
                          </UiSelect>
                        </div>
                      </div>
                      <div>
                        {availableFields.length === 0 ? (
                          <p className="text-sm text-gray-500">{msgNoFieldsAvailable}</p>
                        ) : (
                          <SortableSelector
                            availableItems={getAvailableFieldsForSection(section)}
                            selectedItems={getSelectedFieldsForSection(section)}
                            onChange={(selectedItems) => handleSectionFieldSelectionChange(section.id, selectedItems)}
                            isSortable={true}
                            selectedLabel={labelSelectedFields}
                            availableLabel={labelAvailableFields}
                            maxHeight="max-h-60"
                            emptySelectedMessage={msgNoFieldsSelected}
                            emptyAvailableMessage={msgNoFieldsAvailable}
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelBadgeVariant}</Label>
                        <UiSelect
                          value={section.badgeVariant || 'default'}
                          onValueChange={(value: any) => updateSection(section.id, { badgeVariant: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="outline">Outline</SelectItem>
                            <SelectItem value="destructive">Destructive</SelectItem>
                            <SelectItem value="gradient">Gradient</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="muted">Muted</SelectItem>
                          </SelectContent>
                        </UiSelect>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`enforce-badge-${section.id}`}
                            checked={section.enforceBadgeVariant || false}
                            onCheckedChange={(checked) => updateSection(section.id, { enforceBadgeVariant: checked })}
                          />
                          <Label htmlFor={`enforce-badge-${section.id}`} className="cursor-pointer text-sm">
                            {labelEnforceBadgeVariant}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`badge-clickable-${section.id}`}
                            checked={section.badgeClickable || false}
                            onCheckedChange={(checked) => updateSection(section.id, { badgeClickable: checked })}
                          />
                          <Label htmlFor={`badge-clickable-${section.id}`} className="cursor-pointer text-sm">
                            {labelBadgeClickable}
                          </Label>
                        </div>
                      </div>
                      {section.layout && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <Slider
                              config={{ name: 'layout-columns', label: labelLayoutColumns }}
                              value={section.layout.columns || 2}
                              onChange={(value: number) => updateSection(section.id, {
                                layout: { ...section.layout, columns: value }
                              })}
                              min={1}
                              max={4}
                              step={1}
                            />
                          </div>
                          <div>
                            <NumberInput
                              config={{ name: 'layout-gap', label: labelLayoutGap }}
                              value={section.layout.gap || 0}
                              onChange={(value) => updateSection(section.id, {
                                layout: { ...section.layout, gap: Number(value) || 0 }
                              })}
                              min={0}
                            />
                          </div>
                        </div>
                      )}
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Quick Actions */}
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30 overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('quickActions')}
                className="h-8 w-8 p-0"
              >
                {expandedSections.quickActions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <CardTitle>{titleQuickActions}</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {quickActions.length} {quickActions.length === 1 ? labelActionSingular : labelActionsPlural}
              </Badge>
            </div>
            <Button onClick={addQuickAction} size="sm" variant="outline" className="text-xs">
              <Plus className="h-4 w-4 me-2" />
              {buttonAddAction}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {expandedSections.quickActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <CardContent className="space-y-4">
                {quickActions.length === 0 ? (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-gray-500"
                  >
                    {msgNoQuickActions}
                  </motion.p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {quickActions.map((action, index) => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index * 0.05,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                        layout
                      >
                        <Card className="border-gray-200">
                          <CardHeader className="pb-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItem(`action-${action.id}`)}
                                  className="h-8 w-8 p-0"
                                >
                                  <motion.div
                                    animate={{ rotate: expandedItems[`action-${action.id}`] ? 180 : 0 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </motion.div>
                                </Button>
                                <CardTitle 
                                  className="text-base cursor-pointer hover:text-violet-600 transition-colors flex-1"
                                  onClick={() => toggleItem(`action-${action.id}`)}
                                >
                                  {resolveDisplayLabel(action.label, language, defaultLang) || labelUntitledAction}
                                </CardTitle>
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.1 }}
                                >
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {action.action || 'action'}
                                  </Badge>
                                </motion.div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteQuickAction(action.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <AnimatePresence>
                            {expandedItems[`action-${action.id}`] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ 
                                  duration: 0.3, 
                                  ease: [0.4, 0, 0.2, 1],
                                  opacity: { duration: 0.2 }
                                }}
                                style={{ overflow: 'hidden' }}
                              >
                                <CardContent className="space-y-4 pt-2">
                      <div>
                        <TextInput
                          config={{ name: 'action-id', label: labelActionId }}
                          value={action.id}
                          onChange={() => {}}
                          disabled
                          className="[&_input]:bg-gray-50"
                        />
                      </div>
                      <div>
                        <TextInput
                          config={{ name: 'action-label', label: labelFieldLabel }}
                          value={
                            isTranslationArray(action.label)
                              ? action.label
                              : recordToTranslationArray({ [defaultLang]: typeof action.label === 'string' ? (action.label || '') : '' })
                          }
                          onChange={(value) => updateQuickAction(action.id, { label: value })}
                          allowTranslation
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelActionType}</Label>
                          <UiSelect
                            value={action.action}
                            onValueChange={(value: any) =>
                              updateQuickAction(action.id, { action: value as any })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="goToUrl">Go to URL</SelectItem>
                              <SelectItem value="openUrl">Open URL</SelectItem>
                              <SelectItem value="openFormDialog">Open Form Dialog</SelectItem>
                              <SelectItem value="openActionForm">Open Action Form</SelectItem>
                              <SelectItem value="callApi">Call API</SelectItem>
                              <SelectItem value="runAiAgent">Run AI Agent</SelectItem>
                            </SelectContent>
                          </UiSelect>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelVariant}</Label>
                          <UiSelect
                            value={action.variant || 'default'}
                            onValueChange={(value: any) => updateQuickAction(action.id, { variant: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="destructive">Destructive</SelectItem>
                              <SelectItem value="outline">Outline</SelectItem>
                              <SelectItem value="secondary">Secondary</SelectItem>
                              <SelectItem value="ghost">Ghost</SelectItem>
                              <SelectItem value="link">Link</SelectItem>
                              <SelectItem value="gradient">Gradient</SelectItem>
                            </SelectContent>
                          </UiSelect>
                        </div>
                      </div>
                      <div>
                        <IconInput
                          config={{ name: 'action-icon', label: 'Icon', placeholder: 'Enter Lucide Icon name (e.g., FilePlus, Download)' }}
                          value={action.icon || ''}
                          onChange={(value) => updateQuickAction(action.id, { icon: value })}
                        />
                      </div>
                      {(action.action === 'openFormDialog' || action.action === 'openActionForm') && (
                        <div>
                          <TextInput
                            config={{ name: 'target-schema', label: labelTargetSchema }}
                            value={action.targetSchema || ''}
                            onChange={(value) => updateQuickAction(action.id, { targetSchema: value })}
                            placeholder={placeholderSchemaId}
                          />
                          {action.action === 'openFormDialog' && (
                            <>
                              <TextInput
                                config={{
                                  name: 'submit-route',
                                  label: 'Custom Submit Route (optional)',
                                  placeholder: 'e.g., /api/auth/password/reset or /api/data/users/{{formData.id}}',
                                  description: 'Supports template variables like {{formData.id}}',
                                }}
                                value={action.submitRoute || ''}
                                onChange={(value) => updateQuickAction(action.id, { submitRoute: value })}
                              />
                          <FormSelect
                            config={{ name: 'submit-method', label: 'Submit Method' }}
                            value={action.submitMethod || 'POST'}
                            onValueChange={(value) =>
                              updateQuickAction(action.id, { submitMethod: (value as 'POST' | 'PUT' | 'PATCH') || 'POST' })
                            }
                            options={[
                              { id: 'POST', label: 'POST' },
                              { id: 'PUT', label: 'PUT' },
                              { id: 'PATCH', label: 'PATCH' },
                            ]}
                          />
                            </>
                          )}
                          <TextInput
                            config={{
                              name: 'pass-parent-data-as',
                              label: 'Pass Parent Entity As (optional)',
                              placeholder: 'e.g., userId',
                              description: 'Include parent entity data under this key in the submit payload',
                            }}
                            value={action.passParentDataAs || ''}
                            onChange={(value) => updateQuickAction(action.id, { passParentDataAs: value })}
                          />
                        </div>
                      )}
                      {(action.action === 'goToUrl' || action.action === 'openUrl') && (
                        <>
                          <div>
                            <TextInput
                              config={{ name: 'target-url', label: labelTargetUrl }}
                              value={action.targetUrl || ''}
                              onChange={(value) => updateQuickAction(action.id, { targetUrl: value })}
                              placeholder="/page/vendors or /api/export/inquiries"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`pass-item-${action.id}`}
                              checked={action.passItemAsReference || false}
                              onCheckedChange={(checked) => updateQuickAction(action.id, { passItemAsReference: checked })}
                            />
                            <Label htmlFor={`pass-item-${action.id}`} className="cursor-pointer text-sm">
                              Pass Item as Reference
                            </Label>
                          </div>
                        </>
                      )}
                      {action.action === 'callApi' && (
                        <>
                          <TextInput
                            config={{ name: 'submit-route', label: 'API Route' }}
                            value={action.submitRoute || ''}
                            onChange={(value) => updateQuickAction(action.id, { submitRoute: value })}
                            placeholder="/api/auth/password/reset"
                          />
                          <FormSelect
                            config={{ name: 'submit-method', label: 'Method' }}
                            value={action.submitMethod || 'POST'}
                            onValueChange={(value: string) =>
                              updateQuickAction(action.id, { submitMethod: (value as 'POST' | 'PUT' | 'PATCH') || 'POST' })
                            }
                            options={[
                              { id: 'POST', label: 'POST' },
                              { id: 'PUT', label: 'PUT' },
                              { id: 'PATCH', label: 'PATCH' },
                            ]}
                          />
                          <Textarea
                            config={{
                              name: 'submit-body',
                              label: 'Custom Body (optional)',
                              placeholder: '{ "username": "{{formData.username}}", "password": "{{formData.password}}", "confirmPassword": "{{formData.confirmPassword}}" }',
                              description: 'Supports {{formData.*}} and {{formSchema.*}}',
                            }}
                            value={action.body ? JSON.stringify(action.body, null, 2) : ''}
                            onChange={(value) => {
                              try {
                                const parsed = value ? JSON.parse(value) : undefined;
                                updateQuickAction(action.id, { body: parsed });
                              } catch {
                                // Ignore parse errors silently; user will fix JSON
                                updateQuickAction(action.id, { body: value as any });
                              }
                            }}
                          />
                        </>
                      )}
                      {action.action === 'runAiAgent' && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelAiAgent}</Label>
                            <UiSelect
                              value={action.agentId || ''}
                              onValueChange={(value) => updateQuickAction(action.id, { agentId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={placeholderSelectAiAgent} />
                              </SelectTrigger>
                              <SelectContent>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </UiSelect>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelComponentType}</Label>
                            <UiSelect
                              value={action.componentType || 'button'}
                              onValueChange={(value: 'button' | 'ai-agent-response') => updateQuickAction(action.id, { componentType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="button">Button</SelectItem>
                                <SelectItem value="ai-agent-response">AI Agent Response Container</SelectItem>
                              </SelectContent>
                            </UiSelect>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelSelectedFields}</Label>
                            <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                              {availableFields.length === 0 ? (
                                <p className="text-sm text-gray-500">{msgNoFieldsAvailable}</p>
                              ) : (
                                availableFields.map((field) => (
                                  <div key={field.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`field-${action.id}-${field.id}`}
                                      checked={action.selectedFields?.includes(field.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentFields = action.selectedFields || [];
                                        const newFields = checked
                                          ? [...currentFields, field.id]
                                          : currentFields.filter(f => f !== field.id);
                                        updateQuickAction(action.id, { selectedFields: newFields });
                                      }}
                                    />
                                    <Label
                                      htmlFor={`field-${action.id}-${field.id}`}
                                      className="text-sm font-normal cursor-pointer flex-1"
                                    >
                                      {field.label || field.name}
                                    </Label>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelSelectedSections}</Label>
                            <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                              {allSections.length === 0 ? (
                                <p className="text-sm text-gray-500">{msgNoSectionsAvailable}</p>
                              ) : (
                                allSections.map((section) => (
                                  <div key={section.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`section-${action.id}-${section.id}`}
                                      checked={action.selectedSections?.includes(section.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentSections = action.selectedSections || [];
                                        const newSections = checked
                                          ? [...currentSections, section.id]
                                          : currentSections.filter(s => s !== section.id);
                                        updateQuickAction(action.id, { selectedSections: newSections });
                                      }}
                                    />
                                    <Label
                                      htmlFor={`section-${action.id}-${section.id}`}
                                      className="text-sm font-normal cursor-pointer flex-1"
                                    >
                                      {section.title || section.id}
                                    </Label>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                          <div>
                            <Textarea
                              config={{ 
                                name: 'additional-system-prompt', 
                                label: 'Additional System Prompt',
                                placeholder: 'Optional: Add extra context to the system prompt...'
                              }}
                              value={action.additionalSystemPrompt || ''}
                              onChange={(value) => updateQuickAction(action.id, { additionalSystemPrompt: value })}
                            />
                          </div>
                          <div>
                            <Textarea
                              config={{
                                name: 'preset-body',
                                label: 'Preset Body Parameters (optional)',
                                placeholder: '{ "imageType": "comic-book" } or { "imageType": "{{formData.imageType}}" }',
                                description: 'Preset parameters to pass to AI agent API. Supports {{formData.*}} and {{formSchema.*}} dynamic context replacement.',
                              }}
                              value={action.body ? JSON.stringify(action.body, null, 2) : ''}
                              onChange={(value) => {
                                try {
                                  const parsed = value.trim() ? JSON.parse(value) : undefined;
                                  updateQuickAction(action.id, { body: parsed });
                                } catch {
                                  // Ignore parse errors silently; user will fix JSON
                                  updateQuickAction(action.id, { body: value as any });
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Textarea
                              config={{
                                name: 'preset-extra-body',
                                label: 'Preset Extra Body Parameters (optional)',
                                placeholder: '{ "output_format": "png" }',
                                description: 'Preset extra_body parameters to pass to AI agent API. Supports {{formData.*}} and {{formSchema.*}} dynamic context replacement.',
                              }}
                              value={action.extra_body ? JSON.stringify(action.extra_body, null, 2) : ''}
                              onChange={(value) => {
                                try {
                                  const parsed = value.trim() ? JSON.parse(value) : undefined;
                                  updateQuickAction(action.id, { extra_body: parsed });
                                } catch {
                                  // Ignore parse errors silently; user will fix JSON
                                  updateQuickAction(action.id, { extra_body: value as any });
                                }
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelRunType}</Label>
                              <UiSelect
                                value={action.runType || 'manual'}
                                onValueChange={(value: any) => updateQuickAction(action.id, { runType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manual">{optionManual}</SelectItem>
                                  <SelectItem value="automatic">{optionAutomatic}</SelectItem>
                                </SelectContent>
                              </UiSelect>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelDisplayType}</Label>
                              <UiSelect
                                value={action.displayType || 'showForm'}
                                onValueChange={(value: any) => updateQuickAction(action.id, { displayType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="showForm">{optionShowForm}</SelectItem>
                                  <SelectItem value="hideForm">{optionHideForm}</SelectItem>
                                </SelectContent>
                              </UiSelect>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelDefaultLanguage}</Label>
                            <LanguageSelector
                              config={{
                                name: 'language',
                                label: '',
                                placeholder: 'Select default language...',
                              }}
                              value={action.language || ''}
                              onChange={(value) => updateQuickAction(action.id, { language: value || undefined })}
                              defaultLanguage="fa"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {msgDefaultLanguageDescription}
                            </p>
                          </div>
                        </>
                      )}
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Table Renderers */}
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30 overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('tableRenderers')}
                className="h-8 w-8 p-0"
              >
                {expandedSections.tableRenderers ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <CardTitle>{titleTableRenderers}</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {tableRenderers.length} {tableRenderers.length === 1 ? labelTableSingular : labelTablesPlural}
              </Badge>
            </div>
            <Button onClick={addTableRenderer} size="sm" variant="outline" className="text-xs">
              <Plus className="h-4 w-4 me-2" />
              {buttonAddTable}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {expandedSections.tableRenderers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <CardContent className="space-y-4">
                {tableRenderers.length === 0 ? (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-gray-500"
                  >
                    {msgNoTableRenderers}
                  </motion.p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {tableRenderers.map((renderer, index) => (
                      <motion.div
                        key={renderer.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index * 0.05,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                        layout
                      >
                        <Card className="border-gray-200">
                          <CardHeader className="pb-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItem(`table-${renderer.id}`)}
                                  className="h-8 w-8 p-0"
                                >
                                  <motion.div
                                    animate={{ rotate: expandedItems[`table-${renderer.id}`] ? 180 : 0 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </motion.div>
                                </Button>
                                <CardTitle 
                                  className="text-base cursor-pointer hover:text-violet-600 transition-colors flex-1"
                                  onClick={() => toggleItem(`table-${renderer.id}`)}
                                >
                                  {renderer.title || labelUntitledTable}
                                </CardTitle>
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.1 }}
                                >
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {renderer.columns?.length || 0} {renderer.columns?.length === 1 ? 'column' : 'columns'}
                                  </Badge>
                                </motion.div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTableRenderer(renderer.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <AnimatePresence>
                            {expandedItems[`table-${renderer.id}`] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ 
                                  duration: 0.3, 
                                  ease: [0.4, 0, 0.2, 1],
                                  opacity: { duration: 0.2 }
                                }}
                                style={{ overflow: 'hidden' }}
                              >
                                <CardContent className="space-y-4 pt-2">
                      <div>
                        <TextInput
                          config={{ name: 'renderer-id', label: labelRendererId }}
                          value={renderer.id}
                          onChange={() => {}}
                          disabled
                          className="[&_input]:bg-gray-50"
                        />
                      </div>
                      <div>
                        <TextInput
                          config={{ name: 'table-title', label: 'Title' }}
                          value={renderer.title || ''}
                          onChange={(value) => updateTableRenderer(renderer.id, { title: value })}
                        />
                      </div>
                      <div>
                        <Textarea
                          config={{ name: 'table-description', label: 'Description' }}
                          value={renderer.description || ''}
                          onChange={(value) => updateTableRenderer(renderer.id, { description: value })}
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <TextInput
                            config={{ name: 'target-schema', label: labelTargetSchema }}
                            value={renderer.targetSchema || ''}
                            onChange={(value) => updateTableRenderer(renderer.id, { targetSchema: value })}
                            placeholder={placeholderSchemaId}
                          />
                        </div>
                        <div>
                          <TextInput
                            config={{ name: 'relation-type-id', label: labelRelationTypeId }}
                            value={renderer.relationTypeId || ''}
                            onChange={(value) => updateTableRenderer(renderer.id, { relationTypeId: value })}
                            placeholder="e.g., HAS_INQUIRY_ITEM"
                          />
                        </div>
                      </div>
                      <div>
                        <TextInput
                          config={{ name: 'section-id', label: labelSectionId }}
                          value={renderer.sectionId || ''}
                          onChange={(value) => updateTableRenderer(renderer.id, { sectionId: value })}
                          placeholder={placeholderSectionIdFromTarget}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Slider
                            config={{ name: 'col-span', label: labelColumnSpan }}
                            value={renderer.colSpan || 2}
                            onChange={(value: number) => updateTableRenderer(renderer.id, { colSpan: value })}
                            min={1}
                            max={2}
                            step={1}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelColumnArea}</Label>
                          <UiSelect
                            value={renderer.columnArea || 'main'}
                            onValueChange={(value: 'main' | 'sidebar') => updateTableRenderer(renderer.id, { columnArea: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main">{optionMain}</SelectItem>
                              <SelectItem value="sidebar">{optionSidebar}</SelectItem>
                            </SelectContent>
                          </UiSelect>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Leave empty to show all fields from section</p>
                        {availableFields.length === 0 ? (
                          <p className="text-sm text-gray-500">{msgNoFieldsAvailable}</p>
                        ) : (
                          <SortableSelector
                            availableItems={getAvailableColumns(renderer)}
                            selectedItems={getSelectedColumns(renderer)}
                            onChange={(selectedItems) => handleTableColumnSelectionChange(renderer.id, selectedItems)}
                            isSortable={true}
                            selectedLabel={labelSelectedColumns}
                            availableLabel={labelAvailableFields}
                            maxHeight="max-h-60"
                            emptySelectedMessage={msgNoColumnsSelected}
                            emptyAvailableMessage={msgNoFieldsAvailable}
                          />
                        )}
                      </div>
                      {renderer.tableProperties && (
                        <div className="pt-2 border-t space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`sorting-${renderer.id}`}
                                checked={renderer.tableProperties.sortingEnabled || false}
                                onCheckedChange={(checked) => updateTableRenderer(renderer.id, {
                                  tableProperties: { ...renderer.tableProperties, sortingEnabled: checked }
                                })}
                              />
                              <Label htmlFor={`sorting-${renderer.id}`} className="cursor-pointer text-sm">
                                {labelSortingEnabled}
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`pagination-${renderer.id}`}
                                checked={renderer.tableProperties.paginationEnabled || false}
                                onCheckedChange={(checked) => updateTableRenderer(renderer.id, {
                                  tableProperties: { ...renderer.tableProperties, paginationEnabled: checked }
                                })}
                              />
                              <Label htmlFor={`pagination-${renderer.id}`} className="cursor-pointer text-sm">
                                {labelPaginationEnabled}
                              </Label>
                            </div>
                          </div>
                          {renderer.tableProperties.paginationEnabled && (
                            <div>
                              <NumberInput
                                config={{ name: 'page-size', label: labelPageSize }}
                                value={renderer.tableProperties.paginationPageSize || 20}
                                onChange={(value) => updateTableRenderer(renderer.id, {
                                  tableProperties: { ...renderer.tableProperties, paginationPageSize: Number(value) || 20 }
                                })}
                                min={1}
                              />
                            </div>
                          )}
                        </div>
                      )}
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Component Renderers */}
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30 overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('componentRenderers')}
                className="h-8 w-8 p-0"
              >
                {expandedSections.componentRenderers ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <CardTitle>{titleComponentRenderers}</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {componentRenderers.length} {componentRenderers.length === 1 ? labelComponentSingular : labelComponentsPlural}
              </Badge>
            </div>
            <Button onClick={addComponentRenderer} size="sm" variant="outline" className="text-xs">
              <Plus className="h-4 w-4 me-2" />
              {buttonAddComponent}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {expandedSections.componentRenderers && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <CardContent className="space-y-4">
                {componentRenderers.length === 0 ? (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-gray-500"
                  >
                    {msgNoComponentRenderers}
                  </motion.p>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {componentRenderers.map((renderer, index) => (
                      <motion.div
                        key={renderer.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index * 0.05,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                        layout
                      >
                        <Card className="border-gray-200">
                          <CardHeader className="pb-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItem(`component-${renderer.id}`)}
                                  className="h-8 w-8 p-0"
                                >
                                  <motion.div
                                    animate={{ rotate: expandedItems[`component-${renderer.id}`] ? 180 : 0 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </motion.div>
                                </Button>
                                <CardTitle 
                                  className="text-base cursor-pointer hover:text-violet-600 transition-colors flex-1"
                                  onClick={() => toggleItem(`component-${renderer.id}`)}
                                >
                                  {renderer.componentType || labelUntitledComponent}
                                </CardTitle>
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.1 }}
                                >
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {renderer.componentType || 'component'}
                                  </Badge>
                                </motion.div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteComponentRenderer(renderer.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <AnimatePresence>
                            {expandedItems[`component-${renderer.id}`] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ 
                                  duration: 0.3, 
                                  ease: [0.4, 0, 0.2, 1],
                                  opacity: { duration: 0.2 }
                                }}
                                style={{ overflow: 'hidden' }}
                              >
                                <CardContent className="space-y-4 pt-2">
                      <div>
                        <TextInput
                          config={{ name: 'renderer-id', label: labelRendererId }}
                          value={renderer.id}
                          onChange={() => {}}
                          disabled
                          className="[&_input]:bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelComponentType}</Label>
                        <UiSelect
                          value={renderer.componentType}
                          onValueChange={(value: 'kpi' | 'chart' | 'metric' | 'custom') =>
                            updateComponentRenderer(renderer.id, { componentType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kpi">KPI</SelectItem>
                            <SelectItem value="chart">Chart</SelectItem>
                            <SelectItem value="metric">Metric</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </UiSelect>
                      </div>
                      {renderer.componentType === 'custom' && (
                        <div>
                          <TextInput
                            config={{ name: 'component-name', label: labelComponentName }}
                            value={renderer.componentName || ''}
                            onChange={(value) => updateComponentRenderer(renderer.id, { componentName: value })}
                            placeholder={placeholderCustomComponentName}
                          />
                        </div>
                      )}
                      <div>
                        <TextInput
                          config={{ name: 'data-path', label: labelDataPath }}
                          value={renderer.dataPath || ''}
                          onChange={(value) => updateComponentRenderer(renderer.id, { dataPath: value })}
                          placeholder="e.g., performanceMetrics.onTimeDelivery"
                        />
                      </div>
                      <div>
                        <Slider
                          config={{ name: 'col-span', label: 'Column Span' }}
                          value={renderer.colSpan || 2}
                          onChange={(value: number) => updateComponentRenderer(renderer.id, { colSpan: value })}
                          min={1}
                          max={2}
                          step={1}
                        />
                      </div>
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Layout */}
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30 overflow-visible">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('layout')}
              className="h-8 w-8 p-0"
            >
              {expandedSections.layout ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <CardTitle>{titleLayout}</CardTitle>
          </div>
        </CardHeader>
        {expandedSections.layout && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Slider
                  config={{ name: 'main-columns', label: labelMainColumns }}
                  value={detailPageMetadata.layout?.mainColumns || 2}
                  onChange={(value: number) => updateDetailPageMetadata({
                    layout: { ...detailPageMetadata.layout, mainColumns: value }
                  })}
                  min={1}
                  max={4}
                  step={1}
                />
              </div>
              <div>
                <Slider
                  config={{ name: 'sidebar-columns', label: labelSidebarColumns }}
                  value={detailPageMetadata.layout?.sidebarColumns || 1}
                  onChange={(value: number) => updateDetailPageMetadata({
                    layout: { ...detailPageMetadata.layout, sidebarColumns: value }
                  })}
                  min={1}
                  max={2}
                  step={1}
                />
              </div>
            </div>
            <div>
              <NumberInput
                config={{ name: 'gap', label: labelGap }}
                value={detailPageMetadata.layout?.gap || 0}
                onChange={(value) => updateDetailPageMetadata({
                  layout: { ...detailPageMetadata.layout, gap: Number(value) || 0 }
                })}
                min={0}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Header */}
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30 overflow-visible">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('header')}
              className="h-8 w-8 p-0"
            >
              {expandedSections.header ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <CardTitle>{titleHeader}</CardTitle>
          </div>
        </CardHeader>
        {expandedSections.header && (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-back-button"
                  checked={detailPageMetadata.header?.showBackButton || false}
                  onCheckedChange={(checked) => updateDetailPageMetadata({
                    header: { ...detailPageMetadata.header, showBackButton: checked }
                  })}
                />
                <Label htmlFor="show-back-button" className="cursor-pointer text-sm">
                  {labelShowBackButton}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-actions"
                  checked={detailPageMetadata.header?.showActions || false}
                  onCheckedChange={(checked) => updateDetailPageMetadata({
                    header: { ...detailPageMetadata.header, showActions: checked }
                  })}
                />
                <Label htmlFor="show-actions" className="cursor-pointer text-sm">
                  {labelShowActions}
                </Label>
              </div>
            </div>
            {detailPageMetadata.header?.showActions && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">{labelActions}</Label>
                <div className="space-y-2">
                  {['edit', 'delete', 'export'].map((action) => {
                    const isSelected = detailPageMetadata.header?.actions?.includes(action as any) || false;
                    return (
                      <div key={action} className="flex items-center space-x-2">
                        <Checkbox
                          id={`header-action-${action}`}
                          checked={isSelected}
                          onCheckedChange={(checked: boolean) => {
                            const currentActions = detailPageMetadata.header?.actions || [];
                            const newActions = checked
                              ? [...currentActions, action as 'edit' | 'delete' | 'export']
                              : currentActions.filter(a => a !== action);
                            updateDetailPageMetadata({
                              header: { ...detailPageMetadata.header, actions: newActions }
                            });
                          }}
                        />
                        <Label htmlFor={`header-action-${action}`} className="text-sm font-normal cursor-pointer capitalize">
                          {action}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

