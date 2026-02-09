'use client';

import { useState, useEffect } from 'react';
import { TextInput, NumberInput, Label, Badge, Switch, ButtonMinimal, Select, Slider, NameInput, Textarea } from '@/gradian-ui/form-builder/form-elements';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { FieldEditorProps } from '../types/builder';
import { ROLES } from '../utils/builder-utils';
import { fetchFormComponents } from '../utils/component-registry-client';
import { FormField } from '../types/form-schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toCamelCase } from '@/gradian-ui/shared/utils/text-utils';
import { ComponentConfigEditor } from './ComponentConfigEditor';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export function FieldEditor({
  field,
  onUpdate,
  onDelete,
  sections,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  isIncomplete = false,
}: FieldEditorProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [tempField, setTempField] = useState<Partial<FormField>>(field);
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [isNameCustom, setIsNameCustom] = useState(false);
  const [availableComponents, setAvailableComponents] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [componentsLoading, setComponentsLoading] = useState(true);
  const [componentsError, setComponentsError] = useState<string | null>(null);
  const [isTargetSchemaPickerOpen, setIsTargetSchemaPickerOpen] = useState(false);

  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const unnamedField = getT(TRANSLATION_KEYS.FIELD_UNNAMED, language, defaultLang);
  const labelIncomplete = getT(TRANSLATION_KEYS.FIELD_LABEL_INCOMPLETE, language, defaultLang);
  const labelRequired = getT(TRANSLATION_KEYS.FIELD_LABEL_REQUIRED, language, defaultLang);
  const tooltipEdit = getT(TRANSLATION_KEYS.FIELD_TOOLTIP_EDIT, language, defaultLang);
  const tooltipDelete = getT(TRANSLATION_KEYS.FIELD_TOOLTIP_DELETE, language, defaultLang);
  const editFieldTitle = getT(TRANSLATION_KEYS.FIELD_EDIT_TITLE, language, defaultLang);
  const editFieldDesc = getT(TRANSLATION_KEYS.FIELD_DESCRIPTION_DIALOG, language, defaultLang);
  const labelFieldLabel = getT(TRANSLATION_KEYS.FIELD_LABEL_LABEL, language, defaultLang);
  const placeholderFieldLabel = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_LABEL, language, defaultLang);
  const labelFieldName = getT(TRANSLATION_KEYS.FIELD_LABEL_NAME, language, defaultLang);
  const placeholderAutoName = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_AUTO_NAME, language, defaultLang);
  const helperAutoName = getT(TRANSLATION_KEYS.FIELD_HELPER_AUTO_NAME, language, defaultLang);
  const msgValidLabelRequired = getT(TRANSLATION_KEYS.FIELD_MSG_VALID_LABEL_REQUIRED, language, defaultLang);
  const labelNewField = getT(TRANSLATION_KEYS.FIELD_LABEL_NEW_FIELD, language, defaultLang);
  const labelComponent = getT(TRANSLATION_KEYS.FIELD_LABEL_COMPONENT, language, defaultLang);
  const labelSection = getT(TRANSLATION_KEYS.FIELD_LABEL_SECTION, language, defaultLang);
  const labelPlaceholder = getT(TRANSLATION_KEYS.FIELD_LABEL_PLACEHOLDER, language, defaultLang);
  const placeholderEnterPlaceholder = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_ENTER_PLACEHOLDER, language, defaultLang);
  const labelOrder = getT(TRANSLATION_KEYS.FIELD_LABEL_ORDER, language, defaultLang);
  const placeholderOrder = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_ORDER, language, defaultLang);
  const labelDescription = getT(TRANSLATION_KEYS.FIELD_LABEL_DESCRIPTION, language, defaultLang);
  const placeholderDescription = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_DESCRIPTION, language, defaultLang);
  const labelTargetSchema = getT(TRANSLATION_KEYS.SECTION_LABEL_TARGET_SCHEMA, language, defaultLang);
  const placeholderSelectTargetSchema = getT(TRANSLATION_KEYS.SECTION_PLACEHOLDER_SELECT_TARGET_SCHEMA, language, defaultLang);
  const titleSelectTargetSchema = getT(TRANSLATION_KEYS.FIELD_TITLE_SELECT_TARGET_SCHEMA, language, defaultLang);
  const descSelectTargetSchema = getT(TRANSLATION_KEYS.FIELD_DESC_SELECT_TARGET_SCHEMA, language, defaultLang);
  const labelRole = getT(TRANSLATION_KEYS.FIELD_LABEL_ROLE, language, defaultLang);
  const optionNone = getT(TRANSLATION_KEYS.LABEL_NONE, language, defaultLang);
  const labelRoleColor = getT(TRANSLATION_KEYS.FIELD_LABEL_ROLE_COLOR, language, defaultLang);
  const labelColumnSpan = getT(TRANSLATION_KEYS.DETAIL_LABEL_COLUMN_SPAN, language, defaultLang);
  const labelValidationRules = getT(TRANSLATION_KEYS.FIELD_LABEL_VALIDATION_RULES, language, defaultLang);
  const labelMinLength = getT(TRANSLATION_KEYS.FIELD_LABEL_MIN_LENGTH, language, defaultLang);
  const placeholderMinLength = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_MIN_LENGTH, language, defaultLang);
  const labelMaxLength = getT(TRANSLATION_KEYS.FIELD_LABEL_MAX_LENGTH, language, defaultLang);
  const placeholderMaxLength = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_MAX_LENGTH, language, defaultLang);
  const labelMinValue = getT(TRANSLATION_KEYS.FIELD_LABEL_MIN_VALUE, language, defaultLang);
  const placeholderMinValue = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_MIN_VALUE, language, defaultLang);
  const labelMaxValue = getT(TRANSLATION_KEYS.FIELD_LABEL_MAX_VALUE, language, defaultLang);
  const placeholderMaxValue = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_MAX_VALUE, language, defaultLang);
  const labelPattern = getT(TRANSLATION_KEYS.FIELD_LABEL_PATTERN, language, defaultLang);
  const placeholderPattern = getT(TRANSLATION_KEYS.FIELD_PLACEHOLDER_PATTERN, language, defaultLang);
  const helperPattern = getT(TRANSLATION_KEYS.FIELD_HELPER_PATTERN, language, defaultLang);
  const labelDisabled = getT(TRANSLATION_KEYS.FIELD_LABEL_DISABLED, language, defaultLang);
  const labelReadonly = getT(TRANSLATION_KEYS.FIELD_LABEL_READONLY, language, defaultLang);
  const labelCanCopy = getT(TRANSLATION_KEYS.FIELD_LABEL_CAN_COPY, language, defaultLang);
  const labelInactive = getT(TRANSLATION_KEYS.LABEL_INACTIVE, language, defaultLang);
  const labelAddToReferenceMetadata = getT(TRANSLATION_KEYS.FIELD_LABEL_ADD_TO_REFERENCE_METADATA, language, defaultLang);
  const labelIsSensitive = getT(TRANSLATION_KEYS.FIELD_LABEL_IS_SENSITIVE, language, defaultLang);
  const msgLoadingComponents = getT(TRANSLATION_KEYS.FIELD_MSG_LOADING_COMPONENTS, language, defaultLang);
  const msgErrorLoadingComponents = getT(TRANSLATION_KEYS.FIELD_MSG_ERROR_LOADING_COMPONENTS, language, defaultLang);
  const buttonCancel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const buttonSaveChanges = getT(TRANSLATION_KEYS.FIELD_LABEL_SAVE_CHANGES, language, defaultLang);
  const buttonSave = getT(TRANSLATION_KEYS.BUTTON_SAVE, language, defaultLang);
  const optionDefault = getT(TRANSLATION_KEYS.FIELD_OPTION_DEFAULT, language, defaultLang);
  const optionSecondary = getT(TRANSLATION_KEYS.FIELD_OPTION_SECONDARY, language, defaultLang);
  const optionOutline = getT(TRANSLATION_KEYS.FIELD_OPTION_OUTLINE, language, defaultLang);
  const optionDestructive = getT(TRANSLATION_KEYS.FIELD_OPTION_DESTRUCTIVE, language, defaultLang);
  const optionGradient = getT(TRANSLATION_KEYS.FIELD_OPTION_GRADIENT, language, defaultLang);
  const optionSuccess = getT(TRANSLATION_KEYS.FIELD_OPTION_SUCCESS, language, defaultLang);
  const optionWarning = getT(TRANSLATION_KEYS.FIELD_OPTION_WARNING, language, defaultLang);
  const optionInfo = getT(TRANSLATION_KEYS.FIELD_OPTION_INFO, language, defaultLang);
  const optionMuted = getT(TRANSLATION_KEYS.FIELD_OPTION_MUTED, language, defaultLang);

  // Fetch components from API - rigid access, no fallback
  useEffect(() => {
    const loadComponents = async () => {
      try {
        setComponentsLoading(true);
        setComponentsError(null);
        const components = await fetchFormComponents();
        setAvailableComponents(components);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load components';
        setComponentsError(errorMessage);
        console.error('Failed to load components from component registry:', error);
        // Don't set empty array - keep previous state or show error
      } finally {
        setComponentsLoading(false);
      }
    };

    loadComponents();
  }, []);

  useEffect(() => {
    setTempField(field);
    setNameManuallyEdited(false);
    setIsNameCustom(false);
  }, [field]);

  // Check if the label is invalid (empty, whitespace only, or default "New Field" in any language)
  const isLabelInvalid = !tempField.label || 
                         tempField.label.trim() === '' || 
                         tempField.label.trim() === labelNewField;
  
  // Disable "Save" if label is invalid
  const canSave = !isLabelInvalid;

  const handleSave = () => {
    if (isLabelInvalid) {
      // Prevent save if label is invalid
      return;
    }
    onUpdate(tempField);
    setShowDialog(false);
  };

  const handleLabelChange = (value: string) => {
    const newLabel = value;
    let newName = tempField.name || '';
    
    // Auto-generate name from label if name hasn't been manually edited
    // or if the current name matches the auto-generated name from the old label
    if (!nameManuallyEdited) {
      const autoGeneratedName = toCamelCase(newLabel);
      if (autoGeneratedName) {
        newName = autoGeneratedName;
      }
    }
    
    setTempField({ ...tempField, label: newLabel, name: newName });
  };

  const handleNameChange = (value: string) => {
    setNameManuallyEdited(true);
    setTempField({ ...tempField, name: value });
  };


  return (
    <>
      <div className="w-full flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-medium truncate ${isIncomplete ? 'text-amber-700' : 'text-gray-800 dark:text-gray-200'}`}>
              {field.label || unnamedField}
            </span>
            {isIncomplete && (
              <Badge variant="warning" size="sm" className="text-[10px] px-1.5 py-0">
                {labelIncomplete}
              </Badge>
            )}
            <Badge variant="outline" size="sm" className="text-[10px] px-1.5 py-0">{field.component}</Badge>
            {field.role && (
              <Badge variant="default" size="sm" className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200">
                {field.role}
              </Badge>
            )}
            {field.targetSchema && (
              <Badge variant="outline" size="sm" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                {field.targetSchema}
              </Badge>
            )}
            {field.validation?.required && <Badge variant="danger" size="sm" className="text-[10px] px-1.5 py-0">{labelRequired}</Badge>}
          </div>
          <span className={`text-[10px] truncate block mt-0.5 ${isIncomplete ? 'text-amber-600' : 'text-gray-400 dark:text-gray-300'}`}>
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

      {showDialog && (
        <Dialog open={showDialog} onOpenChange={(open) => !open && setShowDialog(false)}>
          <DialogContent className="w-[95vw] sm:w-full max-w-3xl max-h-[90vh] flex flex-col p-0 rounded-2xl">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <DialogTitle>{editFieldTitle}</DialogTitle>
              <DialogDescription>
                {editFieldDesc}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <TextInput
                    config={{
                      name: 'label',
                      label: labelFieldLabel,
                      type: 'text',
                      placeholder: placeholderFieldLabel
                    }}
                    value={tempField.label || ''}
                    onChange={handleLabelChange}
                    className="h-9"
                  />
                  {isLabelInvalid && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      {msgValidLabelRequired}
                    </p>
                  )}
                </div>
                <NameInput
                  config={{ 
                    name: 'field-name', 
                    label: labelFieldName,
                    placeholder: placeholderAutoName
                  }}
                  value={tempField.name || ''}
                  onChange={handleNameChange}
                  isCustomizable
                  customMode={isNameCustom}
                  onCustomModeChange={(custom) => {
                    setIsNameCustom(custom);
                    if (!custom) {
                      // Reset to auto-generated name when turning customization off
                      const autoGeneratedName = toCamelCase(tempField.label || '');
                      setTempField((current) => ({
                        ...current,
                        name: autoGeneratedName || current?.name || '',
                      }));
                      setNameManuallyEdited(false);
                    }
                  }}
                  customizeDisabled={false}
                  helperText={!isNameCustom ? helperAutoName : undefined}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1.5 block">{labelComponent}</Label>
                  {componentsError ? (
                    <div className="space-y-1.5">
                      <Select
                        value={tempField.component || ''}
                        onValueChange={(value) => {
                          setTempField({ 
                            ...tempField, 
                            component: value as any,
                            componentTypeConfig: undefined 
                          });
                        }}
                        options={availableComponents.map((comp) => ({ value: comp.value, label: comp.label }))}
                        sortType="ASC"
                        disabled={true}
                      />
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {msgErrorLoadingComponents} {componentsError}
                      </p>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={tempField.component || ''}
                        onValueChange={(value) => {
                          // Reset componentTypeConfig when component type changes
                          setTempField({ 
                            ...tempField, 
                            component: value as any,
                            componentTypeConfig: undefined 
                          });
                        }}
                        options={availableComponents.map((comp) => ({ value: comp.value, label: comp.label }))}
                        sortType="ASC"
                        disabled={componentsLoading}
                      />
                      {!componentsLoading && availableComponents.length > 0 && tempField.component && (
                        <p className="text-xs text-gray-500 mt-1.5">
                          {availableComponents.find(c => c.value === tempField.component)?.description || ''}
                        </p>
                      )}
                      {componentsLoading && (
                        <p className="text-xs text-gray-500 mt-1.5">{msgLoadingComponents}</p>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1.5 block">{labelSection}</Label>
                  <Select
                    value={tempField.sectionId || ''}
                    onValueChange={(value) => setTempField({ ...tempField, sectionId: value })}
                    options={sections.map((section) => ({ value: section.id, label: section.title }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <TextInput
                    config={{
                      name: 'placeholder',
                      label: labelPlaceholder,
                      type: 'text',
                      placeholder: placeholderEnterPlaceholder
                    }}
                    value={tempField.placeholder || ''}
                    onChange={(value) => setTempField({ ...tempField, placeholder: value })}
                    className="h-9"
                  />
                </div>
                <div>
                  <NumberInput
                    config={{
                      name: 'order',
                      label: labelOrder,
                      type: 'number',
                      placeholder: placeholderOrder
                    }}
                    value={tempField.order ?? undefined}
                    onChange={(value) => setTempField({ ...tempField, order: value !== null && value !== undefined ? Number(value) : undefined })}
                    className="h-9"
                  />
                </div>
              </div>
              <div>
                <Textarea
                  config={{
                    name: 'description',
                    label: labelDescription,
                    placeholder: placeholderDescription
                  }}
                  value={tempField.description || ''}
                  onChange={(value) => setTempField({ ...tempField, description: value })}
                  rows={3}
                />
              </div>
              {tempField.component === 'picker' && (
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1.5 block">{labelTargetSchema}</Label>
                  <Button
                    variant="outline"
                    onClick={() => setIsTargetSchemaPickerOpen(true)}
                    className="w-full justify-between"
                  >
                    {tempField.targetSchema || placeholderSelectTargetSchema}
                  </Button>
                  <PopupPicker
                    isOpen={isTargetSchemaPickerOpen}
                    onClose={() => setIsTargetSchemaPickerOpen(false)}
                    sourceUrl="/api/schemas?summary=true"
                    selectedIds={tempField.targetSchema ? [tempField.targetSchema] : []}
                    onSelect={async (selections) => {
                      if (selections.length > 0) {
                        setTempField({
                          ...tempField,
                          targetSchema: selections[0].id || undefined,
                        });
                      } else {
                        setTempField({
                          ...tempField,
                          targetSchema: undefined,
                        });
                      }
                      setIsTargetSchemaPickerOpen(false);
                    }}
                    title={titleSelectTargetSchema}
                    description={descSelectTargetSchema}
                    allowMultiselect={false}
                    columnMap={{
                      response: { data: 'data' },
                      item: {
                        id: 'id',
                        label: 'plural_name',
                        title: 'plural_name',
                        name: 'singular_name',
                      },
                    }}
                    sourceColumnRoles={[
                      { column: 'singular_name', role: 'title' },
                      { column: 'description', role: 'description' },
                      { column: 'icon', role: 'icon' },
                    ]}
                    sortType="ASC"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1.5 block">{labelRole}</Label>
                  <Select
                    value={tempField.role || ''}
                    onValueChange={(value) => setTempField({ ...tempField, role: value ? (value as any) : undefined })}
                    options={[
                      { value: '', label: optionNone },
                      ...ROLES.map((role) => ({ value: role.value, label: role.label }))
                    ]}
                    sortType="ASC"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-1.5 block">{labelRoleColor}</Label>
                  <Select
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
              </div>
              <div>
                <Slider
                  config={{
                    name: 'colSpan',
                    label: labelColumnSpan,
                  }}
                  value={tempField.colSpan || 1}
                  onChange={(value) => setTempField({ ...tempField, colSpan: value })}
                  min={1}
                  max={4}
                  step={1}
                />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">{labelValidationRules}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <NumberInput
                      config={{
                        name: 'minLength',
                        label: labelMinLength,
                        type: 'number',
                        placeholder: placeholderMinLength
                      }}
                      value={tempField.validation?.minLength ?? undefined}
                      onChange={(value) => setTempField({
                        ...tempField,
                        validation: {
                          ...tempField.validation,
                          minLength: value !== null && value !== undefined ? Number(value) : undefined,
                        }
                      })}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div>
                    <NumberInput
                      config={{
                        name: 'maxLength',
                        label: labelMaxLength,
                        type: 'number',
                        placeholder: placeholderMaxLength
                      }}
                      value={tempField.validation?.maxLength ?? undefined}
                      onChange={(value) => setTempField({
                        ...tempField,
                        validation: {
                          ...tempField.validation,
                          maxLength: value !== null && value !== undefined ? Number(value) : undefined,
                        }
                      })}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div>
                    <NumberInput
                      config={{
                        name: 'min',
                        label: labelMinValue,
                        type: 'number',
                        placeholder: placeholderMinValue
                      }}
                      value={tempField.validation?.min ?? undefined}
                      onChange={(value) => setTempField({
                        ...tempField,
                        validation: {
                          ...tempField.validation,
                          min: value !== null && value !== undefined ? Number(value) : undefined,
                        }
                      })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <NumberInput
                      config={{
                        name: 'max',
                        label: labelMaxValue,
                        type: 'number',
                        placeholder: placeholderMaxValue
                      }}
                      value={tempField.validation?.max ?? undefined}
                      onChange={(value) => setTempField({
                        ...tempField,
                        validation: {
                          ...tempField.validation,
                          max: value !== null && value !== undefined ? Number(value) : undefined,
                        }
                      })}
                      className="h-9"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextInput
                      config={{
                        name: 'pattern',
                        label: labelPattern,
                        type: 'text',
                        placeholder: placeholderPattern
                      }}
                      value={typeof tempField.validation?.pattern === 'string' ? tempField.validation.pattern : ''}
                      onChange={(value) => setTempField({
                        ...tempField,
                        validation: {
                          ...tempField.validation,
                          pattern: value || undefined,
                        }
                      })}
                      className="h-9"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {helperPattern}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Switch
                  config={{ name: `required-${field.id}`, label: labelRequired }}
                  checked={tempField.validation?.required || false}
                  onChange={(checked) => setTempField({ 
                    ...tempField, 
                    validation: { 
                      ...tempField.validation, 
                      required: checked 
                    } 
                  })}
                />
                <Switch
                  config={{ name: `disabled-${field.id}`, label: labelDisabled }}
                  checked={tempField.disabled || false}
                  onChange={(checked) => setTempField({ ...tempField, disabled: checked })}
                />
                <Switch
                  config={{ name: `readonly-${field.id}`, label: labelReadonly }}
                  checked={tempField.readonly || false}
                  onChange={(checked) => setTempField({ ...tempField, readonly: checked })}
                />
                <Switch
                  config={{ name: `canCopy-${field.id}`, label: labelCanCopy }}
                  checked={tempField.canCopy || false}
                  onChange={(checked) => setTempField({ ...tempField, canCopy: checked })}
                />
                <Switch
                  config={{ name: `inactive-${field.id}`, label: labelInactive }}
                  checked={tempField.inactive || false}
                  onChange={(checked) => setTempField({ ...tempField, inactive: checked })}
                />
                <Switch
                  config={{ name: `addToReferenceMetadata-${field.id}`, label: labelAddToReferenceMetadata }}
                  checked={tempField.addToReferenceMetadata || false}
                  onChange={(checked) => setTempField({ ...tempField, addToReferenceMetadata: checked })}
                />
                <Switch
                  config={{ name: `isSensitive-${field.id}`, label: labelIsSensitive }}
                  checked={tempField.isSensitive || false}
                  onChange={(checked) => setTempField({ ...tempField, isSensitive: checked })}
                />
              </div>
              {tempField.component && (
                <ComponentConfigEditor
                  componentType={tempField.component}
                  config={tempField.componentTypeConfig}
                  onChange={(newConfig) => setTempField({ ...tempField, componentTypeConfig: newConfig })}
                />
              )}
              </div>
            </div>
            <DialogFooter className="px-6 pt-4 pb-6 border-t border-gray-100 dark:border-gray-700 shrink-0 flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto text-xs">
                {buttonCancel}
              </Button>
              <Button onClick={handleSave} disabled={!canSave} className="w-full sm:w-auto text-xs">
                <span className="hidden md:inline">{buttonSaveChanges}</span>
                <span className="md:hidden">{buttonSave}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

