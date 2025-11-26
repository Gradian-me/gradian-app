'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilRuler, LayoutList, Trash2, Layers, Type } from 'lucide-react';
import { FormSchema } from '../types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';

interface SchemaListViewProps {
  schemas: FormSchema[];
  onEdit: (schema: FormSchema) => void;
  onView: (schema: FormSchema) => void;
  onDelete: (schema: FormSchema) => void;
}

interface SchemaListItemProps {
  schema: FormSchema;
  index: number;
  onEdit: (schema: FormSchema) => void;
  onView: (schema: FormSchema) => void;
  onDelete: (schema: FormSchema) => void;
}

const SchemaListItemComponent = memo(
  ({ schema, index, onEdit, onView, onDelete }: SchemaListItemProps) => {
    const animationDelay = Math.min(
      index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
      UI_PARAMS.CARD_INDEX_DELAY.MAX,
    );
    const isInactive = schema.inactive;
    const sectionCount = schema.sectionsCount ?? schema.sections?.length ?? 0;
    const fieldCount = schema.fieldsCount ?? schema.fields?.length ?? 0;
    const showSections = sectionCount > 0;
    const showFields = fieldCount > 0;
    const showStats = showSections || showFields;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20, scale: 0.99 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
        whileHover={{
          scale: 1.01,
          transition: { type: 'spring', stiffness: 420, damping: 22 },
        }}
        className={`group relative flex items-center gap-4 overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/80 hover:shadow-lg ${
          isInactive
            ? 'border-gray-200 bg-gray-50/95 dark:border-slate-800/70 dark:bg-slate-900/75 opacity-75'
            : [
                // Light mode
                'border-violet-100/80 bg-gradient-to-r from-violet-50/90 via-white to-indigo-50/80',
                // Dark mode (softer neutral)
                'dark:border-slate-700/80 dark:bg-gradient-to-r dark:from-slate-900/85 dark:via-slate-900/80 dark:to-zinc-900/80',
              ].join(' ')
        }`}
      >
        {!isInactive && (
          <div
            className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, rgba(148,163,184,0.30) 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
        )}
        <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0">
          {schema.icon && (
            <IconRenderer
              iconName={schema.icon}
              className={`h-8 w-8 shrink-0 ${
                isInactive ? 'text-gray-400' : 'text-violet-600 dark:text-violet-300'
              }`}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className={`text-base font-semibold truncate ${
                  isInactive
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {schema.plural_name}
              </h3>
              {isInactive && (
                <Badge className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-600">
                  Inactive
                </Badge>
              )}
            </div>
            {schema.description && (
              <p
                className={`text-sm line-clamp-1 ${
                  isInactive
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {schema.description}
              </p>
            )}
            {showStats && (
              <div
                className={`flex items-center gap-4 mt-2 text-xs ${
                  isInactive
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {showSections && (
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{sectionCount} Sections</span>
                  </div>
                )}
                {showFields && (
                  <div className="flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5" />
                    <span>{fieldCount} Fields</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="relative z-10 flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(schema)}
            className="h-8 w-8 rounded-full text-gray-500 hover:text-violet-700 hover:bg-violet-50/80 dark:text-gray-400 dark:hover:text-violet-200 dark:hover:bg-violet-500/10"
            title="View List"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(schema)}
            className="h-8 w-8 rounded-full text-gray-500 hover:text-violet-700 hover:bg-violet-50/80 dark:text-gray-400 dark:hover:text-violet-200 dark:hover:bg-violet-500/10"
            title="Edit Schema"
          >
            <PencilRuler className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(schema)}
            className="h-8 w-8 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50/80"
            title="Delete Schema"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  },
);

SchemaListItemComponent.displayName = 'SchemaListItemComponent';

export function SchemaListView({ schemas, onEdit, onView, onDelete }: SchemaListViewProps) {
  return (
    <div className="space-y-3">
      {schemas.map((schema, index) => (
        <SchemaListItemComponent
          key={schema.id}
          schema={schema}
          index={index}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

