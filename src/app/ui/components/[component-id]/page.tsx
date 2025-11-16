import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ALL_COMPONENTS } from '@/gradian-ui/shared/components/component-registry';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';

type PageProps = {
  params: Promise<{ 'component-id': string }>;
};

function getComponentById(id: string) {
  return ALL_COMPONENTS.find((c) => c.id === id) || null;
}

function getSampleForComponent(componentId: string): { title: string; language: string; code: string }[] {
  // Basic showcase samples per component; extend as needed
  if (componentId === 'popup-picker') {
    const mapping = `const columnMap = {
  item: { id: 'id', title: 'title', subtitle: 'completed' },
  request: { page: 'page', limit: 'limit', search: 'q', includeIds: 'includeIds', excludeIds: 'excludeIds' },
  response: { data: '' },
} as const`;

    const usage = `import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';

export default function Example() {
  return (
    <PopupPicker
      isOpen={true}
      onClose={() => {}}
      sourceUrl="https://jsonplaceholder.typicode.com/todos"
      columnMap={columnMap}
      allowMultiselect
      pageSize={200}
      onSelect={(normalized, raw) => {
        console.log(normalized, raw);
      }}
      title="Select Todos"
      description="Data via jsonplaceholder"
    />
  );
}`;
    return [
      { title: 'Mapping Config', language: 'ts', code: mapping },
      { title: 'Usage', language: 'tsx', code: usage },
    ];
  }

  return [];
}

export default async function ComponentDetailPage({ params }: PageProps) {
  const { 'component-id': componentId } = await params;
  const meta = getComponentById(componentId);

  if (!meta) {
    notFound();
  }

  const samples = getSampleForComponent(meta.id);

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 text-white ${meta.color ? `bg-${meta.color}-600` : 'bg-gray-800'}`}>
            {meta.icon ? <IconRenderer iconName={meta.icon} className="h-6 w-6" /> : null}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{meta.label}</h1>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="uppercase">{meta.category}</span>
              <span className="mx-2">•</span>
              <code className="text-xs bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">{meta.id}</code>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/ui/components" className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <IconRenderer iconName="Layers" className="h-4 w-4" />
            Components
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Overview</h2>
          {meta.description ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">{meta.description}</p>
          ) : null}
          {meta.usecase ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Use case:</span> {meta.usecase}
            </p>
          ) : null}
          <div className="text-sm">
            <div className="text-gray-600 dark:text-gray-400 mb-1">Source:</div>
            <code className="text-xs bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded inline-block">{meta.directory}</code>
          </div>
        </div>
        <aside className="space-y-3">
          <h3 className="text-base font-semibold">Inspirations</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li>Real-world usage patterns and UX ideas</li>
            <li>Composable props for flexible deployment</li>
            <li>Performance notes and accessibility considerations</li>
          </ul>
        </aside>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Samples</h2>
        {samples.length ? (
          <div className="grid gap-3">
            {samples.map((s, idx) => (
              <CodeViewer key={idx} title={s.title} programmingLanguage={s.language as any} code={s.code} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">Samples coming soon for this component.</div>
        )}
      </section>
    </div>
  );
}


