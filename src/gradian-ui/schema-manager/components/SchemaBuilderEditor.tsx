'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Layers, ArrowLeft, Layout, FileText } from 'lucide-react';
import { FormSchema, FormField, FormSection } from '../types/form-schema';
import { GeneralInfoTab } from './GeneralInfoTab';
import { SectionsTab } from './SectionsTab';
import { CardMetadataTab } from './CardMetadataTab';
import { DetailPageMetadataTab } from './DetailPageMetadataTab';
import { SchemaActions } from './SchemaActions';
import { ResetDialog } from './ResetDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { SchemaNotFound } from './SchemaNotFound';
import { FormAlert } from '@/components/ui/form-alert';
import { MessageBoxContainer } from '@/gradian-ui/layout/message-box';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';

interface SchemaBuilderEditorProps {
  schemaId?: string;
  fetchSchema: (id: string) => Promise<FormSchema>;
  saveSchema: (id: string, schema: FormSchema) => Promise<void>;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  apiResponse?: any;
  onClearResponse?: () => void;
  onRefreshSchema?: () => void | Promise<void>;
  refreshing?: boolean;
}

export function SchemaBuilderEditor({
  schemaId,
  fetchSchema,
  saveSchema,
  onBack,
  title,
  subtitle = 'Schema Builder',
  apiResponse,
  onClearResponse,
  onRefreshSchema,
  refreshing,
}: SchemaBuilderEditorProps) {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [originalSchema, setOriginalSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'field' | 'section'; id: string; onConfirm: () => void } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (schemaId) {
      loadSchema(schemaId);
    }
  }, [schemaId]);

  const loadSchema = async (id: string) => {
    try {
      setLoading(true);
      setLoadError(false);
      // Clear previous API response when starting a new load
      onClearResponse?.();
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
      setSaveFeedback(null);
      // Clear previous API response when starting a new save
      onClearResponse?.();
      await saveSchema(schemaId, schema);
      setOriginalSchema(JSON.parse(JSON.stringify(schema))); // Update original schema
      toast.success('Schema saved successfully');
      // FormAlert will only show if MessageBoxContainer doesn't have messages
      // The MessageBoxContainer will handle API response messages if they exist
    } catch (error) {
      console.error('Error saving schema:', error);
      toast.error('Error saving schema');
      // Show error feedback if no API response messages are available
      if (!apiResponse?.messages && !apiResponse?.message) {
        setSaveFeedback({ type: 'error', message: 'Error saving schema' });
      }
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
    setSchema(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setSchema(prev => {
      if (!prev) return prev;
      
      const currentField = prev.fields.find(f => f.id === fieldId);
      if (!currentField) return prev;

      let updatedFields: FormField[];
      
      // If sectionId is being changed, move to the end of the new section
      if (updates.sectionId && updates.sectionId !== currentField.sectionId) {
        const newSectionFields = prev.fields.filter(f => f.sectionId === updates.sectionId);
        const maxOrder = newSectionFields.length > 0 
          ? Math.max(...newSectionFields.map(f => f.order || 1))
          : 0;
        
        updatedFields = prev.fields.map(f => {
          if (f.id === fieldId) {
            return { ...f, ...updates, order: maxOrder + 1 };
          }
          return f;
        });
      } else {
        updatedFields = prev.fields.map(f =>
          f.id === fieldId ? { ...f, ...updates } : f
        );
      }
      
      return { ...prev, fields: updatedFields };
    });
  };

  const deleteField = (fieldId: string) => {
    if (!schema) return;
    const field = schema.fields.find(f => f.id === fieldId);
    setDeleteConfirm({
      type: 'field',
      id: fieldId,
      onConfirm: () => {
        const updatedFields = schema.fields.map(f => 
          f.id === fieldId ? { ...f, inactive: true } : f
        );
        setSchema({ ...schema, fields: updatedFields });
        setDeleteConfirm(null);
      }
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

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    if (!schema) return;
    const updatedSections = schema.sections.map(s =>
      s.id === sectionId ? { ...s, ...updates } : s
    );
    setSchema({ ...schema, sections: updatedSections });
  };

  const deleteSection = (sectionId: string) => {
    if (!schema) return;
    const section = schema.sections.find(s => s.id === sectionId);
    setDeleteConfirm({
      type: 'section',
      id: sectionId,
      onConfirm: () => {
        const updatedSections = schema.sections.map(s => 
          s.id === sectionId ? { ...s, inactive: true } : s
        );
        const updatedFields = schema.fields.map(f => 
          f.sectionId === sectionId ? { ...f, inactive: true } : f
        );
        setSchema({ ...schema, sections: updatedSections, fields: updatedFields });
        setDeleteConfirm(null);
      }
    });
  };

  const addSection = () => {
    if (!schema) return;
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      columns: 2,
    };
    setSchema({ ...schema, sections: [...schema.sections, newSection] });
    setExpandedSection(newSection.id);
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !schema) return;
    
    const oldIndex = schema.sections.findIndex(s => s.id === active.id);
    const newIndex = schema.sections.findIndex(s => s.id === over.id);
    
    if (oldIndex !== newIndex) {
      setSchema({
        ...schema,
        sections: arrayMove(schema.sections, oldIndex, newIndex),
      });
    }
  };

  const handleFieldDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    if (!over || !schema) return;
    
    const sectionFields = schema.fields
      .filter(f => f.sectionId === sectionId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const oldIndex = sectionFields.findIndex(f => f.id === active.id);
    const newIndex = sectionFields.findIndex(f => f.id === over.id);
    
    if (oldIndex !== newIndex) {
      const reorderedFields = arrayMove(sectionFields, oldIndex, newIndex);
      const updatedFields = reorderedFields.map((field: FormField, index: number) => ({
        ...field,
        order: index + 1,
      }));
      
      const otherFields = schema.fields.filter(f => f.sectionId !== sectionId);
      setSchema({
        ...schema,
        fields: [...otherFields, ...updatedFields],
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId);
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
      <MainLayout title={title || 'Loading Schema...'} subtitle={subtitle} icon="PencilRuler">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Action Buttons Skeleton */}
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-9 w-24 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="space-y-4">
            <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/40">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>

            {/* Content Skeleton - General Info Tab */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                  ))}
                </div>
                <div className="border-t pt-4 mt-4 border-gray-200 dark:border-gray-700">
                  <Skeleton className="h-5 w-40 rounded-md mb-4" />
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
                <div className="border-t pt-4 mt-4 border-gray-200 dark:border-gray-700">
                  <Skeleton className="h-5 w-40 rounded-md mb-4" />
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loadError) {
    return (
      <MainLayout title={title || 'Schema Not Found'} subtitle={subtitle} icon="PencilRuler" showEndLine={false}>
        <SchemaNotFound
          onGoBack={onBack}
          showGoBackButton={!!onBack}
          showHomeButton={false}
          onRefresh={onRefreshSchema}
          refreshing={refreshing}
        />
      </MainLayout>
    );
  }

  if (!schema) {
    return null;
  }

  return (
    <MainLayout 
      title={title || (schema.singular_name ? `Edit ${schema.singular_name}` : `Editing: ${schema.plural_name}`)} 
      subtitle={subtitle}
      icon="PencilRuler"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Display API response messages if available */}
        {apiResponse && (
          <MessageBoxContainer
            response={apiResponse}
            variant={apiResponse.success ? 'success' : 'error'}
            dismissible
            onDismiss={onClearResponse}
          />
        )}
        {saveFeedback && (
          <FormAlert
            type={saveFeedback.type}
            message={saveFeedback.message}
            dismissible
            onDismiss={() => setSaveFeedback(null)}
          />
        )}
        <SchemaActions
          onBack={onBack}
          onSave={handleSave}
          onReset={() => setShowResetDialog(true)}
          viewSchemaListUrl={schemaId ? `/page/${schemaId}` : undefined}
          saving={saving}
          onRefresh={onRefreshSchema}
          refreshing={refreshing}
          refreshLabel="Refresh"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/40 select-none">
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
            <TabsTrigger
              value="card"
              className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <Layout className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate hidden sm:inline">Card Metadata</span>
              <span className="truncate sm:hidden">Card</span>
            </TabsTrigger>
            <TabsTrigger
              value="detail"
              className="text-xs sm:text-sm rounded-lg py-2 px-3 text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate hidden sm:inline">Detail Page</span>
              <span className="truncate sm:hidden">Detail</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <GeneralInfoTab
              schema={schema}
              onUpdate={updateSchema}
            />
          </TabsContent>

          <TabsContent value="sections" className="space-y-4">
            <SectionsTab
              sections={schema.sections || []}
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

          <TabsContent value="card" className="space-y-4">
            <CardMetadataTab
              schema={schema}
              onUpdate={updateSchema}
            />
          </TabsContent>

          <TabsContent value="detail" className="space-y-4">
            <DetailPageMetadataTab
              schema={schema}
              onUpdate={updateSchema}
            />
          </TabsContent>
        </Tabs>
      </div>

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
    </MainLayout>
  );
}

