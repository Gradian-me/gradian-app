'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Settings, Layers, Plus } from 'lucide-react';
import { useSchemaBuilder } from '../hooks/useSchemaBuilder';
import { SchemaBuilderConfig } from '../types/builder';
import { FieldEditor } from './FieldEditor';
import { getFieldsForSection, generateFieldId } from '../utils/builder-utils';

interface SchemaBuilderProps {
  schemaId: string;
  config?: SchemaBuilderConfig;
}

export function SchemaBuilder({ schemaId, config }: SchemaBuilderProps) {
  const { state, actions } = useSchemaBuilder(config);

  useEffect(() => {
    if (schemaId) {
      actions.loadSchema(schemaId).catch(console.error);
    }
  }, [schemaId]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!state.schema) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-4">Schema not found</h3>
        <p className="text-gray-600">Please try loading a different schema.</p>
      </div>
    );
  }

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    if (!state.schema) return;
    
    const field = state.schema.fields.find(f => f.id === fieldId);
    if (!field) return;
    
    const fields = getFieldsForSection(state.schema, field.sectionId);
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    actions.moveField(field.sectionId, currentIndex, newIndex);
  };

  const handleAddField = (sectionId: string) => {
    actions.addField(sectionId);
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={state.selectedTab}
        onValueChange={(value) => {
          // This would need to be implemented in the hook
        }}
      >
        <TabsList className="grid w-full grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900/40 select-none">
          <TabsTrigger
            value="general"
            className="flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-sm font-medium text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
          >
            <Settings className="h-4 w-4 me-2" />
            General
          </TabsTrigger>
          <TabsTrigger
            value="sections"
            className="flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-sm font-medium text-gray-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
          >
            <Layers className="h-4 w-4 me-2" />
            Sections & Fields
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schema Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium">ID</label>
                  <input
                    value={state.schema.id}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Singular Name</label>
                    <input
                      value={state.schema.singular_name}
                      onChange={(e) => actions.updateSchema({ singular_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plural Name</label>
                    <input
                      value={state.schema.plural_name}
                      onChange={(e) => actions.updateSchema({ plural_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          <div className="space-y-6">
            {state.schema.sections.map((section) => {
              const fields = getFieldsForSection(state.schema!, section.id);
              return (
                <Card key={section.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <input
                        value={section.title}
                        onChange={(e) => actions.updateSection(section.id, { title: e.target.value })}
                        className="text-lg font-semibold border-none bg-transparent focus:outline-none w-full"
                      />
                      <div className="flex gap-2">
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          onClick={() => actions.toggleSection(section.id)}
                        >
                          {state.expandedSections.has(section.id) ? '−' : '+'}
                        </button>
                        <button
                          className="text-red-600 hover:text-red-700"
                          onClick={() => actions.deleteSection(section.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <AnimatePresence>
                    {state.expandedSections.has(section.id) && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                      >
                        <CardContent className="space-y-4 pt-2">
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-sm font-semibold">Fields ({fields.length})</h4>
                              <button
                                onClick={() => handleAddField(section.id)}
                                className="text-sm text-violet-600 hover:text-violet-700"
                              >
                                + Add Field
                              </button>
                            </div>
                            {fields.length === 0 ? (
                              <p className="text-center text-gray-400 py-4">No fields yet</p>
                            ) : (
                              <div className="space-y-3">
                                {fields.map((field, index) => (
                                  <FieldEditor
                                    key={field.id}
                                    field={field}
                                    onUpdate={(updates) => actions.updateField(field.id, updates)}
                                    onDelete={() => actions.deleteField(field.id)}
                                    sections={state.schema!.sections}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < fields.length - 1}
                                    onMoveUp={() => handleMoveField(field.id, 'up')}
                                    onMoveDown={() => handleMoveField(field.id, 'down')}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

