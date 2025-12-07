/**
 * Response Annotation Viewer Component
 * Displays ListInputs for each schema's annotations with Apply button
 */

'use client';

import React, { useState } from 'react';
import { ListInput, type AnnotationItem } from '@/gradian-ui/form-builder/form-elements';
import { Button } from '@/components/ui/button';
import { ButtonMinimal } from '@/gradian-ui/form-builder/form-elements';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import type { SchemaAnnotation } from '../types';

interface ResponseAnnotationViewerProps {
  annotations: SchemaAnnotation[];
  onAnnotationsChange: (schemaId: string, annotations: AnnotationItem[]) => void;
  onRemoveSchema: (schemaId: string) => void;
  onApply?: (annotations: SchemaAnnotation[]) => void; // Callback when Apply button is clicked
}

export function ResponseAnnotationViewer({
  annotations,
  onAnnotationsChange,
  onRemoveSchema,
  onApply,
}: ResponseAnnotationViewerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter out schemas with no annotations
  const schemasWithAnnotations = annotations.filter(schema => schema.annotations.length > 0);
  
  if (schemasWithAnnotations.length === 0) {
    return null;
  }

  const totalAnnotations = schemasWithAnnotations.reduce(
    (sum, schema) => sum + schema.annotations.length,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Schema Annotations
        </h3>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 me-2" />
          Apply ({totalAnnotations})
        </Button>
      </div>

      <div className="space-y-6">
        {schemasWithAnnotations.map((schemaAnnotation) => (
          <div
            key={schemaAnnotation.schemaId}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/50 shadow-sm p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {schemaAnnotation.schemaIcon && (
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                    <IconRenderer
                      iconName={schemaAnnotation.schemaIcon}
                      className="h-5 w-5 text-violet-600 dark:text-violet-400"
                    />
                  </div>
                )}
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {schemaAnnotation.schemaLabel}
                </h4>
              </div>
              <ButtonMinimal
                icon={X}
                title="Remove Schema"
                color="red"
                size="sm"
                onClick={() => onRemoveSchema(schemaAnnotation.schemaId)}
              />
            </div>
            <ListInput
              value={schemaAnnotation.annotations}
              onChange={(items) =>
                onAnnotationsChange(schemaAnnotation.schemaId, items)
              }
              placeholder="Enter annotation..."
              addButtonText="Add Annotation"
            />
          </div>
        ))}
      </div>

      {/* Apply Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Annotations Summary</DialogTitle>
            <DialogDescription>
              Review all annotations from {schemasWithAnnotations.length} schema
              {schemasWithAnnotations.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {schemasWithAnnotations.map((schemaAnnotation) => (
              <div
                key={schemaAnnotation.schemaId}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  {schemaAnnotation.schemaIcon && (
                    <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/50">
                      <IconRenderer
                        iconName={schemaAnnotation.schemaIcon}
                        className="h-4 w-4 text-violet-600 dark:text-violet-400"
                      />
                    </div>
                  )}
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {schemaAnnotation.schemaLabel}
                  </h5>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({schemaAnnotation.annotations.length} annotation
                    {schemaAnnotation.annotations.length !== 1 ? 's' : ''})
                  </span>
                </div>
                {schemaAnnotation.annotations.length > 0 ? (
                  <ul className="space-y-2">
                    {schemaAnnotation.annotations.map((annotation, index) => (
                      <li
                        key={annotation.id}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-violet-600 dark:text-violet-400 font-medium shrink-0">
                          {index + 1}.
                        </span>
                        <span>{annotation.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No annotations for this schema
                  </p>
                )}
              </div>
            ))}
            {onApply && (
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => {
                    setIsDialogOpen(false);
                    onApply(schemasWithAnnotations);
                  }}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 me-2" />
                  Apply & Regenerate
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

