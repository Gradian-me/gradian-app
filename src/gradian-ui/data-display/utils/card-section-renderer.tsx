import React from 'react';
import { motion } from 'framer-motion';
import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '../../shared/utils';
import { resolveFieldById } from '../../form-builder/form-elements/utils/field-resolver';
import { formatFieldValue } from '../table/utils/field-formatters';
import { BadgeViewer } from '../../form-builder/form-elements/utils/badge-viewer';
import { normalizeOptionArray } from '../../form-builder/form-elements/utils/option-normalizer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { CopyContent } from '../../form-builder/form-elements/components/CopyContent';

interface RenderSectionProps {
  section: any;
  schema: FormSchema;
  data: any;
  maxMetrics?: number;
  onBadgeNavigate?: (schemaId: string, entityId: string) => void;
}

/**
 * Render a card section with its fields
 */
export const renderCardSection = ({ section, schema, data, maxMetrics = 3, onBadgeNavigate }: RenderSectionProps): React.ReactNode | null => {
  const fieldIds = section?.fieldIds || [];
  if (fieldIds.length === 0) return null;

  return (
    <div className="space-y-2 mb-1">
      <div className="text-gray-500 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-gray-800 pb-1 mb-2">
        {section?.title || section?.id}
      </div>
      <div className="space-y-2">
        {fieldIds.map((fieldId: string) => {
          const field = resolveFieldById(schema, fieldId);
          if (!field) return null;
          const value = data[field.name];

          const candidateComponents = new Set([
            'select',
            'checkbox',
            'radio',
            'popup-picker',
            'popuppicker',
            'popup-picker-input',
            'picker',
            'pickerinput',
            'combo',
            'multiselect',
            'multi-select'
          ]);

          const componentKey = (field.component || '').toString().toLowerCase();
          const normalizedValues = normalizeOptionArray(value as any);
          const hasOptionLikeValues = normalizedValues.length > 0;
          const hasFieldOptions = Array.isArray((field as any).options) && (field as any).options.length > 0;
          const shouldRenderAsBadges = (candidateComponents.has(componentKey) || field.role === 'badge' || field.role === 'status') &&
            (hasOptionLikeValues || hasFieldOptions || Array.isArray(value));

          if (shouldRenderAsBadges) {
            const valuesHaveColor = normalizedValues.some((opt) => Boolean(opt?.color));
            const allowOptionColor = field.role === 'status';
            const labelText = field?.label || field?.name || 'Badge';
            const isItemClickable = (item: any) => {
              const itemId = item.normalized?.id ?? item.id;
              return Boolean(field.targetSchema && itemId);
            };
            return (
              <motion.div
                key={fieldId}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.2 }}
                className="text-gray-600 dark:text-gray-300"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <TooltipProvider disableHoverableContent>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <BadgeViewer
                              field={field}
                              value={value}
                              maxBadges={(field as any).maxDisplay ?? 5}
                              badgeVariant={field.roleColor || "default"}
                              enforceVariant={!(allowOptionColor && valuesHaveColor)}
                              onBadgeClick={
                                field.targetSchema
                                  ? (item) => {
                                      const itemId = item.normalized?.id ?? item.id;
                                      if (!itemId) return;
                                      onBadgeNavigate?.(field.targetSchema!, itemId);
                                    }
                                  : undefined
                              }
                              isItemClickable={
                                field.targetSchema ? isItemClickable : () => false
                              }
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{labelText}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {(field as any).canCopy && value && value !== '' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <CopyContent content={typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value)} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={fieldId}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.2 }}
              className="text-gray-600 dark:text-gray-300"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  {formatFieldValue(field, value, data, false)}
                </div>
                {(field as any).canCopy && value && value !== '' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <CopyContent content={typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value)} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

