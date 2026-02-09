'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PencilRuler, LayoutList, Trash2 } from 'lucide-react';
import { FormSchema } from '../types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { UI_PARAMS } from '@/gradian-ui/shared/configs/ui-config';
import { LoadingSkeleton } from '@/gradian-ui/layout/components';
import { getDefaultLanguage, getT } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { useLanguageStore } from '@/stores/language.store';
import { getSchemaTranslatedPluralName, getSchemaTranslatedDescription } from '../utils/schema-utils';

interface SchemaCardGridProps {
  schemas: FormSchema[];
  onEdit: (schema: FormSchema) => void;
  onView: (schema: FormSchema) => void;
  onDelete: (schema: FormSchema) => void;
}

interface SchemaCardProps {
  schema: FormSchema;
  index: number;
  onEdit: (schema: FormSchema) => void;
  onView: (schema: FormSchema) => void;
  onDelete: (schema: FormSchema) => void;
}

interface SchemaCardSkeletonGridProps {
  count?: number;
}

const SchemaCardComponent = memo(({ schema, index, onEdit, onView, onDelete }: SchemaCardProps) => {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const animationDelay = Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX);
  const isInactive = schema.inactive;
  const isActionForm = schema.schemaType === 'action-form';
  const showStats = false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, delay: animationDelay, ease: 'easeOut' }}
      whileHover={{
        scale: 1.01,
        transition: { type: 'spring', stiffness: 420, damping: 22 },
      }}
    >
      <Card
        className={`group relative flex h-full flex-col overflow-hidden border shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/80 hover:shadow-lg ${
          isInactive
            ? 'border-gray-200 bg-gray-50/95 dark:border-slate-800/70 dark:bg-slate-900/75 opacity-75'
            : [
                // Light mode: soft violet gradient
                'border-violet-100/80 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/80',
                // Dark mode: softer neutral (less black)
                'dark:border-slate-700/80 dark:bg-gradient-to-br dark:from-slate-900/85 dark:via-slate-900/80 dark:to-zinc-900/80',
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
        <CardHeader className="relative z-10 pb-3 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {schema.icon && (
                  <IconRenderer 
                    iconName={schema.icon} 
                    className={`h-5 w-5 shrink-0 ${
                      isInactive ? 'text-gray-400' : 'text-violet-600 dark:text-violet-300'
                    }`} 
                  />
                )}
                <CardTitle
                  className={`text-base font-semibold truncate ${
                    isInactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {getSchemaTranslatedPluralName(schema, language, schema.plural_name ?? schema.singular_name ?? schema.id ?? '')}
                </CardTitle>
                {schema.showInNavigation && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    Nav
                  </Badge>
                )}
                {isInactive && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-600">
                    Inactive
                  </Badge>
                )}
              </div>
              {(schema.description || schema.description_translations?.length) && (
                <p className={`text-xs line-clamp-1 mt-1 ${
                  isInactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {getSchemaTranslatedDescription(schema, language, schema.description ?? '')}
                </p>
              )}
            </div>
            <div className="flex gap-0.5 ms-2 shrink-0">
              {!isActionForm && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    // Handle Ctrl/Cmd+click to open in new tab securely
                    if (e.ctrlKey || e.metaKey) {
                      e.preventDefault();
                      window.open(`/page/${schema.id}`, '_blank', 'noopener,noreferrer');
                      return;
                    }
                    // Regular click opens in the current tab via callback
                    onView(schema);
                  }}
                  onMouseDown={(e) => {
                    // Handle middle-click (button 1) to open in new tab
                    if (e.button === 1) {
                      e.preventDefault();
                      window.open(`/page/${schema.id}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  onAuxClick={(e) => {
                    // Fallback for some browsers where middle-click triggers aux click
                    if (e.button === 1) {
                      e.preventDefault();
                      window.open(`/page/${schema.id}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="h-7 w-7 rounded-full text-gray-500 hover:text-violet-700 hover:bg-violet-50/80 dark:text-gray-400 dark:hover:text-violet-200 dark:hover:bg-violet-500/10"
                  title="View List (Ctrl+Click or Middle-Click to open in new tab)"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  // Handle Ctrl/Cmd+click to open schema editor in new tab
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    window.open(`/builder/schemas/${schema.id}`, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  // Regular click uses callback to navigate in current tab
                  onEdit(schema);
                }}
                onMouseDown={(e) => {
                  // Handle middle-click (button 1) to open schema editor in new tab
                  if (e.button === 1) {
                    e.preventDefault();
                    window.open(`/builder/schemas/${schema.id}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                onAuxClick={(e) => {
                  // Fallback for some browsers where middle-click triggers aux click
                  if (e.button === 1) {
                    e.preventDefault();
                    window.open(`/builder/schemas/${schema.id}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="h-7 w-7 rounded-full text-gray-500 hover:text-violet-700 hover:bg-violet-50/80 dark:text-gray-400 dark:hover:bg-violet-500/10 hover:bg-violet-50/80"
                title={getT(TRANSLATION_KEYS.TOOLTIP_EDIT_SCHEMA, language, defaultLang)}
              >
                <PencilRuler className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(schema)}
                className="h-7 w-7 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50/80"
                title="Delete Schema"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {showStats && null}
      </Card>
    </motion.div>
  );
});

SchemaCardComponent.displayName = 'SchemaCardComponent';

export function SchemaCardGrid({ schemas, onEdit, onView, onDelete }: SchemaCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {schemas.map((schema, index) => (
        <SchemaCardComponent
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

export function SchemaCardSkeletonGrid({ count = 6 }: SchemaCardSkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            delay: Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.SKELETON_MAX ?? 0.25),
            ease: 'easeOut',
          }}
        >
          <div className="h-32 rounded-xl border border-violet-100/70 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/70 shadow-sm dark:border-slate-700/80 dark:bg-gradient-to-br dark:from-slate-900/85 dark:via-slate-900/80 dark:to-zinc-900/80 animate-pulse" />
        </motion.div>
      ))}
    </div>
  );
}
