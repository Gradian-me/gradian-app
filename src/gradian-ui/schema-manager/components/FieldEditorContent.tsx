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

interface FieldEditorContentProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  sections: FormSection[];
}

export function FieldEditorContent({ field, onUpdate, onDelete, sections }: FieldEditorContentProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [tempField, setTempField] = useState(field);

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
                {field.label || 'Unnamed Field'}
              </span>
              {field.inactive && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-600">
                  Inactive
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{field.component}</Badge>
              {field.required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>}
            </div>
            <span className={`text-[10px] truncate block mt-0.5 ${
              field.inactive ? 'text-gray-400' : 'text-gray-400'
            }`}>
              {field.name}
            </span>
          </div>
          <div className="flex gap-0.5 ml-2 shrink-0">
            <ButtonMinimal
              icon={Edit}
              title="Edit Field"
              color="violet"
              size="md"
              onClick={() => setShowDialog(true)}
            />
            <ButtonMinimal
              icon={Trash2}
              title="Delete Field"
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
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>
              Configure field properties and behavior
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                config={{ name: 'field-label', label: 'Field Label', placeholder: 'Enter field label...' }}
                value={tempField.label || ''}
                onChange={(value) => setTempField({ ...tempField, label: value })}
              />
              <NameInput
                config={{ name: 'field-name', label: 'Field Name', placeholder: 'Enter field name...' }}
                value={tempField.name || ''}
                onChange={(value) => setTempField({ ...tempField, name: value })}
                isCustomizable={false}
              />
            </div>
            <Select
              config={{ name: 'field-component', label: 'Component' }}
              value={tempField.component}
              onValueChange={(value) => setTempField({ ...tempField, component: value as any })}
              options={[...FIELD_TYPES]}
            />
            <Select
              config={{ name: 'field-section', label: 'Section' }}
              value={tempField.sectionId}
              onValueChange={(value) => setTempField({ ...tempField, sectionId: value })}
              options={sections.map((s) => ({ value: s.id, label: s.title }))}
            />
            <TextInput
              config={{ name: 'field-placeholder', label: 'Placeholder' }}
              value={tempField.placeholder || ''}
              onChange={(value) => setTempField({ ...tempField, placeholder: value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                config={{ name: 'field-role', label: 'Role', placeholder: 'Select role...' }}
                value={tempField.role || ''}
                onValueChange={(value) => setTempField({ ...tempField, role: value ? (value as any) : undefined })}
                options={[
                  { value: '', label: 'None' },
                  ...ROLES,
                ]}
              />
              <Select
                config={{ name: 'field-role-color', label: 'Role Color', placeholder: 'Select color...' }}
                value={tempField.roleColor || ''}
                onValueChange={(value) => setTempField({ ...tempField, roleColor: value ? (value as any) : undefined })}
                options={[
                  { value: '', label: 'Default' },
                  { value: 'default', label: 'Default' },
                  { value: 'secondary', label: 'Secondary' },
                  { value: 'outline', label: 'Outline' },
                  { value: 'destructive', label: 'Destructive' },
                  { value: 'gradient', label: 'Gradient' },
                  { value: 'success', label: 'Success' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'info', label: 'Info' },
                  { value: 'muted', label: 'Muted' },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberInput
                config={{ name: 'field-col-span', label: 'Column Span' }}
                value={tempField.colSpan ?? 1}
                onChange={(value) => setTempField({ ...tempField, colSpan: value === '' ? 1 : Number(value) || 1 })}
                min={1}
                max={4}
              />
              <NumberInput
                config={{ name: 'field-order', label: 'Order' }}
                value={tempField.order ?? 1}
                onChange={(value) => setTempField({ ...tempField, order: value === '' ? 1 : Number(value) || 1 })}
                min={1}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Switch
                config={{ name: `required-${field.id}`, label: 'Required' }}
                value={tempField.required || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, required: checked })}
              />
              <Switch
                config={{ name: `disabled-${field.id}`, label: 'Disabled' }}
                value={tempField.disabled || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, disabled: checked })}
              />
              <Switch
                config={{ name: `readonly-${field.id}`, label: 'Readonly' }}
                value={tempField.readonly || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, readonly: checked })}
              />
              <Switch
                config={{ name: `can-copy-${field.id}`, label: 'Can Copy' }}
                value={tempField.canCopy || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, canCopy: checked })}
              />
              <Switch
                config={{ name: `addToReferenceMetadata-${field.id}`, label: 'Add To Reference Metadata' }}
                value={tempField.addToReferenceMetadata || false}
                onChange={(checked: boolean) => setTempField({ ...tempField, addToReferenceMetadata: checked })}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto text-sm md:text-base">
              Cancel
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto text-sm md:text-base">
              <span className="hidden md:inline">Save Changes</span>
              <span className="md:hidden">Save</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

