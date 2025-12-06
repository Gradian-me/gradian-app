'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Layers, Loader2 } from 'lucide-react';
import { FormSchema, FormField, FormSection } from '../types/form-schema';
import { GeneralInfoTab } from './GeneralInfoTab';
import { SectionsTab } from './SectionsTab';
import { ResetDialog } from './ResetDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { SchemaNotFound } from './SchemaNotFound';

interface SchemaBuilderDialogProps {
  schemaId: string;
  fetchSchema: (id: string) => Promise<FormSchema>;
  saveSchema: (id: string, schema: FormSchema) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchemaBuilderDialog({
  schemaId,
  fetchSchema,
  saveSchema,
  open,
  onOpenChange
}: SchemaBuilderDialogProps) {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [originalSchema, setOriginalSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'field' | 'section'; id: string; onConfirm: () => void } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (open && schemaId) {
      loadSchema(schemaId);
    }
  }, [open, schemaId]);

  const loadSchema = async (id: string) => {
    try {
      setLoading(true);
      setLoadError(false);
      const data = await fetchSchema(id);
      setSchema(data);
      setOriginalSchema(JSON.parse(JSON.stringify(data))); // Deep clone
      setExpandedSection(null);
    } catch (error) {
      console.error('Error loading schema:', error);
      setSchema(null);
      setOriginalSchema(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!schema || !schemaId) return;

    try {
      setSaving(true);
      await saveSchema(schemaId, schema);
      setOriginalSchema(JSON.parse(JSON.stringify(schema))); // Update original schema
      alert('Schema saved successfully!');
    } catch (error) {
      console.error('Error saving schema:', error);
      alert('Error saving schema');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!originalSchema) return;
    setSchema(JSON.parse(JSON.stringify(originalSchema)));
    setExpandedSection(null);
    setShowResetDialog(false);
  };

  const updateSchema = (updates: Partial<FormSchema>) => {
    if (!schema) return;
    setSchema({ ...schema, ...updates });
  };

  const addSection = () => {
    if (!schema) return;
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      columns: 2,
    };
    setSchema({ ...schema, sections: [...schema.sections, newSection] });
  };

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    if (!schema) return;
    setSchema({
      ...schema,
      sections: schema.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
    });
  };

  const deleteSection = (sectionId: string) => {
    if (!schema) return;
    setSchema({
      ...schema,
      sections: schema.sections.map(s => 
        s.id === sectionId ? { ...s, inactive: true } : s
      ),
      fields: schema.fields.map(f => 
        f.sectionId === sectionId ? { ...f, inactive: true } : f
      )
    });
  };

  // Convert label to camelCase field name
  const labelToCamelCase = (label: string): string => {
    if (!label) return '';
    
    return label
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .split(/[\s_-]+/) // Split on spaces, underscores, or hyphens
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  };

  const addField = (sectionId: string) => {
    if (!schema) return;
    const sectionFields = schema.fields.filter(f => f.sectionId === sectionId);
    const maxOrder = sectionFields.length > 0 
      ? Math.max(...sectionFields.map(f => f.order || 1))
      : 0;
    
    const defaultLabel = 'New Field';
    const defaultName = labelToCamelCase(defaultLabel);
    
    const newField: FormField = {
      id: `field-${Date.now()}`,
      name: defaultName,
      label: defaultLabel,
      sectionId,
      component: 'text',
      order: maxOrder + 1,
    };
    setSchema({ ...schema, fields: [...schema.fields, newField] });
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!schema) return;
    setSchema(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
      };
    });
  };

  const deleteField = (fieldId: string) => {
    if (!schema) return;
    setSchema({
      ...schema,
      fields: schema.fields.map(f => 
        f.id === fieldId ? { ...f, inactive: true } : f
      )
    });
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    if (!schema) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = schema.sections.findIndex(s => s.id === active.id);
    const newIndex = schema.sections.findIndex(s => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedSections = arrayMove(schema.sections, oldIndex, newIndex);
      setSchema({ ...schema, sections: reorderedSections });
    }
  };

  const handleFieldDragEnd = (event: DragEndEvent, sectionId: string) => {
    if (!schema) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionFields = schema.fields
      .filter(f => f.sectionId === sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const oldIndex = sectionFields.findIndex(f => f.id === active.id);
    const newIndex = sectionFields.findIndex(f => f.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(sectionFields, oldIndex, newIndex);
      reordered.forEach((field, idx) => {
        updateField(field.id, { order: idx + 1 });
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const collapseAllSections = () => {
    setExpandedSection(null);
  };

  const getFieldsForSection = (sectionId: string): FormField[] => {
    if (!schema) return [];
    return schema.fields
      .filter(f => f.sectionId === sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-full max-w-7xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Loading Schema</DialogTitle>
            <DialogDescription>Please wait while we load the schema...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-20 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (loadError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-full max-w-7xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Schema Not Found</DialogTitle>
            <DialogDescription>The requested schema could not be loaded.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <SchemaNotFound showHomeButton={false} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!schema) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-full max-w-7xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>{schema.plural_name || 'Schema Builder'}</DialogTitle>
            <DialogDescription>
              Edit and configure the schema structure, fields, and sections
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResetDialog(true)}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-auto gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/40 select-none">
              <TabsTrigger
                value="general"
                className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                  <Settings className="h-4 w-4 me-1 sm:me-2" />
                  <span className="truncate">General</span>
                </TabsTrigger>
              <TabsTrigger
                value="sections"
                className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
              >
                  <Layers className="h-4 w-4 me-1 sm:me-2" />
                  <span className="truncate hidden sm:inline">Sections & Fields</span>
                  <span className="truncate sm:hidden">Fields</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <GeneralInfoTab
                  schema={schema}
                  onUpdate={updateSchema}
                />
              </TabsContent>

              <TabsContent value="sections" className="space-y-4 mt-4">
                <SectionsTab
                  sections={schema.sections}
                  getFieldsForSection={getFieldsForSection}
                  expandedSection={expandedSection}
                  onToggleSection={toggleSection}
                  onAddSection={addSection}
                  onUpdateSection={updateSection}
                  onDeleteSection={deleteSection}
                  onAddField={addField}
                  onFieldUpdate={updateField}
                  onFieldDelete={deleteField}
                  onSectionDragEnd={handleSectionDragEnd}
                  onFieldDragEnd={handleFieldDragEnd}
                  onCollapseAll={collapseAllSections}
                  currentSchemaId={schema.id}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <ResetDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleReset}
      />

      {deleteConfirm && (
        <DeleteConfirmDialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          type={deleteConfirm.type}
          onConfirm={deleteConfirm.onConfirm}
        />
      )}
    </>
  );
}

