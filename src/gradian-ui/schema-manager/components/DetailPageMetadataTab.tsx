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

interface DetailPageMetadataTabProps {
  schema: FormSchema;
  onUpdate: (updates: Partial<FormSchema>) => void;
}

export function DetailPageMetadataTab({ schema, onUpdate }: DetailPageMetadataTabProps) {
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
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 overflow-visible">
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
              <CardTitle>Detail Page Sections</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {sections.length} {sections.length === 1 ? 'section' : 'sections'}
              </Badge>
            </div>
            <Button onClick={addSection} size="sm" variant="outline">
              <Plus className="h-4 w-4 me-2" />
              Add Section
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
                    No sections defined. Add sections to configure the detail page layout.
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
                                  {section.title || 'Untitled Section'}
                                </CardTitle>
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.1 }}
                                >
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {section.fieldIds?.length || 0} {section.fieldIds?.length === 1 ? 'field' : 'fields'}
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
                          config={{ name: 'section-id', label: 'Section ID' }}
                          value={section.id}
                          onChange={() => {}}
                          disabled
                          className="[&_input]:bg-gray-50"
                        />
                      </div>
                      <div>
                        <TextInput
                          config={{ name: 'section-title', label: 'Title' }}
                          value={section.title || ''}
                          onChange={(value) => updateSection(section.id, { title: value })}
                        />
                      </div>
                      <div>
                        <Textarea
                          config={{ name: 'section-description', label: 'Description' }}
                          value={section.description || ''}
                          onChange={(value) => updateSection(section.id, { description: value })}
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Slider
                            config={{ name: 'col-span', label: 'Column Span' }}
                            value={section.colSpan || 2}
                            onChange={(value: number) => updateSection(section.id, { colSpan: value })}
                            min={1}
                            max={2}
                            step={1}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Column Area</Label>
                          <UiSelect
                            value={section.columnArea || 'main'}
                            onValueChange={(value: 'main' | 'sidebar') => updateSection(section.id, { columnArea: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main">Main</SelectItem>
                              <SelectItem value="sidebar">Sidebar</SelectItem>
                            </SelectContent>
                          </UiSelect>
                        </div>
                      </div>
                      <div>
                        {availableFields.length === 0 ? (
                          <p className="text-sm text-gray-500">No fields available.</p>
                        ) : (
                          <SortableSelector
                            availableItems={getAvailableFieldsForSection(section)}
                            selectedItems={getSelectedFieldsForSection(section)}
                            onChange={(selectedItems) => handleSectionFieldSelectionChange(section.id, selectedItems)}
                            isSortable={true}
                            selectedLabel="Selected Fields"
                            availableLabel="Available Fields"
                            maxHeight="max-h-60"
                            emptySelectedMessage="No fields selected. Select fields below to add them."
                            emptyAvailableMessage="No fields available."
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Badge Variant</Label>
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
                            Enforce Badge Variant
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`badge-clickable-${section.id}`}
                            checked={section.badgeClickable || false}
                            onCheckedChange={(checked) => updateSection(section.id, { badgeClickable: checked })}
                          />
                          <Label htmlFor={`badge-clickable-${section.id}`} className="cursor-pointer text-sm">
                            Badge Clickable
                          </Label>
                        </div>
                      </div>
                      {section.layout && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <Slider
                              config={{ name: 'layout-columns', label: 'Layout Columns' }}
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
                              config={{ name: 'layout-gap', label: 'Layout Gap' }}
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
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 overflow-visible">
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
              <CardTitle>Quick Actions</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {quickActions.length} {quickActions.length === 1 ? 'action' : 'actions'}
              </Badge>
            </div>
            <Button onClick={addQuickAction} size="sm" variant="outline">
              <Plus className="h-4 w-4 me-2" />
              Add Action
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
                    No quick actions defined.
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
                                  {action.label || 'Untitled Action'}
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
                          config={{ name: 'action-id', label: 'Action ID' }}
                          value={action.id}
                          onChange={() => {}}
                          disabled
                          className="[&_input]:bg-gray-50"
                        />
                      </div>
                      <div>
                        <TextInput
                          config={{ name: 'action-label', label: 'Label' }}
                          value={action.label || ''}
                          onChange={(value) => updateQuickAction(action.id, { label: value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Action Type</Label>
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
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Variant</Label>
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
                            config={{ name: 'target-schema', label: 'Target Schema' }}
                            value={action.targetSchema || ''}
                            onChange={(value) => updateQuickAction(action.id, { targetSchema: value })}
                            placeholder="Schema ID"
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
                              config={{ name: 'target-url', label: 'Target URL' }}
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
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">AI Agent</Label>
                            <UiSelect
                              value={action.agentId || ''}
                              onValueChange={(value) => updateQuickAction(action.id, { agentId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select an AI agent" />
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
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Component Type</Label>
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
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Selected Fields</Label>
                            <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                              {availableFields.length === 0 ? (
                                <p className="text-sm text-gray-500">No fields available</p>
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
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Selected Sections</Label>
                            <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                              {allSections.length === 0 ? (
                                <p className="text-sm text-gray-500">No sections available</p>
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
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">Run Type</Label>
                              <UiSelect
                                value={action.runType || 'manual'}
                                onValueChange={(value: any) => updateQuickAction(action.id, { runType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manual">Manual</SelectItem>
                                  <SelectItem value="automatic">Automatic</SelectItem>
                                </SelectContent>
                              </UiSelect>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-2 block">Display Type</Label>
                              <UiSelect
                                value={action.displayType || 'showForm'}
                                onValueChange={(value: any) => updateQuickAction(action.id, { displayType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="showForm">Show Form</SelectItem>
                                  <SelectItem value="hideForm">Hide Form</SelectItem>
                                </SelectContent>
                              </UiSelect>
                            </div>
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
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 overflow-visible">
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
              <CardTitle>Table Renderers</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {tableRenderers.length} {tableRenderers.length === 1 ? 'table' : 'tables'}
              </Badge>
            </div>
            <Button onClick={addTableRenderer} size="sm" variant="outline">
              <Plus className="h-4 w-4 me-2" />
              Add Table
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
                    No table renderers defined.
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
                                  {renderer.title || 'Untitled Table'}
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
                          config={{ name: 'renderer-id', label: 'Renderer ID' }}
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
                            config={{ name: 'target-schema', label: 'Target Schema' }}
                            value={renderer.targetSchema || ''}
                            onChange={(value) => updateTableRenderer(renderer.id, { targetSchema: value })}
                            placeholder="Schema ID"
                          />
                        </div>
                        <div>
                          <TextInput
                            config={{ name: 'relation-type-id', label: 'Relation Type ID' }}
                            value={renderer.relationTypeId || ''}
                            onChange={(value) => updateTableRenderer(renderer.id, { relationTypeId: value })}
                            placeholder="e.g., HAS_INQUIRY_ITEM"
                          />
                        </div>
                      </div>
                      <div>
                        <TextInput
                          config={{ name: 'section-id', label: 'Section ID' }}
                          value={renderer.sectionId || ''}
                          onChange={(value) => updateTableRenderer(renderer.id, { sectionId: value })}
                          placeholder="Section ID from target schema"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Slider
                            config={{ name: 'col-span', label: 'Column Span' }}
                            value={renderer.colSpan || 2}
                            onChange={(value: number) => updateTableRenderer(renderer.id, { colSpan: value })}
                            min={1}
                            max={2}
                            step={1}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Column Area</Label>
                          <UiSelect
                            value={renderer.columnArea || 'main'}
                            onValueChange={(value: 'main' | 'sidebar') => updateTableRenderer(renderer.id, { columnArea: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main">Main</SelectItem>
                              <SelectItem value="sidebar">Sidebar</SelectItem>
                            </SelectContent>
                          </UiSelect>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Leave empty to show all fields from section</p>
                        {availableFields.length === 0 ? (
                          <p className="text-sm text-gray-500">No fields available.</p>
                        ) : (
                          <SortableSelector
                            availableItems={getAvailableColumns(renderer)}
                            selectedItems={getSelectedColumns(renderer)}
                            onChange={(selectedItems) => handleTableColumnSelectionChange(renderer.id, selectedItems)}
                            isSortable={true}
                            selectedLabel="Selected Columns"
                            availableLabel="Available Fields"
                            maxHeight="max-h-60"
                            emptySelectedMessage="No columns selected. Select columns below to add them. Leave empty to show all fields."
                            emptyAvailableMessage="No fields available."
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
                                Sorting Enabled
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
                                Pagination Enabled
                              </Label>
                            </div>
                          </div>
                          {renderer.tableProperties.paginationEnabled && (
                            <div>
                              <NumberInput
                                config={{ name: 'page-size', label: 'Page Size' }}
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
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 overflow-visible">
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
              <CardTitle>Component Renderers</CardTitle>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {componentRenderers.length} {componentRenderers.length === 1 ? 'component' : 'components'}
              </Badge>
            </div>
            <Button onClick={addComponentRenderer} size="sm" variant="outline">
              <Plus className="h-4 w-4 me-2" />
              Add Component
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
                    No component renderers defined.
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
                                  {renderer.componentType || 'Untitled Component'}
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
                          config={{ name: 'renderer-id', label: 'Renderer ID' }}
                          value={renderer.id}
                          onChange={() => {}}
                          disabled
                          className="[&_input]:bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Component Type</Label>
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
                            config={{ name: 'component-name', label: 'Component Name' }}
                            value={renderer.componentName || ''}
                            onChange={(value) => updateComponentRenderer(renderer.id, { componentName: value })}
                            placeholder="Custom component name"
                          />
                        </div>
                      )}
                      <div>
                        <TextInput
                          config={{ name: 'data-path', label: 'Data Path' }}
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
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 overflow-visible">
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
            <CardTitle>Layout</CardTitle>
          </div>
        </CardHeader>
        {expandedSections.layout && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Slider
                  config={{ name: 'main-columns', label: 'Main Columns' }}
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
                  config={{ name: 'sidebar-columns', label: 'Sidebar Columns' }}
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
                config={{ name: 'gap', label: 'Gap' }}
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
      <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 overflow-visible">
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
            <CardTitle>Header</CardTitle>
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
                  Show Back Button
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
                  Show Actions
                </Label>
              </div>
            </div>
            {detailPageMetadata.header?.showActions && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Actions</Label>
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

