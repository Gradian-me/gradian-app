'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/main-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements/components/ConfirmationMessage';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { NameInput } from '@/gradian-ui/form-builder/form-elements';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { useEmailTemplates } from './hooks/useEmailTemplates';
import { DEFAULT_TEMPLATE_HTML, extractPlaceholders, renderWithValues, normalizeTemplateId } from './utils';
import type { EmailTemplate, PlaceholderValues } from './types';

export default function EmailTemplateBuilderPage() {
  const {
    templates,
    isLoading,
    error: templatesError,
    mutationState,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setError: setTemplatesError,
  } = useEmailTemplates();

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [workingTemplate, setWorkingTemplate] = useState<EmailTemplate | null>(null);
  const [placeholderValues, setPlaceholderValues] = useState<PlaceholderValues>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [isCustomIdMode, setIsCustomIdMode] = useState(false);
  const savingTemplateRef = useRef<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setSelectedTemplateId((current) => {
      // If current ID exists in templates, keep it
      if (current && templates.some((template) => template.id === current)) {
        return current;
      }
      // If we're currently saving a template, don't reset - wait for save to complete
      if (savingTemplateRef.current) {
        return current;
      }
      // Only reset to first template if we don't have a current selection
      if (!current && templates.length > 0) {
        return templates[0].id;
      }
      return current;
    });
  }, [templates]);

  useEffect(() => {
    // Don't update if we're currently saving
    if (savingTemplateRef.current) {
      return;
    }

    const activeTemplate =
      templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;
    
    // Only update workingTemplate if it's different from current or if we're switching templates
    // This prevents overwriting unsaved changes when templates list updates
    if (activeTemplate) {
      setWorkingTemplate((current) => {
        // If we're switching to a different template, update it
        if (!current || current.id !== activeTemplate.id) {
          // Reset placeholder values and custom mode only when switching templates
          setPlaceholderValues({});
          setIsCustomIdMode(false);
          return { ...activeTemplate };
        }
        // If it's the same template, keep current workingTemplate to preserve unsaved changes
        // Don't reset placeholder values or custom mode
        return current;
      });
    } else {
      setWorkingTemplate(null);
      setPlaceholderValues({});
      setIsCustomIdMode(false);
    }
  }, [templates, selectedTemplateId]);

  const placeholders = useMemo(() => {
    if (!workingTemplate) return [];
    const subjectKeys = extractPlaceholders(workingTemplate.subject);
    const htmlKeys = extractPlaceholders(workingTemplate.html);
    return Array.from(new Set([...subjectKeys, ...htmlKeys]));
  }, [workingTemplate?.subject, workingTemplate?.html]);

  useEffect(() => {
    if (!workingTemplate) return;
    setPlaceholderValues((previous) => {
      const nextValues: Record<string, string> = { ...previous };
      placeholders.forEach((key) => {
        if (nextValues[key] === undefined) {
          nextValues[key] = '';
        }
      });
      Object.keys(nextValues).forEach((key) => {
        if (!placeholders.includes(key)) {
          delete nextValues[key];
        }
      });
      return nextValues;
    });
  }, [placeholders, workingTemplate]);

  const resolvedSubject = useMemo(() => {
    if (!workingTemplate) return '';
    return renderWithValues(workingTemplate.subject, placeholderValues);
  }, [workingTemplate?.subject, placeholderValues]);

  const resolvedHtml = useMemo(() => {
    if (!workingTemplate) return '';
    return renderWithValues(workingTemplate.html, placeholderValues);
  }, [workingTemplate?.html, placeholderValues]);

  const templateApiUrl = useMemo(() => {
    if (!workingTemplate?.id) return '';
    return `/api/email-templates/${workingTemplate.id}`;
  }, [workingTemplate?.id]);

  const handleTemplateFieldChange = <K extends keyof EmailTemplate>(field: K, value: EmailTemplate[K]) => {
    if (!workingTemplate) return;
    const updated = { ...workingTemplate, [field]: value };
    
    // Auto-generate ID from name if not in custom mode
    if (field === 'name' && !isCustomIdMode) {
      const generatedId = normalizeTemplateId(value as string);
      updated.id = generatedId;
    }
    
    setWorkingTemplate(updated);
  };

  const handleTemplateIdChange = (newId: string) => {
    if (!workingTemplate) return;
    setWorkingTemplate({ ...workingTemplate, id: newId });
  };

  const handleCustomModeChange = (isCustom: boolean) => {
    setIsCustomIdMode(isCustom);
    if (!isCustom && workingTemplate) {
      // When switching back to auto mode, regenerate ID from name
      const generatedId = normalizeTemplateId(workingTemplate.name);
      setWorkingTemplate({ ...workingTemplate, id: generatedId });
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const template = await createTemplate({
        name: 'New template',
        description: 'Describe when this template is used.',
        subject: 'New email subject for {{audience}}',
        html: DEFAULT_TEMPLATE_HTML,
      });
      setSelectedTemplateId(template.id);
      toast.success('Template created.');
      setLocalError(null);
      setTemplatesError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template.';
      toast.error(message);
      setLocalError(message);
    }
  };

  const handleSaveTemplate = async () => {
    if (!workingTemplate) return;
    const originalId = workingTemplate.id;
    savingTemplateRef.current = originalId;
    try {
      const result = await updateTemplate(originalId, {
        name: workingTemplate.name,
        description: workingTemplate.description,
        subject: workingTemplate.subject,
        html: workingTemplate.html,
        id: workingTemplate.id,
      });
      
      // Update working template with saved result to reflect any changes (like ID)
      setWorkingTemplate({ ...result });
      
      // If ID changed, update the selected template ID
      if (result.id !== originalId) {
        setSelectedTemplateId(result.id);
      }
      
      toast.success('Template saved.');
      setLocalError(null);
      setTemplatesError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save template.';
      toast.error(message);
      setLocalError(message);
    } finally {
      savingTemplateRef.current = null;
    }
  };

  const handleDeleteClick = (templateId?: string) => {
    const idToDelete = templateId || workingTemplate?.id;
    if (!idToDelete) return;
    
    const template = templates.find((t) => t.id === idToDelete);
    if (!template) return;

    setTemplateToDelete({ id: idToDelete, name: template.name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate(templateToDelete.id);
      
      // If we deleted the currently selected template, the useEffect will handle
      // switching to another template automatically when templates list updates
      // But we can also clear it explicitly if it was the selected one
      if (templateToDelete.id === selectedTemplateId) {
        setSelectedTemplateId('');
      }
      
      toast.success('Template deleted.');
      setLocalError(null);
      setTemplatesError(null);
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template.';
      toast.error(message);
      setLocalError(message);
    }
  };

  const handlePlaceholderChange = (key: string, value: string) => {
    setPlaceholderValues((current) => ({ ...current, [key]: value }));
  };

  const renderEmptyState = () => (
    <Card>
      <CardHeader>
        <CardTitle>No templates yet</CardTitle>
        <CardDescription>Start by creating your first email template.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button onClick={handleCreateTemplate} disabled={mutationState.create}>
          {mutationState.create && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create template
        </Button>
      </CardFooter>
    </Card>
  );

  if (isLoading) {
    return (
      <MainLayout
        title="Email Template Generator"
        subtitle="Design, personalize, and preview transactional Gradian.me emails"
        icon="Mail"
      >
        <div className="py-6">
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading templates...</span>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Email Template Generator"
      subtitle="Design, personalize, and preview transactional Gradian.me emails"
      icon="Mail"
    >
      <div className="py-4 md:py-6 space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-2 px-3">
            <Link href="/builder">
              <ArrowLeft className="h-4 w-4" />
              Back to builder
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            Gradian.me communications
          </p>
          <h1 className="text-3xl font-semibold">Email template generator</h1>
          <p className="text-muted-foreground">
            Create domain-specific HTML emails, define placeholders, and preview personalized values instantly.
          </p>
          {(templatesError ?? localError) && (
            <p className="text-sm text-destructive">{templatesError ?? localError}</p>
          )}
        </div>

        {templates.length === 0 || !workingTemplate ? (
          renderEmptyState()
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Templates</CardTitle>
                    <CardDescription>Switch between reusable layouts.</CardDescription>
                  </div>
                  <Button size="sm" onClick={handleCreateTemplate} disabled={mutationState.create}>
                    {mutationState.create && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.map((template) => {
                  const isActive = template.id === workingTemplate.id;
                  return (
                    <div
                      key={template.id}
                      className={`group relative w-full rounded-2xl border p-4 transition ${
                        isActive
                          ? 'border-violet-500/60 bg-violet-500/5 shadow-sm'
                          : 'border-border hover:border-violet-500/40 hover:bg-muted/40'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedTemplateId(template.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-2 pr-6">
                          <p className="font-medium">{template.name}</p>
                          {isActive && <Badge variant="secondary">Active</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(template.id);
                        }}
                        disabled={mutationState.delete}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
                        title="Delete template"
                      >
                        {mutationState.delete ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <IconRenderer iconName="Trash2" className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>Template details</CardTitle>
                      <CardDescription>Update the metadata and HTML source.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDeleteClick()}
                        disabled={mutationState.delete}
                      >
                        {mutationState.delete ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <IconRenderer iconName="Trash2" className="mr-2 h-4 w-4" />
                        )}
                        Delete
                      </Button>
                      <Button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveTemplate();
                        }} 
                        disabled={mutationState.update}
                      >
                        {mutationState.update && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save template
                      </Button>
                    </div>
                  </div>
                  {templateApiUrl && (
                    <div className="mt-4 space-y-2">
                      <Label>Template API URL</Label>
                      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-2 text-sm">
                        <span className="truncate font-mono text-xs md:text-sm">{templateApiUrl}</span>
                        <CopyContent content={templateApiUrl} />
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template name</Label>
                      <Input
                        id="template-name"
                        value={workingTemplate.name}
                        onChange={(event) => handleTemplateFieldChange('name', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-description">Description</Label>
                      <Input
                        id="template-description"
                        value={workingTemplate.description}
                        onChange={(event) => handleTemplateFieldChange('description', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <NameInput
                      config={{
                        id: 'template-id',
                        name: 'template-id',
                        label: 'Template ID',
                        placeholder: 'template-id',
                      }}
                      value={workingTemplate.id}
                      onChange={handleTemplateIdChange}
                      isCustomizable={true}
                      customMode={isCustomIdMode}
                      onCustomModeChange={handleCustomModeChange}
                      helperText="Used in API URLs and file names. Lowercase, numbers, hyphens(-), and underscores(_) are allowed."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-subject">Subject</Label>
                    <Input
                      id="template-subject"
                      value={workingTemplate.subject}
                      onChange={(event) => handleTemplateFieldChange('subject', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-html">HTML content</Label>
                    <Textarea
                      id="template-html"
                      className="font-mono text-sm h-[420px]"
                      value={workingTemplate.html}
                      onChange={(event) => handleTemplateFieldChange('html', event.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    Placeholders use double braces syntax, for example <code>{'{{userName}}'}</code>.
                  </p>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Personalize & preview</CardTitle>
                  <CardDescription>Fill placeholder values to see the rendered email.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {placeholders.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {placeholders.map((key) => (
                        <div className="space-y-1.5" key={key}>
                          <Label htmlFor={`placeholder-${key}`}>{key}</Label>
                          <Input
                            id={`placeholder-${key}`}
                            placeholder={`Enter value for ${key}`}
                            value={placeholderValues[key] ?? ''}
                            onChange={(event) => handlePlaceholderChange(key, event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      No placeholders detected. Add <code>{'{{key}}'}</code> anywhere in the subject or HTML to start
                      personalizing this template.
                    </div>
                  )}

                  <Separator />

                  <Tabs defaultValue="preview">
                    <TabsList>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="subject">Rendered subject</TabsTrigger>
                      <TabsTrigger value="html">Resolved HTML</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview">
                      <div className="rounded-2xl border bg-background px-6 py-6">
                        <p className="text-sm font-semibold text-muted-foreground mb-4">{resolvedSubject}</p>
                        <div
                          className="prose max-w-none dark:prose-invert text-sm"
                          dangerouslySetInnerHTML={{ __html: resolvedHtml }}
                        />
                      </div>
                    </TabsContent>
                  <TabsContent value="subject">
                    <pre className="rounded-2xl border bg-muted/60 p-4 text-sm font-mono whitespace-pre-wrap">
                      {resolvedSubject}
                    </pre>
                    </TabsContent>
                    <TabsContent value="html">
                      <CodeViewer
                        code={resolvedHtml}
                        programmingLanguage="html"
                        title="Resolved HTML"
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <ConfirmationMessage
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Template"
        message={
          templateToDelete
            ? `Are you sure you want to delete "${templateToDelete.name}"? This action cannot be undone and will permanently remove the template and its file.`
            : ''
        }
        variant="destructive"
        buttons={[
          {
            label: 'Cancel',
            variant: 'outline',
            action: () => {
              setDeleteConfirmOpen(false);
              setTemplateToDelete(null);
            },
          },
          {
            label: 'Delete',
            variant: 'destructive',
            icon: 'Trash2',
            action: handleDeleteConfirm,
            disabled: mutationState.delete,
          },
        ]}
      />
    </MainLayout>
  );
}

