'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsUp } from 'lucide-react';
import { FormSection, FormField } from '../types/form-schema';
import { AddButtonFull, Switch } from '@/gradian-ui/form-builder/form-elements';
import { SortableSection } from './SortableSection';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface SectionsTabProps {
  sections: FormSection[];
  getFieldsForSection: (sectionId: string) => FormField[];
  expandedSection: string | null;
  onToggleSection: (sectionId: string) => void;
  onAddSection: () => void;
  onUpdateSection: (sectionId: string, updates: Partial<FormSection>) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddField: (sectionId: string) => void; // Parent expects sectionId, but we'll make it work with optional
  onFieldUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onFieldDelete: (fieldId: string) => void;
  onSectionDragEnd: (event: DragEndEvent) => void;
  onFieldDragEnd: (event: DragEndEvent, sectionId: string) => void;
  onCollapseAll: () => void;
  currentSchemaId?: string;
  config?: any;
}

export function SectionsTab({
  sections,
  getFieldsForSection,
  expandedSection,
  onToggleSection,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onAddField,
  onFieldUpdate,
  onFieldDelete,
  onSectionDragEnd,
  onFieldDragEnd,
  onCollapseAll,
  currentSchemaId,
  config
}: SectionsTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure sections is always an array
  const safeSections = sections || [];

  // Check if a section is incomplete (has default values or missing required fields)
  const isSectionIncomplete = (section: FormSection): boolean => {
    // If it's still the default "New Section", it's incomplete
    if (section.title === 'New Section' || !section.title || section.title.trim() === '') {
      return true;
    }
    
    // If the name has been changed but:
    // - It has no fields AND
    // - It's not a repeating section
    // Then it's incomplete
    const fields = getFieldsForSection(section.id);
    const hasNoFields = fields.length === 0;
    const isNotRepeating = !section.isRepeatingSection;
    
    return hasNoFields && isNotRepeating;
  };

  // Check if there are any incomplete sections
  const hasIncompleteSections = safeSections.some(isSectionIncomplete);
  
  // Check if there are any inactive sections
  const hasInactiveSections = useMemo(() => safeSections.some(s => s.inactive), [safeSections]);
  const [showInactiveSections, setShowInactiveSections] = useState(false);
  
  // Calculate section count based on showInactiveSections
  const sectionsCount = useMemo(() => {
    return showInactiveSections 
      ? safeSections.length 
      : safeSections.filter(s => !s.inactive).length;
  }, [safeSections, showInactiveSections]);
  
  // Get sections to display
  const sectionsToDisplay = useMemo(() => {
    return showInactiveSections 
      ? safeSections 
      : safeSections.filter(s => !s.inactive);
  }, [safeSections, showInactiveSections]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {hasInactiveSections && (
              <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg px-3 h-8">
                <Switch
                  config={{ 
                    name: 'show-inactive-sections', 
                    label: 'Show Inactive'
                  }}
                  checked={showInactiveSections}
                  onChange={setShowInactiveSections}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Sections & Fields</CardTitle>
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-100">
                {sectionsCount}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCollapseAll} className="text-gray-600 dark:text-gray-300">
            <ChevronsUp className="h-4 w-4 me-1" />
            Collapse all
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onSectionDragEnd}
        >
          <SortableContext
            items={sectionsToDisplay.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {sectionsToDisplay.map((section, index) => {
                  const fields = getFieldsForSection(section.id).filter(f => !f.inactive);
                  const sectionIsIncomplete = isSectionIncomplete(section);
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.05,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                      layout
                    >
                      <SortableSection
                        section={section}
                        isExpanded={expandedSection === section.id}
                        onToggle={() => onToggleSection(section.id)}
                        onDelete={() => onDeleteSection(section.id)}
                        onUpdate={(updates) => onUpdateSection(section.id, updates)}
                        fields={fields}
                        sections={safeSections}
                        onAddField={(sectionId) => onAddField(sectionId || section.id)}
                        onFieldUpdate={onFieldUpdate}
                        onFieldDelete={onFieldDelete}
                        onFieldMove={(fieldId, direction) => {
                          const sectionFields = fields.sort((a, b) => (a.order || 0) - (b.order || 0));
                          const currentIndex = sectionFields.findIndex(f => f.id === fieldId);
                          if (direction === 'up' && currentIndex > 0) {
                            const newIndex = currentIndex - 1;
                            const reordered = [...sectionFields];
                            [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];
                            reordered.forEach((field, idx) => {
                              onFieldUpdate(field.id, { order: idx + 1 });
                            });
                          } else if (direction === 'down' && currentIndex < sectionFields.length - 1) {
                            const newIndex = currentIndex + 1;
                            const reordered = [...sectionFields];
                            [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];
                            reordered.forEach((field, idx) => {
                              onFieldUpdate(field.id, { order: idx + 1 });
                            });
                          }
                        }}
                        onFieldDragEnd={(e) => onFieldDragEnd(e, section.id)}
                        config={config}
                        currentSchemaId={currentSchemaId}
                        isIncomplete={sectionIsIncomplete}
                      >
                        <div />
                      </SortableSection>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <AddButtonFull
                label="Add Section"
                onClick={onAddSection}
                iconSize="w-4 h-4"
                textSize="text-xs sm:text-sm"
                className="px-3 py-2 rounded-xl"
                disabled={hasIncompleteSections}
              />
              {hasIncompleteSections && (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                  <span className="text-amber-600">⚠</span>
                  <span>Please complete the configuration for the new section before adding another section.</span>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}

