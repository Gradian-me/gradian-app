'use client';

import React, { useMemo, useState } from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Button } from '@/components/ui/button';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';
import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';
import { cn } from '@/gradian-ui/shared/utils';
import Link from 'next/link';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

const columnMap: ColumnMapConfig = {
  item: {
    id: 'id',
    title: 'title',
    subtitle: 'completed',
  },
  request: {
    page: 'page',
    limit: 'limit',
    search: 'q',
    includeIds: 'includeIds',
    excludeIds: 'excludeIds',
  },
  response: {
    data: '',
  },
};

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
  pageSize={200}
  onSelect={(normalized, raw) => setLastSelection(raw)}
/>`;

const staticSampleData = [
  { userId: 1, id: 1, title: 'delectus aut autem', completed: false },
  { userId: 1, id: 2, title: 'quis ut nam facilis et officia qui', completed: false },
];

const staticPickerUsageCode = `<PopupPicker
  isOpen={isStaticPickerOpen}
  onClose={() => setStaticPickerOpen(false)}
  staticItems={staticSampleData}
  allowMultiselect
  onSelect={(normalized, raw) => setLastSelection(raw)}
/>`;

// Lookup ID from tests/httpbook/lookup_test.http – options via GET /api/lookups/options/[lookup-id]
const LOOKUP_DEMO_ID = '01KJ06YM685FYANN2ZVV4CGSGH';

const lookupPickerUsageCode = `<PopupPicker
  isOpen={isLookupPickerOpen}
  onClose={() => setLookupPickerOpen(false)}
  sourceUrl={\`/api/lookups/options/${LOOKUP_DEMO_ID}\`}
  allowMultiselect
  pageSize={200}
  onSelect={(normalized, raw) => setLastSelection(raw)}
  title="Select from lookup"
/>`;

export default function PopupPickerDemoPage() {
  useSetLayoutProps({
    title: 'PopupPicker',
    subtitle: 'Searchable modal to select record(s) from API or static items',
    icon: 'List',
  });

  const [isTodosPickerOpen, setTodosPickerOpen] = useState(false);
  const [isStaticPickerOpen, setStaticPickerOpen] = useState(false);
  const [isLookupPickerOpen, setLookupPickerOpen] = useState(false);
  const [lastSelection, setLastSelection] = useState<any[]>([]);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ui/components" className="inline-flex items-center gap-1 hover:text-foreground transition">
          <IconRenderer iconName="Layers" className="h-4 w-4" />
          Components
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">PopupPicker</span>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Remote (Todos API)</h2>
        <p className="text-sm text-muted-foreground">
          PopupPicker with a public API and column mapping.
        </p>
        <div className="flex flex-wrap gap-2">
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
          onSelect={async (_n, raw) => setLastSelection(raw)}
          title="Select Todos"
          description="Data via jsonplaceholder"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Static Items</h2>
        <p className="text-sm text-muted-foreground">
          PopupPicker with static items (no network).
        </p>
        <div className="flex flex-wrap gap-2">
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
          onSelect={async (_n, raw) => setLastSelection(raw)}
          title="Select Items"
          description="Using sample static items"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Lookup options</h2>
        <p className="text-sm text-muted-foreground">
          PopupPicker with lookup options API (same as lookup_test.http). Uses{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/lookups/options/{LOOKUP_DEMO_ID}</code>.
          Requires auth and tenant context (e.g. logged in, tenant/domain headers).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setLookupPickerOpen(true)}>
            Open Lookup Picker
          </Button>
          <Button type="button" variant="outline" onClick={() => setLastSelection([])}>
            Clear Last Selection
          </Button>
        </div>
        <div className="grid gap-3">
          <CodeViewer title="Usage" programmingLanguage="tsx" code={lookupPickerUsageCode} />
        </div>
        <PopupPicker
          isOpen={isLookupPickerOpen}
          onClose={() => setLookupPickerOpen(false)}
          sourceUrl={`/api/lookups/options/${LOOKUP_DEMO_ID}`}
          allowMultiselect
          pageSize={200}
          onSelect={async (_n, raw) => setLastSelection(raw)}
          title="Select from lookup"
          description="Options from lookup_test.http lookup ID"
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Last Selection (Raw)</h3>
        <div
          className={cn(
            'rounded-xl border p-4 text-xs overflow-auto font-mono bg-muted/30',
            lastSelection.length ? 'border-border' : 'border-dashed'
          )}
        >
          {lastSelection.length ? (
            <pre className="m-0 whitespace-pre-wrap">{JSON.stringify(lastSelection, null, 2)}</pre>
          ) : (
            <span className="text-muted-foreground">No selection yet.</span>
          )}
        </div>
      </section>
    </div>
  );
}
