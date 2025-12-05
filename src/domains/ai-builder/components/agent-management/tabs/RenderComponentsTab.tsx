'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { TextInput, Textarea, Select, NameInput, ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements';
import { AiAgent } from '../../../types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { fetchFormComponents } from '@/gradian-ui/schema-manager/utils/component-registry-client';

interface RenderComponentsTabProps {
  agent: AiAgent;
  onUpdate: (updates: Partial<AiAgent>) => void;
  readonly?: boolean;
}

export function RenderComponentsTab({ agent, onUpdate, readonly = false }: RenderComponentsTabProps) {
  const renderComponents = agent.renderComponents || [];
  const [availableComponents, setAvailableComponents] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [componentsLoading, setComponentsLoading] = useState(true);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        setComponentsLoading(true);
        const components = await fetchFormComponents();
        setAvailableComponents(components);
      } catch (error) {
        console.error('Failed to load components:', error);
      } finally {
        setComponentsLoading(false);
      }
    };

    loadComponents();
  }, []);

  const addComponent = () => {
    const newComponent: any = {
      id: `component-${Date.now()}`,
      name: 'newComponent',
      label: 'New Component',
      component: 'text',
    };
    onUpdate({ renderComponents: [...renderComponents, newComponent] });
  };

  const updateComponent = (index: number, updates: any) => {
    const updated = [...renderComponents];
    updated[index] = { ...updated[index], ...updates };
    onUpdate({ renderComponents: updated });
  };

  const deleteComponent = (index: number) => {
    const updated = renderComponents.filter((_, i) => i !== index);
    onUpdate({ renderComponents: updated.length > 0 ? updated : undefined });
    setDeleteConfirmIndex(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Render Components</CardTitle>
          {!readonly && (
            <Button size="sm" onClick={addComponent}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderComponents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No render components configured.</p>
            {!readonly && (
              <Button variant="outline" size="sm" onClick={addComponent} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Component
              </Button>
            )}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {renderComponents.map((component, index) => {
              // Check if component is a route-based component (has route property)
              const isRouteComponent = 'route' in component && component.route;
              
              return (
                <AccordionItem key={component.id || index} value={`component-${index}`} className="border rounded-lg">
                  <div className="flex items-center justify-between">
                    <AccordionTrigger className="px-4 flex-1">
                      <span className="font-medium">
                        {component.label || component.name || `Component ${index + 1}`}
                      </span>
                    </AccordionTrigger>
                    {!readonly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmIndex(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    {isRouteComponent ? (
                      // Route-based component fields
                      <>
                        <div>
                          <TextInput
                            config={{ name: 'route', label: 'Route' }}
                            value={component.route || ''}
                            onChange={(value) => updateComponent(index, { route: value })}
                            disabled={readonly}
                          />
                        </div>
                        <div>
                          <TextInput
                            config={{ name: 'title', label: 'Title' }}
                            value={component.title || ''}
                            onChange={(value) => updateComponent(index, { title: value })}
                            disabled={readonly}
                          />
                        </div>
                        <div>
                          <Textarea
                            config={{ name: 'description', label: 'Description' }}
                            value={component.description || ''}
                            onChange={(value) => updateComponent(index, { description: value })}
                            rows={3}
                            disabled={readonly}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Select
                              config={{ name: 'method', label: 'Method' }}
                              options={[
                                { value: 'GET', label: 'GET' },
                                { value: 'POST', label: 'POST' },
                              ]}
                              value={component.method || 'GET'}
                              onValueChange={(value) => updateComponent(index, { method: value })}
                              disabled={readonly}
                            />
                          </div>
                          <div>
                            <TextInput
                              config={{ name: 'jsonPath', label: 'JSON Path' }}
                              value={component.jsonPath || ''}
                              onChange={(value) => updateComponent(index, { jsonPath: value })}
                              disabled={readonly}
                            />
                          </div>
                        </div>
                        <div>
                          <Select
                            config={{ name: 'outputFormat', label: 'Output Format' }}
                            options={[
                              { value: 'json', label: 'JSON' },
                              { value: 'string', label: 'String' },
                              { value: 'toon', label: 'Toon' },
                            ]}
                            value={component.outputFormat || 'json'}
                            onValueChange={(value) => updateComponent(index, { outputFormat: value })}
                            disabled={readonly}
                          />
                        </div>
                      </>
                    ) : (
                      // Form field component
                      <>
                        <div>
                          <TextInput
                            config={{ name: 'component-id', label: 'Component ID' }}
                            value={component.id || ''}
                            onChange={(value) => updateComponent(index, { id: value })}
                            disabled={readonly}
                          />
                        </div>
                        <div>
                          <NameInput
                            config={{ name: 'component-name', label: 'Name (camelCase)' }}
                            value={component.name || ''}
                            onChange={(value) => updateComponent(index, { name: value })}
                            disabled={readonly}
                            isCustomizable={false}
                          />
                        </div>
                        <div>
                          <TextInput
                            config={{ name: 'component-label', label: 'Label' }}
                            value={component.label || ''}
                            onChange={(value) => updateComponent(index, { label: value })}
                            disabled={readonly}
                          />
                        </div>
                        <div>
                          <Select
                            config={{ name: 'component-type', label: 'Component Type' }}
                            options={availableComponents.map((comp) => ({ 
                              id: comp.value, 
                              value: comp.value, 
                              label: comp.label 
                            }))}
                            value={component.component || ''}
                            onValueChange={(value) => updateComponent(index, { component: value })}
                            disabled={readonly || componentsLoading}
                            sortType="ASC"
                          />
                          {!componentsLoading && availableComponents.length > 0 && component.component && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                              {availableComponents.find(c => c.value === component.component)?.description || ''}
                            </p>
                          )}
                          {componentsLoading && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Loading components...</p>
                          )}
                          {!componentsLoading && availableComponents.length === 0 && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">
                              Failed to load components. Please refresh the page.
                            </p>
                          )}
                        </div>
                        <div>
                          <Textarea
                            config={{ name: 'placeholder', label: 'Placeholder' }}
                            value={component.placeholder || ''}
                            onChange={(value) => updateComponent(index, { placeholder: value })}
                            rows={2}
                            disabled={readonly}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <TextInput
                              config={{ name: 'sectionId', label: 'Section ID' }}
                              value={component.sectionId || ''}
                              onChange={(value) => updateComponent(index, { sectionId: value })}
                              disabled={readonly}
                            />
                          </div>
                          <div>
                            <TextInput
                              config={{ name: 'aiAgentId', label: 'AI Agent ID' }}
                              value={component.aiAgentId || ''}
                              onChange={(value) => updateComponent(index, { aiAgentId: value })}
                              disabled={readonly}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        <ConfirmationMessage
          isOpen={deleteConfirmIndex !== null}
          onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}
          title="Delete Component"
          message={`Are you sure you want to delete "${renderComponents[deleteConfirmIndex || 0]?.label || renderComponents[deleteConfirmIndex || 0]?.name || 'this component'}"? This action cannot be undone.`}
          variant="warning"
          buttons={[
            {
              label: 'Cancel',
              variant: 'outline',
              action: () => setDeleteConfirmIndex(null),
            },
            {
              label: 'Delete',
              variant: 'destructive',
              action: () => deleteConfirmIndex !== null && deleteComponent(deleteConfirmIndex),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

