'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/gradian-ui/shared/utils';
import { ALL_COMPONENTS, ComponentMeta } from '@/gradian-ui/shared/components/component-registry';
import type { ComponentConfigField } from '@/gradian-ui/shared/components/component-registry';
import { IconBox, resolveIconBoxColor, Button } from '@/gradian-ui/form-builder/form-elements';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { SearchInput } from '@/gradian-ui/form-builder/form-elements/components/SearchInput';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { Badge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileText, Info } from 'lucide-react';

export interface AllComponentsProps {
  /** Pass from server to avoid hydration mismatch (registry loads only on server). */
  initialComponents?: ComponentMeta[];
}

export const AllComponents: React.FC<AllComponentsProps> = ({ initialComponents }) => {
  const router = useRouter();
  const components = initialComponents ?? ALL_COMPONENTS;

  const [catalogQuery, setCatalogQuery] = useState('');
  const [hasDemoOnly, setHasDemoOnly] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const categories = useMemo(() => {
    const set = new Set<string>();
    components.forEach((c) => set.add(c.category));
    return ['all', ...Array.from(set)];
  }, [components]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const filteredComponents = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    let base =
      selectedCategory === 'all' ? components : components.filter((c) => c.category === selectedCategory);
    if (hasDemoOnly) base = base.filter((c) => !!c.demoUrl);
    if (!q) return base;
    return base.filter((c) => {
      return (
        c.id.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.usecase && c.usecase.toLowerCase().includes(q)) ||
        (c.directory && c.directory.toLowerCase().includes(q))
      );
    });
  }, [catalogQuery, selectedCategory, hasDemoOnly, components]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, ComponentMeta[]>();
    filteredComponents.forEach((c) => {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredComponents]);

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ id: cat, label: cat.replace(/-/g, ' ').toUpperCase() })),
    [categories]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogComponent, setDialogComponent] = useState<ComponentMeta | null>(null);
  const openDetailsDialog = (comp: ComponentMeta) => {
    setDialogComponent(comp);
    setDialogOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">All Components</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Central wiki for form-elements, data-display, and analytics components with live samples and
          documentation.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Catalog</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Overview of exported components in <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs">@gradian-ui</code>.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <SearchInput
              config={{
                name: 'components-search',
                placeholder: 'Search components, categories, and descriptions...',
              } as any}
              value={catalogQuery}
              onChange={setCatalogQuery}
              onClear={() => setCatalogQuery('')}
            />
          </div>
          <div className="shrink-0 w-full sm:w-48">
            <Select
              config={{ name: 'component-category', label: '', allowMultiselect: false } as any}
              options={categoryOptions}
              value={selectedCategory}
              onValueChange={(val) => setSelectedCategory(String(val))}
              placeholder="Select category"
            />
          </div>
          {mounted && (
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                id="has-demo"
                checked={hasDemoOnly}
                onCheckedChange={setHasDemoOnly}
              />
              <Label htmlFor="has-demo" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">
                DEMO
              </Label>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filteredComponents.length} result{filteredComponents.length === 1 ? '' : 's'}
        </p>

        <Accordion
          type="multiple"
          className="space-y-6"
          defaultValue={groupedByCategory.map(([cat]) => cat)}
        >
          {groupedByCategory.map(([category, comps]) => (
            <AccordionItem
              key={category}
              value={category}
              className={cn(
                'rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm overflow-hidden',
                'data-[state=open]:border-gray-300 dark:data-[state=open]:border-gray-700/60'
              )}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:border-b bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {renderHighlightedText(category.toUpperCase(), catalogQuery)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">({comps.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                  {comps.map((comp) => (
                    <div
                      key={comp.id}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 shadow-sm p-4"
                    >
                      <div className="flex items-start gap-3 h-full">
                        {comp.icon ? (
                          <div className="shrink-0">
                            <IconBox
                              name={comp.icon}
                              variant="filled"
                              size="md"
                              color={resolveIconBoxColor(comp.color || 'gray')}
                              className={!comp.color ? 'bg-gray-800 dark:bg-gray-700' : undefined}
                            />
                          </div>
                        ) : null}
                        <div className="flex-1 min-w-0 h-full justify-between flex flex-col">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {renderHighlightedText(comp.label, catalogQuery)}
                            </h3>
                            <Badge
                              variant="outline"
                              size="sm"
                              className="shrink-0 px-1.5 py-0 text-[10px] font-mono bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                            >
                              {renderHighlightedText(comp.id, catalogQuery)}
                            </Badge>
                          </div>
                          {comp.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2">
                              {renderHighlightedText(comp.description, catalogQuery)}
                            </p>
                          )}
                          {comp.usecase && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                              <span className="font-medium">Use case:</span>{' '}
                              {renderHighlightedText(comp.usecase, catalogQuery)}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openDetailsDialog(comp)}
                            >
                              <Info className="h-3.5 w-3.5" />
                              Details
                            </Button>
                            {comp.demoUrl ? (
                              <Button
                                variant="primary"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => router.push(comp.demoUrl!)}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                DEMO
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {dialogComponent ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3 h-full">
                  {dialogComponent.icon ? (
                    <IconBox
                      name={dialogComponent.icon}
                      variant="filled"
                      size="lg"
                      color={resolveIconBoxColor(dialogComponent.color || 'gray')}
                      className={!dialogComponent.color ? 'bg-gray-800 dark:bg-gray-700' : undefined}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <DialogTitle>{dialogComponent.label}</DialogTitle>
                    <DialogDescription>
                      <span className="uppercase text-gray-500 dark:text-gray-400">{dialogComponent.category}</span>
                      <span className="mx-2">·</span>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {dialogComponent.id}
                      </code>
                      {dialogComponent.demoUrl ? (
                        <>
                          <span className="mx-2">·</span>
                          <a
                            href={dialogComponent.demoUrl}
                            className="text-violet-600 dark:text-violet-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Demo
                          </a>
                        </>
                      ) : null}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 space-y-4 pr-2 -me-2">
                {dialogComponent.description ? (
                  <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{dialogComponent.description}</p>
                  </section>
                ) : null}
                {dialogComponent.usecase ? (
                  <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Use case
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{dialogComponent.usecase}</p>
                  </section>
                ) : null}
                {/* Source directory intentionally hidden to reduce noise */}
                {dialogComponent.configSchema?.fields?.length ? (
                  <section>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                      Config schema
                    </h4>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/80 text-left">
                            <th className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Field</th>
                            <th className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Type</th>
                            <th className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Description</th>
                            <th className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">Default</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(dialogComponent.configSchema.fields as ComponentConfigField[]).map((field, idx) => (
                            <tr
                              key={field.name}
                              className={cn(
                                'border-t border-gray-200 dark:border-gray-700',
                                idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                              )}
                            >
                              <td className="px-3 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">
                                {field.name}
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{field.type}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[200px]">
                                {field.description ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                {field.options?.length
                                  ? `One of: ${field.options.map((o) => String(o.value)).join(', ')}`
                                  : field.defaultValue !== undefined
                                    ? String(field.defaultValue)
                                    : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Number, min, max, step and select options are available in the schema.
                    </p>
                  </section>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

AllComponents.displayName = 'AllComponents';
