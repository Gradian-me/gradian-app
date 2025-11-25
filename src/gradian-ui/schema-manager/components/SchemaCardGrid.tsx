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
import { PencilRuler, LayoutList, Trash2, Layers, Type } from 'lucide-react';
import { FormSchema } from '../types';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';
import { LoadingSkeleton } from '@/gradian-ui/layout/components';

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
  const animationDelay = Math.min(index * UI_PARAMS.CARD_INDEX_DELAY.STEP, UI_PARAMS.CARD_INDEX_DELAY.MAX);
  const isInactive = schema.inactive;
  const sectionCount = schema.sectionsCount ?? schema.sections?.length ?? 0;
  const fieldCount = schema.fieldsCount ?? schema.fields?.length ?? 0;
  const showSections = sectionCount > 0;
  const showFields = fieldCount > 0;
  const showStats = showSections || showFields;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: animationDelay, ease: 'easeOut' }}
    >
      <Card className={`hover:shadow-sm transition-all duration-200 h-full flex flex-col border ${
        isInactive 
          ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 opacity-60' 
          : 'border-gray-200 dark:border-gray-700 dark:bg-gray-900'
      }`}>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {schema.icon && (
                  <IconRenderer 
                    iconName={schema.icon} 
                    className={`h-5 w-5 shrink-0 ${isInactive ? 'text-gray-400' : 'text-violet-600 dark:text-violet-300'}`} 
                  />
                )}
                <CardTitle className={`text-base font-semibold truncate ${
                  isInactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {schema.plural_name}
                </CardTitle>
                {isInactive && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-600">
                    Inactive
                  </Badge>
                )}
              </div>
              {schema.description && (
                <p className={`text-xs line-clamp-1 mt-1 ${
                  isInactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {schema.description}
                </p>
              )}
            </div>
            <div className="flex gap-0.5 ml-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(schema)}
                className="h-7 w-7"
                title="View List"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(schema)}
                className="h-7 w-7"
                title="Edit Schema"
              >
                <PencilRuler className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(schema)}
                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete Schema"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {showStats && (
          <CardContent className="pt-2 px-4 pb-4">
            <div
              className={`flex items-center gap-4 text-xs ${
                isInactive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
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
          </CardContent>
        )}
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
    <LoadingSkeleton
      variant="card"
      count={count}
      columns={{ default: 1, md: 2, lg: 3 }}
      gap={6}
    />
  );
}
