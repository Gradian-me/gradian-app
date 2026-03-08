'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextInput, Textarea, AddButtonFull } from '@/gradian-ui/form-builder/form-elements';
import { getT, getDefaultLanguage, resolveFromTranslationsArray, isTranslationArray } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import type { FormWizard } from '../types/form-schema';
import { generateSchemaId } from '../utils/schema-form';
import { Pencil, Trash2 } from 'lucide-react';

interface WizardsTabProps {
  wizards: FormWizard[];
  onUpdate: (wizards: FormWizard[]) => void;
}

export function WizardsTab({ wizards, onUpdate }: WizardsTabProps) {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const safeWizards = wizards ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempWizard, setTempWizard] = useState<FormWizard | null>(null);
  const wizardIdSeed = useRef(0);

  const labelAddWizard = getT(TRANSLATION_KEYS.SCHEMA_LABEL_ADD_WIZARD, language, defaultLang);
  const sectionLabelTitle = getT(TRANSLATION_KEYS.SECTION_LABEL_TITLE, language, defaultLang);
  const sectionLabelDesc = getT(TRANSLATION_KEYS.SECTION_LABEL_DESCRIPTION, language, defaultLang);
  const buttonCancel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const buttonSave = getT(TRANSLATION_KEYS.BUTTON_SAVE, language, defaultLang);

  const handleAdd = () => {
    wizardIdSeed.current += 1;
    const newWizard: FormWizard = {
      id: `wizard-${safeWizards.length + 1}-${wizardIdSeed.current}`,
      title: [{ [defaultLang]: 'New step' }],
      order: safeWizards.length,
      icon: 'Circle',
    };
    onUpdate([...safeWizards, newWizard]);
    setTempWizard(newWizard);
    setEditingId(newWizard.id);
  };

  const handleEdit = (w: FormWizard) => {
    setTempWizard({ ...w });
    setEditingId(w.id);
  };

  const handleSaveEdit = () => {
    if (!tempWizard) return;
    onUpdate(safeWizards.map((w) => (w.id === tempWizard.id ? tempWizard : w)));
    setTempWizard(null);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setTempWizard(null);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onUpdate(safeWizards.filter((w) => w.id !== id));
    if (editingId === id) {
      setTempWizard(null);
      setEditingId(null);
    }
  };

  const sortedWizards = [...safeWizards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <Card className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/30 overflow-visible">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">
          {getT(TRANSLATION_KEYS.SCHEMA_TAB_WIZARDS, language, defaultLang)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedWizards.map((wizard) => (
          <div
            key={wizard.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 space-y-4"
          >
            {editingId === wizard.id && tempWizard ? (
              <>
                <TextInput
                  config={{ name: 'wizard-title', label: sectionLabelTitle }}
                  value={tempWizard.title}
                  onChange={(value) => {
                    if (isTranslationArray(value)) {
                      setTempWizard((prev) => prev ? { ...prev, title: value } : null);
                    } else if (typeof value === 'string') {
                      setTempWizard((prev) => prev ? { ...prev, title: [{ [defaultLang]: value }] } : null);
                    }
                  }}
                  allowTranslation
                  language={language}
                  defaultLanguage={defaultLang}
                />
                <Textarea
                  config={{ name: 'wizard-description', label: sectionLabelDesc }}
                  value={Array.isArray(tempWizard.description) ? tempWizard.description : (tempWizard.description ? [{ [defaultLang]: String(tempWizard.description) }] : [])}
                  onChange={(value) => {
                    if (isTranslationArray(value)) {
                      setTempWizard((prev) => prev ? { ...prev, description: value } : null);
                    } else if (typeof value === 'string') {
                      setTempWizard((prev) => prev ? { ...prev, description: [{ [defaultLang]: value }] } : null);
                    }
                  }}
                  allowTranslation
                  language={language}
                  defaultLanguage={defaultLang}
                  rows={2}
                />
                <TextInput
                  config={{ name: 'wizard-icon', label: 'Icon (Lucide name)' }}
                  value={tempWizard.icon ?? ''}
                  onChange={(v) => setTempWizard((prev) => prev ? { ...prev, icon: typeof v === 'string' ? v : '' } : null)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    {buttonCancel}
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    {buttonSave}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {resolveFromTranslationsArray(wizard.title, language, defaultLang) || wizard.id}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(wizard)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(wizard.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        <AddButtonFull
          label={labelAddWizard}
          onClick={handleAdd}
          iconSize="w-4 h-4"
          textSize="text-xs"
          className="px-3 py-2 rounded-xl"
        />
      </CardContent>
    </Card>
  );
}
