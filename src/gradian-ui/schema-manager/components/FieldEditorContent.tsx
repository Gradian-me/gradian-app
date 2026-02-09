'use client';

import { useState, useEffect } from 'react';
// Button import for DialogFooter buttons
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextInput, NameInput, NumberInput, Switch, Select, ButtonMinimal } from '@/gradian-ui/form-builder/form-elements';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Trash2 } from 'lucide-react';
import { FormField, FormSection } from '../types/form-schema';
import { FIELD_TYPES, ROLES } from '../constants';
import {
  getDefaultLanguage,
  getT,
  resolveFromTranslationsArray,
  isTranslationArray,
  recordToTranslationArray,
} from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

interface FieldEditorContentProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  sections: FormSection[];
}

export function FieldEditorContent({ field, onUpdate, onDelete, sections }: FieldEditorContentProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [tempField, setTempField] = useState(field);
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const unnamedField = getT(TRANSLATION_KEYS.FIELD_UNNAMED, language, defaultLang);
  const labelInactive = getT(TRANSLATION_KEYS.LABEL_INACTIVE, language, defaultLang);
  const tooltipEdit = getT(TRANSLATION_KEYS.FIELD_TOOLTIP_EDIT, language, defaultLang);
  const tooltipDelete = getT(TRANSLATION_KEYS.FIELD_TOOLTIP_DELETE, language, defaultLang);
  const editFieldTitle = getT(TRANSLATION_KEYS.FIELD_EDIT_TITLE, language, defaultLang);
  const editFieldDesc = getT(TRANSLATION_KEYS.FIELD_DESCRIPTION_DIALOG, language, defaultLang);
  const labelFieldLabel = getT(TRANSLATION_KEYS.FIELD_LABEL_LABEL, language, defaultLang);
  const placeholderFieldLabel = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_LABEL, language, defaultLang);
  const labelFieldName = getT(TRANSLATION_KEYS.FIELD_LABEL_NAME, language, defaultLang);
  const labelComponent = getT(TRANSLATION_KEYS.FIELD_LABEL_COMPONENT, language, defaultLang);
  const labelSection = getT(TRANSLATION_KEYS.FIELD_LABEL_SECTION, language, defaultLang);
  const labelPlaceholder = getT(TRANSLATION_KEYS.FIELD_LABEL_PLACEHOLDER, language, defaultLang);
  const labelRole = getT(TRANSLATION_KEYS.FIELD_LABEL_ROLE, language, defaultLang);
  const labelRoleColor = getT(TRANSLATION_KEYS.FIELD_LABEL_ROLE_COLOR, language, defaultLang);
  const buttonSaveChanges = getT(TRANSLATION_KEYS.FIELD_LABEL_SAVE_CHANGES, language, defaultLang);
  const buttonSave = getT(TRANSLATION_KEYS.BUTTON_SAVE, language, defaultLang);
  const buttonCancel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const optionNone = getT(TRANSLATION_KEYS.LABEL_NONE, language, defaultLang);
  const labelAddToReferenceMetadata = getT(TRANSLATION_KEYS.FIELD_LABEL_ADD_TO_REFERENCE_METADATA, language, defaultLang);
  const labelColumnSpan = getT(TRANSLATION_KEYS.DETAIL_LABEL_COLUMN_SPAN, language, defaultLang);
  const labelOrder = getT(TRANSLATION_KEYS.FIELD_LABEL_ORDER, language, defaultLang);
  const labelRequired = getT(TRANSLATION_KEYS.FIELD_LABEL_REQUIRED, language, defaultLang);
  const labelDisabled = getT(TRANSLATION_KEYS.FIELD_LABEL_DISABLED, language, defaultLang);
  const labelReadonly = getT(TRANSLATION_KEYS.FIELD_LABEL_READONLY, language, defaultLang);
  const labelCanCopy = getT(TRANSLATION_KEYS.FIELD_LABEL_CAN_COPY, language, defaultLang);
  const optionDefault = getT(TRANSLATION_KEYS.FIELD_OPTION_DEFAULT, language, defaultLang);
  const optionSecondary = getT(TRANSLATION_KEYS.FIELD_OPTION_SECONDARY, language, defaultLang);
  const optionOutline = getT(TRANSLATION_KEYS.FIELD_OPTION_OUTLINE, language, defaultLang);
  const optionDestructive = getT(TRANSLATION_KEYS.FIELD_OPTION_DESTRUCTIVE, language, defaultLang);
  const optionGradient = getT(TRANSLATION_KEYS.FIELD_OPTION_GRADIENT, language, defaultLang);
  const optionSuccess = getT(TRANSLATION_KEYS.FIELD_OPTION_SUCCESS, language, defaultLang);
  const optionWarning = getT(TRANSLATION_KEYS.FIELD_OPTION_WARNING, language, defaultLang);
  const optionInfo = getT(TRANSLATION_KEYS.FIELD_OPTION_INFO, language, defaultLang);
  const optionMuted = getT(TRANSLATION_KEYS.FIELD_OPTION_MUTED, language, defaultLang);

  useEffect(() => {
    setTempField(field);
  }, [field]);

  const handleSave = () => {
    onUpdate(tempField);
    setShowDialog(false);
  };

  return (
    <>
      <Card className={`w-full border hover:shadow-sm transition-all duration-200 ${
        field.inactive 
          ? 'border-gray-300 bg-gray-50 opacity-60' 
          : 'border-gray-200'
      }`}>
        <div className="w-full flex items-center justify-between p-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-medium truncate ${
                field.inactive ? 'text-gray-500' : 'text-gray-800'
              }`}>
                {field.label || unnamedField}
              </span>
              {field.inactive && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-600">
                  {labelInactive}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{field.component}</Badge>
              {field.role && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200">
                  {field.role}
                </Badge>
              )}
              {field.targetSchema && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                  {field.targetSchema}
                </Badge>
              )}
              {field.validation?.required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>}
            </div>
            <span className={`text-[10px] truncate block mt-0.5 ${
              field.inactive ? 'text-gray-400' : 'text-gray-400'
            }`}>
              {field.name}
            </span>
          </div>
          <div className="flex gap-0.5 ms-2 shrink-0">
            <ButtonMinimal
              icon={Edit}
              title={tooltipEdit}
              color="violet"
              size="md"
              onClick={() => setShowDialog(true)}
            />
            <ButtonMinimal
              icon={Trash2}
              title={tooltipDelete}
              color="red"
              size="md"
              onClick={onDelete}
            />
          </div>
        </div>
      </Card>

      {/* Field Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-full h-full lg:max-w-4xl lg:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editFieldTitle}</DialogTitle>
            <DialogDescription>
              {editFieldDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                config={{ name: 'field-label', label: labelFieldLabel, placeholder: placeholderFieldLabel }}
                value={
                  tempField.translations ??
                  (tempField.label
                    ? recordToTranslationArray({ [defaultLang]: tempField.label })
                    : [])
                }
                onChange={(value) => {
                  if (isTranslationArray(value)) {
                    setTempField({
                      ...tempField,
                      translations: value,
                      label:
                        resolveFromTranslationsArray(value, defaultLang, defaultLang) || tempField.label || '',
                    });
                  } else if (typeof value === 'string') {
                    setTempField({ ...tempField, label: value });
                  }
                }}
                allowTranslation
                language={language}
                defaultLanguage={defaultLang}
              />
              <NameInput
                config={{ name: 'field-name', label: labelFieldName, placeholder: placeholderFieldLabel }}
                value={tempField.name || ''}
                onChange={(value) => setTempField({ ...tempField, name: value })}
                isCustomizable={false}
              />
            </div>
            <Select
              config={{ name: 'field-component', label: labelComponent }}
              value={tempField.component}
              onValueChange={(value) => setTempField({ ...tempField, component: value as any })}
              options={[...FIELD_TYPES]}
              sortType="ASC"
            />
            <Select
              config={{ name: 'field-section', label: labelSection }}
              value={tempField.sectionId}
              onValueChange={(value) => setTempField({ ...tempField, sectionId: value })}
              options={sections.map((s) => ({ value: s.id, label: s.title }))}
            />
            <TextInput
              config={{ name: 'field-placeholder', label: labelPlaceholder }}
              value={
                tempField.placeholderTranslations ??
                (tempField.placeholder
                  ? recordToTranslationArray({ [defaultLang]: tempField.placeholder })
                  : [])
              }
              onChange={(value) => {
                if (isTranslationArray(value)) {
                  setTempField({
                    ...tempField,
                    placeholderTranslations: value,
                    placeholder:
                      resolveFromTranslationsArray(value, defaultLang, defaultLang) || tempField.placeholder || '',
                  });
                } else if (typeof value === 'string') {
                  setTempField({ ...tempField, placeholder: value });
                }
              }}
              allowTranslation
              language={language}
              defaultLanguage={defaultLang}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                config={{ name: 'field-role', label: labelRole, placeholder: placeholderFieldLabel }}
                value={tempField.role || ''}
                onValueChange={(value) => setTempField({ ...tempField, role: value ? (value as any) : undefined })}
                options={[
                  { value: '', label: optionNone },
                  ...ROLES,
                ]}
                sortType="ASC"
              />
              <Select
                config={{ name: 'field-role-color', label: labelRoleColor, placeholder: placeholderFieldLabel }}
                value={tempField.roleColor || ''}
                onValueChange={(value) => setTempField({ ...tempField, roleColor: value ? (value as any) : undefined })}
                options={[
                  { value: '', label: optionDefault },
                  { value: 'default', label: optionDefault },
                  { value: 'secondary', label: optionSecondary },
                  { value: 'outline', label: optionOutline },
                  { value: 'destructive', label: optionDestructive },
                  { value: 'gradient', label: optionGradient },
                  { value: 'success', label: optionSuccess },
                  { value: 'warning', label: optionWarning },
                  { value: 'info', label: optionInfo },
                  { value: 'muted', label: optionMuted },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberInput
                config={{ name: 'field-col-span', label: labelColumnSpan }}
                value={tempField.colSpan ?? 1}
                onChange={(value) => setTempField({ ...tempField, colSpan: value === '' ? 1 : Number(value) || 1 })}
                min={1}
                max={4}
              />
              <NumberInput
                config={{ name: 'field-order', label: labelOrder }}
                value={tempField.order ?? 1}
                onChange={(value) => setTempField({ ...tempField, order: value === '' ? 1 : Number(value) || 1 })}
                min={1}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Switch
                config={{ name: `required-${field.id}`, label: labelRequired }}
                value={tempField.validation?.required || false}
                onChange={(checked: boolean) => setTempField({ 
                  ...tempField, 
                  validation: { 
                    ...tempField.validation, 
                    required: checked 
                  } 
                })}
              />
              <Switch
                config={{ name: `disabled-${field.id}`, label: labelDisabled }}
                value={tempField.disabled || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, disabled: checked })}
              />
              <Switch
                config={{ name: `readonly-${field.id}`, label: labelReadonly }}
                value={tempField.readonly || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, readonly: checked })}
              />
              <Switch
                config={{ name: `can-copy-${field.id}`, label: labelCanCopy }}
                value={tempField.canCopy || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, canCopy: checked })}
              />
              <Switch
                config={{ name: `addToReferenceMetadata-${field.id}`, label: labelAddToReferenceMetadata }}
                value={tempField.addToReferenceMetadata || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, addToReferenceMetadata: checked })}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto text-xs">
              {buttonCancel}
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto text-xs">
              <span className="hidden md:inline">{buttonSaveChanges}</span>
              <span className="md:hidden">{buttonSave}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

