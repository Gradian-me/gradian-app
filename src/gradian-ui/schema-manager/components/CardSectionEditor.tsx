'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TextInput, NameInput, Slider, SortableSelector } from '@/gradian-ui/form-builder/form-elements';
import type { SortableSelectorItem } from '@/gradian-ui/form-builder/form-elements';
import { CardSection } from '../types/form-schema';
import { Pencil } from 'lucide-react';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

interface CardSectionEditorProps {
  section: CardSection;
  availableFields: SortableSelectorItem[];
  selectedFields: SortableSelectorItem[];
  onTitleChange: (value: string) => void;
  onIdChange: (value: string) => void;
  isCustomId: boolean;
  onCustomModeChange: (isCustom: boolean) => void;
  onUpdate: (updates: Partial<CardSection>) => void;
  onFieldSelectionChange: (items: SortableSelectorItem[]) => void;
  onDelete: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  onClose: () => void;
}

export function CardSectionEditor({
  section,
  availableFields,
  selectedFields,
  onTitleChange,
  onIdChange,
  isCustomId,
  onCustomModeChange,
  onUpdate,
  onFieldSelectionChange,
  onDelete,
  onSave,
  saveDisabled,
  onClose,
}: CardSectionEditorProps) {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const msgIdAutoCustomize = getT(TRANSLATION_KEYS.CARD_MSG_ID_AUTO_CUSTOMIZE, language, defaultLang);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Edit Card Section</DialogTitle>
          <DialogDescription>
            Configure the title, layout, and fields displayed in this card section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pe-2">
          <div className="grid gap-4">
            <TextInput
              config={{ name: 'section-title', label: 'Card Section Title' }}
              value={section.title || ''}
              onChange={onTitleChange}
            />
            <NameInput
              config={{
                name: 'section-id',
                label: 'Card Section ID',
                placeholder: 'Auto-generated from title',
              }}
              value={section.id}
              onChange={onIdChange}
              isCustomizable
              customMode={isCustomId}
              onCustomModeChange={onCustomModeChange}
              helperText={
                !isCustomId
                  ? msgIdAutoCustomize
                  : undefined
              }
            />
          </div>

          <div className="grid gap-4">
            <Slider
              config={{ name: 'col-span', label: 'Column Span' }}
              value={section.colSpan || 1}
              onChange={(value: number) => onUpdate({ colSpan: value })}
              min={1}
              max={2}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Number of columns this section spans (1 or 2)
            </p>
          </div>

          <div className="space-y-4">
            {availableFields.length === 0 && selectedFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fields available. Add fields in the Sections & Fields tab first.
              </p>
            ) : (
              <SortableSelector
                availableItems={availableFields}
                selectedItems={selectedFields}
                onChange={onFieldSelectionChange}
                isSortable
                selectedLabel="Selected Fields"
                availableLabel="Available Fields"
                maxHeight="max-h-60"
                emptySelectedMessage="No fields selected. Select fields below to add them."
                emptyAvailableMessage="No fields available. Add fields in the Sections & Fields tab first."
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between w-full">
          <Button variant="ghost" onClick={onDelete} className="text-xs">
            Delete Section
          </Button>
          <Button onClick={onSave} disabled={saveDisabled} className="text-xs">
            Save Section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


