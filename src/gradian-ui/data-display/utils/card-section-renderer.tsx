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
      <div className="text-gray-500 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-gray-600 pb-1 mb-2">
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
                                      
                                      // For dynamic fields, use targetSchema from the enriched value item (from relation)
                                      // This is the resolved targetSchema from /api/relations, not the template
                                      // Check normalized, original, and direct item properties
                                      let targetSchema: string | undefined = 
                                        item.normalized?.targetSchema || 
                                        (item.original as any)?.targetSchema ||
                                        (item as any).targetSchema;
                                      
                                      // Fallback to field.targetSchema if not available in item (for non-relation cases)
                                      if (!targetSchema) {
                                        const rawTargetSchema = field.targetSchema!;
                                        
                                        // Resolve dynamic targetSchema (e.g., "{{formData.resourceType}}") using data
                                        // The data contains the formData values, so we can use it to resolve templates
                                        const { replaceDynamicContext } = require('../../form-builder/utils/dynamic-context-replacer');
                                        targetSchema = replaceDynamicContext(rawTargetSchema, { formSchema: schema, formData: data });
                                        
                                        // Skip if still contains unresolved templates
                                        if (targetSchema && typeof targetSchema === 'string' && targetSchema.includes('{{') && targetSchema.includes('}}')) {
                                          console.warn('[renderCardSection] Could not resolve targetSchema template:', rawTargetSchema);
                                          return;
                                        }
                                      }
                                      
                                      // Ensure we have a valid targetSchema before navigating
                                      if (!targetSchema || targetSchema.trim() === '') {
                                        console.warn('[renderCardSection] Empty targetSchema for item:', item);
                                        return;
                                      }
                                      
                                      onBadgeNavigate?.(targetSchema.trim(), itemId);
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

