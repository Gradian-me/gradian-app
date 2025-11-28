'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Settings, Building2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { FormSchema } from '@/gradian-ui/schema-manager/types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

interface GraphSidebarProps {
  systemSchemas: FormSchema[];
  businessSchemas: FormSchema[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAddSchema?: (schema: FormSchema) => void;
}

export function GraphSidebar(props: GraphSidebarProps) {
  const { systemSchemas, businessSchemas, loading, refreshing, onRefresh, onAddSchema } = props;
  const [search, setSearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filter = (items: FormSchema[]) =>
    items.filter((schema) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const pluralName = (schema.plural_name ?? '').toString().toLowerCase();
      const singularName = (schema.singular_name ?? schema.name ?? '').toString().toLowerCase();
      const id = (schema.id ?? '').toString().toLowerCase();
      return pluralName.includes(q) || singularName.includes(q) || id.includes(q);
    });

  const filteredSystem = useMemo(() => filter(systemSchemas), [systemSchemas, search]);
  const filteredBusiness = useMemo(() => filter(businessSchemas), [businessSchemas, search]);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, schema: FormSchema) => {
    event.dataTransfer.setData(
      'application/x-graph-schema',
      JSON.stringify({ schemaId: schema.id, name: schema.name }),
    );
    event.dataTransfer.effectAllowed = 'copyMove';
  };

  if (!isMounted) {
    // Render a minimal, non-interactive shell on the server to avoid Radix ID hydration mismatches
    return (
      <div className="flex h-full flex-col rounded-xl bg-gradient-to-b from-background/80 via-muted/40 to-background px-1 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-black/5 px-2 py-1.5 dark:bg-white/5">
          <div className="h-7 flex-1 rounded-md bg-black/10 dark:bg-white/10" />
          <div className="h-7 w-7 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-6 w-3/4 rounded-md bg-black/5 dark:bg-white/5" />
          <div className="h-32 rounded-xl bg-black/5 dark:bg-white/5" />
          <div className="h-6 w-3/4 rounded-md bg-black/5 dark:bg-white/5" />
          <div className="h-32 rounded-xl bg-black/5 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-400 bg-gradient-to-b from-background/80 via-muted/40 to-background px-1 py-2 dark:border-gray-700">
      <div className="flex items-center gap-2 rounded-lg bg-black/5 px-2 py-1.5 dark:bg-white/5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schemas..."
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          defaultValue={['system', 'business']}
          className="w-full py-2 space-y-3 px-2"
        >
          <AccordionItem value="system" className="border-none">
            <AccordionTrigger className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-black/8 dark:bg-white/5 dark:hover:bg-white/10">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="truncate">System Schemas ({filteredSystem.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <div className="space-y-1.5 pb-1 px-2">
                {filteredSystem.map((schema) => (
                  <div
                    key={schema.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, schema)}
                    className="cursor-grab rounded-xl bg-gray-50 dark:bg-gray-700 px-2.5 py-1.5 text-[11px] text-foreground shadow-sm ring-1 ring-violet-500/20 transition-colors hover:bg-violet-500/15 hover:ring-violet-500/30 active:cursor-grabbing"
                    title={schema.description ?? schema.plural_name ?? schema.singular_name ?? schema.id}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[10px] font-medium uppercase text-violet-700 dark:bg-violet-500/20 dark:text-violet-100">
                        {schema.icon ? (
                          <IconRenderer iconName={schema.icon} className="h-4 w-4" />
                        ) : (
                          <span>{(schema.plural_name || schema.singular_name || schema.id || '?').slice(0, 2)}</span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[10px] font-medium">
                          {schema.plural_name || schema.singular_name || schema.name || schema.id}
                        </span>
                      </div>
                      {onAddSchema && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-1 h-5 w-5 shrink-0 rounded-full border border-violet-300 bg-white/90 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:bg-violet-500/20 dark:border-violet-500 dark:text-violet-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onAddSchema(schema);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && filteredSystem.length === 0 && (
                  <p className="px-1 py-2 text-xs text-muted-foreground">No system schemas</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="business" className="border-none">
            <AccordionTrigger className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-black/8 dark:bg-white/5 dark:hover:bg-white/10">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="truncate">Business Schemas ({filteredBusiness.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1">
              <div className="space-y-1.5 pb-1 px-2">
                {filteredBusiness.map((schema) => (
                  <div
                    key={schema.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, schema)}
                    className="cursor-grab rounded-xl bg-gray-50 dark:bg-gray-700 px-2.5 py-1.5 text-[11px] text-foreground shadow-sm ring-1 ring-violet-500/20 transition-colors hover:bg-violet-500/15 hover:ring-violet-500/30 active:cursor-grabbing"
                    title={schema.description ?? schema.plural_name ?? schema.singular_name ?? schema.id}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-[10px] font-medium uppercase text-violet-700 dark:bg-violet-500/20 dark:text-violet-100">
                        {schema.icon ? (
                          <IconRenderer iconName={schema.icon} className="h-4 w-4" />
                        ) : (
                          <span>{(schema.plural_name || schema.singular_name || schema.id || '?').slice(0, 2)}</span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[10px] font-medium">
                          {schema.plural_name || schema.singular_name || schema.name || schema.id}
                        </span>
                      </div>
                      {onAddSchema && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-1 h-5 w-5 shrink-0 rounded-full border border-violet-300 bg-white/90 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:bg-violet-500/20 dark:border-violet-500 dark:text-violet-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onAddSchema(schema);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && filteredBusiness.length === 0 && (
                  <p className="px-1 py-2 text-xs text-muted-foreground">No business schemas</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
    </div>
  );
}


