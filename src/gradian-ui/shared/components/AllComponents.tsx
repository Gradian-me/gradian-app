'use client';
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';
import Link from 'next/link';
import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';
import { cn } from '@/gradian-ui/shared/utils';
import { ALL_COMPONENTS, ComponentMeta } from '@/gradian-ui/shared/components/component-registry';
import { IconBox, resolveIconBoxColor } from '@/gradian-ui/form-builder/form-elements';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { SearchInput } from '@/gradian-ui/form-builder/form-elements/components/SearchInput';
import { renderHighlightedText } from '@/gradian-ui/shared/utils/highlighter';
import { Badge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const AllComponents: React.FC = () => {
  const [isTodosPickerOpen, setTodosPickerOpen] = useState(false);
  const [isStaticPickerOpen, setStaticPickerOpen] = useState(false);
  const [lastSelection, setLastSelection] = useState<any[]>([]);

  const columnMap: ColumnMapConfig = useMemo(() => ({
    item: {
      id: 'id',
      title: 'title',
      subtitle: 'completed',
      // icon/color left unmapped; defaults will be used
    },
    request: {
      page: 'page',
      limit: 'limit',
      search: 'q',
      includeIds: 'includeIds',
      excludeIds: 'excludeIds',
    },
    response: {
      data: '', // payload is an array; extractor handles it
      meta: {
        // no meta in this API; derived hasMore will be based on pageSize vs total
      },
    },
  }), []);

  const todosPickerConfigCode = `const columnMap = {
  item: {
    id: 'id',
    title: 'title',
    subtitle: 'completed',
  },
  request: {
    page: 'page',
    limit: 'limit',
    search: 'q',
  },
  response: {
    data: '', // array payload
  },
} as const;`;

  const todosPickerUsageCode = `<PopupPicker
  isOpen={isTodosPickerOpen}
  onClose={() => setTodosPickerOpen(false)}
  sourceUrl="https://jsonplaceholder.typicode.com/todos"
  columnMap={columnMap}
  allowMultiselect
  pageSize={200} // prevent false pagination for this API
  onSelect={(normalized, raw) => {
    setLastSelection(raw);
  }}
/>`;

  const staticSampleData = [
    {
      userId: 1,
      id: 1,
      title: 'delectus aut autem',
      completed: false,
    },
    {
      userId: 1,
      id: 2,
      title: 'quis ut nam facilis et officia qui',
      completed: false,
    },
  ];

  const staticPickerUsageCode = `<PopupPicker
  isOpen={isStaticPickerOpen}
  onClose={() => setStaticPickerOpen(false)}
  staticItems={[${JSON.stringify(staticSampleData[0], null, 2)}, ${JSON.stringify(staticSampleData[1], null, 2)}]}
  allowMultiselect
  onSelect={(normalized, raw) => {
    setLastSelection(raw);
  }}
/>`;

  // Catalog search
  const [catalogQuery, setCatalogQuery] = useState('');
  const categories = useMemo(() => {
    const set = new Set<string>();
    ALL_COMPONENTS.forEach(c => set.add(c.category));
    return ['all', ...Array.from(set)];
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const filteredComponents = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    const base = selectedCategory === 'all'
      ? ALL_COMPONENTS
      : ALL_COMPONENTS.filter(c => c.category === selectedCategory);
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
  }, [catalogQuery, selectedCategory, ALL_COMPONENTS]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, ComponentMeta[]>();
    filteredComponents.forEach((c) => {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredComponents]);

  const categoryOptions = useMemo(() => {
    return categories.map(cat => ({ id: cat, label: cat.toUpperCase() }));
  }, [categories]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">All Components</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Central wiki for our form-elements, data-display, and analytics components with live samples and documentation.
        </p>
      </header>

      {/* Catalog */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Catalog</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Overview of exported components in <code>@gradian-ui</code>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-2">
            <SearchInput
              config={{ name: 'components-search', placeholder: 'Search components, categories, and descriptions...' } as any}
              value={catalogQuery}
              onChange={setCatalogQuery}
              onClear={() => setCatalogQuery('')}
            />
          </div>
          <div className="md:col-span-1">
            <Select
              config={{ name: 'component-category', label: 'Category', allowMultiselect: false } as any}
              options={categoryOptions}
              value={selectedCategory}
              onValueChange={(val) => setSelectedCategory(String(val))}
              placeholder="Select category"
            />
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {filteredComponents.length} result{filteredComponents.length === 1 ? '' : 's'}
        </div>
        <Accordion type="multiple" className="space-y-2" defaultValue={groupedByCategory.map(([cat]) => cat)}>
          {groupedByCategory.map(([category, comps]) => (
            <AccordionItem key={category} value={category} className="border border-gray-200 dark:border-gray-800 rounded-lg px-2">
              <AccordionTrigger className="px-1 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <div className="flex items-center gap-2">
                  <span>{renderHighlightedText(category.toUpperCase(), catalogQuery)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">({comps.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="p-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {comps.map((comp) => (
                  <div key={comp.id} className="rounded-xl border p-3 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                      <div className="flex items-start gap-3">
                        {comp.icon ? (
                          <IconBox
                            name={comp.icon}
                            variant="filled"
                            size="md"
                            color={resolveIconBoxColor(comp.color || 'gray')}
                            className={!comp.color ? '!bg-gray-800' : undefined}
                          />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold truncate">
                                {renderHighlightedText(comp.label, catalogQuery)}
                              </h3>
                            </div>
                            <Badge
                              variant="outline"
                              size="sm"
                              className="px-1.5 py-0.5 text-[10px] leading-none font-mono bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                            >
                              {renderHighlightedText(comp.id, catalogQuery)}
                            </Badge>
                          </div>
                          {comp.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {renderHighlightedText(comp.description, catalogQuery)}
                            </p>
                          )}
                          {comp.usecase && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              <span className="font-medium">Use case:</span>{' '}
                              {renderHighlightedText(comp.usecase, catalogQuery)}
                            </p>
                          )}
                          <div className="mt-2">
                            <code className="text-[11px] bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded block overflow-x-auto">
                              {renderHighlightedText(comp.directory, catalogQuery)}
                            </code>
                          </div>
                        <div className="mt-3">
                          <Link href={`/ui/components/${comp.id}`} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            <IconRenderer iconName="ExternalLink" className="h-3.5 w-3.5" />
                            View details & samples
                          </Link>
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">PopupPicker - Remote (Todos)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Demonstrates using PopupPicker with a public API and column mapping.
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => setTodosPickerOpen(true)}>
            Open Todos Picker
          </Button>
          <Button type="button" variant="outline" onClick={() => setLastSelection([])}>
            Clear Last Selection
          </Button>
        </div>
        <div className="grid gap-3">
          <CodeViewer title="Mapping Config" programmingLanguage="ts" code={todosPickerConfigCode} />
          <CodeViewer title="Usage" programmingLanguage="tsx" code={todosPickerUsageCode} />
        </div>
        <PopupPicker
          isOpen={isTodosPickerOpen}
          onClose={() => setTodosPickerOpen(false)}
          sourceUrl="https://jsonplaceholder.typicode.com/todos"
          columnMap={columnMap}
          allowMultiselect
          pageSize={200}
          onSelect={async (_normalized, raw) => {
            setLastSelection(raw);
          }}
          title="Select Todos"
          description="Data via jsonplaceholder"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">PopupPicker - Static Items</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Demonstrates PopupPicker using static items (no network).
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => setStaticPickerOpen(true)}>
            Open Static Picker
          </Button>
          <Button type="button" variant="outline" onClick={() => setLastSelection([])}>
            Clear Last Selection
          </Button>
        </div>
        <div className="grid gap-3">
          <CodeViewer title="Static Usage" programmingLanguage="tsx" code={staticPickerUsageCode} />
        </div>
        <PopupPicker
          isOpen={isStaticPickerOpen}
          onClose={() => setStaticPickerOpen(false)}
          staticItems={staticSampleData}
          allowMultiselect
          onSelect={async (_normalized, raw) => {
            setLastSelection(raw);
          }}
          title="Select Items"
          description="Using sample static items"
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Last Selection (Raw)</h3>
        <div className={cn('rounded-lg border p-3 text-xs overflow-auto', lastSelection.length ? 'border-gray-200 dark:border-gray-800' : 'border-dashed')}>
          {lastSelection.length ? <pre className="m-0 whitespace-pre-wrap">{JSON.stringify(lastSelection, null, 2)}</pre> : <span className="text-gray-500">No selection yet.</span>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">More Components</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Extend this page with your components from <code>@form-elements</code>, <code>@data-display</code>, and <code>@analytics</code> as needed.
        </p>
      </section>
    </div>
  );
};

AllComponents.displayName = 'AllComponents';


