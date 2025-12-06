'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { TextInput, Textarea, Select, ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements';
import { AiAgent } from '../../../types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PreloadRoutesTabProps {
  agent: AiAgent;
  onUpdate: (updates: Partial<AiAgent>) => void;
  readonly?: boolean;
}

export function PreloadRoutesTab({ agent, onUpdate, readonly = false }: PreloadRoutesTabProps) {
  const preloadRoutes = agent.preloadRoutes || [];
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const addRoute = () => {
    const newRoute: any = {
      route: '/api/example',
      title: 'New Route',
      description: '',
      method: 'GET',
    };
    onUpdate({ preloadRoutes: [...preloadRoutes, newRoute] });
  };

  const updateRoute = (index: number, updates: any) => {
    const updated = [...preloadRoutes];
    updated[index] = { ...updated[index], ...updates };
    onUpdate({ preloadRoutes: updated });
  };

  const deleteRoute = (index: number) => {
    const updated = preloadRoutes.filter((_, i) => i !== index);
    onUpdate({ preloadRoutes: updated.length > 0 ? updated : undefined });
    setDeleteConfirmIndex(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preload Routes</CardTitle>
          {!readonly && (
            <Button size="sm" onClick={addRoute}>
              <Plus className="h-4 w-4 me-2" />
              Add Route
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {preloadRoutes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No preload routes configured.</p>
            {!readonly && (
              <Button variant="outline" size="sm" onClick={addRoute} className="mt-4">
                <Plus className="h-4 w-4 me-2" />
                Add First Route
              </Button>
            )}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {preloadRoutes.map((route, index) => (
              <AccordionItem key={index} value={`route-${index}`} className="border rounded-lg">
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="px-4 flex-1">
                    <span className="font-medium">{route.title || route.route || `Route ${index + 1}`}</span>
                  </AccordionTrigger>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 me-2"
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
                  <div>
                    <TextInput
                      config={{ name: 'route', label: 'Route' }}
                      value={route.route || ''}
                      onChange={(value) => updateRoute(index, { route: value })}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <TextInput
                      config={{ name: 'title', label: 'Title' }}
                      value={route.title || ''}
                      onChange={(value) => updateRoute(index, { title: value })}
                      disabled={readonly}
                    />
                  </div>
                  <div>
                    <Textarea
                      config={{ name: 'description', label: 'Description' }}
                      value={route.description || ''}
                      onChange={(value) => updateRoute(index, { description: value })}
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
                        value={route.method || 'GET'}
                        onValueChange={(value) => updateRoute(index, { method: value })}
                        disabled={readonly}
                      />
                    </div>
                    <div>
                      <TextInput
                        config={{ name: 'jsonPath', label: 'JSON Path' }}
                        value={route.jsonPath || ''}
                        onChange={(value) => updateRoute(index, { jsonPath: value })}
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
                      value={route.outputFormat || 'json'}
                      onValueChange={(value) => updateRoute(index, { outputFormat: value })}
                      disabled={readonly}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <ConfirmationMessage
          isOpen={deleteConfirmIndex !== null}
          onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}
          title="Delete Route"
          message={`Are you sure you want to delete "${preloadRoutes[deleteConfirmIndex || 0]?.title || preloadRoutes[deleteConfirmIndex || 0]?.route || 'this route'}"? This action cannot be undone.`}
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
              action: () => deleteConfirmIndex !== null && deleteRoute(deleteConfirmIndex),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

