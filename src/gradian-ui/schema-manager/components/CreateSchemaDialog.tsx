'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextInput, Textarea } from '@/gradian-ui/form-builder/form-elements';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBox } from '@/gradian-ui/layout/message-box';
import { CreateSchemaPayload, SchemaCreateResult } from '../types/schema-manager-page';
import { generatePluralName, generateSchemaId } from '../utils/schema-form';
import { Switch as FormSwitch } from '@/gradian-ui/form-builder/form-elements/components/Switch';
import { NameInput } from '@/gradian-ui/form-builder/form-elements';

interface CreateSchemaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSchemaPayload) => Promise<SchemaCreateResult>;
}

const INITIAL_FORM_STATE: CreateSchemaPayload = {
  singularName: '',
  pluralName: '',
  schemaId: '',
  description: '',
  showInNavigation: false,
  isSystemSchema: false,
  isNotCompanyBased: false,
  allowDataInactive: false,
  allowDataForce: false,
  allowDataHardDelete: false,
};

export function CreateSchemaDialog({ open, onOpenChange, onSubmit }: CreateSchemaDialogProps) {
  const [formState, setFormState] = useState<CreateSchemaPayload>(INITIAL_FORM_STATE);
  const [isPluralCustom, setIsPluralCustom] = useState(false);
  const [isSchemaIdCustom, setIsSchemaIdCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorResult, setErrorResult] = useState<SchemaCreateResult | null>(null);

  const resetForm = useCallback(() => {
    setFormState(INITIAL_FORM_STATE);
    setIsPluralCustom(false);
    setIsSchemaIdCustom(false);
    setIsSubmitting(false);
    setErrorResult(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const handleSingularNameChange = (value: string) => {
    setFormState(prev => {
      const nextState = { ...prev, singularName: value };

      if (!isPluralCustom) {
        const generatedPlural = generatePluralName(value);
        nextState.pluralName = generatedPlural;

        if (!isSchemaIdCustom) {
          nextState.schemaId = generateSchemaId(generatedPlural);
        }
      } else if (!isSchemaIdCustom) {
        nextState.schemaId = generateSchemaId(prev.pluralName);
      }

      return nextState;
    });
  };

  const handlePluralNameChange = (value: string) => {
    setIsPluralCustom(true);
    setFormState(prev => {
      const nextState = { ...prev, pluralName: value };

      if (!isSchemaIdCustom) {
        nextState.schemaId = generateSchemaId(value);
      }

      return nextState;
    });
  };

  const handleSchemaIdChange = (value: string) => {
    if (!isSchemaIdCustom) {
      return;
    }

    setFormState(prev => ({ ...prev, schemaId: value }));
  };

  const handleSwitchChange = (key: 'showInNavigation' | 'isSystemSchema' | 'isNotCompanyBased' | 'allowDataInactive' | 'allowDataForce' | 'allowDataHardDelete') => (checked: boolean) => {
    setFormState(prev => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handlePluralReset = () => {
    const generatedPlural = generatePluralName(formState.singularName);
    setIsPluralCustom(false);
    setFormState(prev => {
      const nextState = { ...prev, pluralName: generatedPlural };

      if (!isSchemaIdCustom) {
        nextState.schemaId = generateSchemaId(generatedPlural);
      }

      return nextState;
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorResult(null);
    const result = await onSubmit(formState);

    if (result.success) {
      onOpenChange(false);
    } else {
      setErrorResult(result);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Create New Schema</DialogTitle>
          <DialogDescription>
            Add a new schema to start building dynamic forms
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 py-4 pr-4">
          {errorResult && ((errorResult.messages && errorResult.messages.length > 0) || errorResult.message) && (
            <MessageBox
              messages={errorResult.messages}
              message={errorResult.message}
              variant="error"
              dismissible
              onDismiss={() => setErrorResult(null)}
            />
          )}
          <div>
            <TextInput
              config={{ 
                name: 'schema-name', 
                label: 'Singular Name',
                placeholder: 'e.g., Purchase Order'
              }}
              value={formState.singularName}
              onChange={handleSingularNameChange}
              required={true}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="schema-plural-name" className="text-sm font-medium text-gray-700 after:content-['*'] after:ml-1 after:text-red-500">
                Plural Name
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={handlePluralReset}
                disabled={!formState.singularName || !isPluralCustom}
              >
                Use generated
              </Button>
            </div>
            <TextInput
              config={{ 
                name: 'schema-plural-name', 
                label: undefined,
                placeholder: 'e.g., Purchase Orders'
              }}
              value={formState.pluralName}
              onChange={handlePluralNameChange}
              required={true}
            />
          </div>
          <div>
            <NameInput
              config={{ name: 'schema-id', label: 'Schema ID', placeholder: 'Generated from the plural name' }}
              value={formState.schemaId}
              onChange={handleSchemaIdChange}
              isCustomizable
              customMode={isSchemaIdCustom}
              onCustomModeChange={(custom) => {
                if (!custom) {
                  const generatedId = generateSchemaId(formState.pluralName);
                  setFormState(prev => ({ ...prev, schemaId: generatedId }));
                }
                setIsSchemaIdCustom(custom);
              }}
              customizeDisabled={!formState.pluralName}
              helperText="Schema ID is permanent and cannot be changed later."
              required={true}
            />
          </div>
          <div>
            <Textarea
              config={{ 
                name: 'schema-description', 
                label: 'Description',
                placeholder: 'Describe the purpose of this schema'
              }}
              value={formState.description}
              onChange={(value) =>
                setFormState(prev => ({ ...prev, description: value }))
              }
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <FormSwitch
              config={{ name: 'showInNavigation', label: 'Show in Navigation' }}
              value={formState.showInNavigation}
              onChange={handleSwitchChange('showInNavigation')}
            />
            <FormSwitch
              config={{ name: 'isSystemSchema', label: 'Is System Schema' }}
              value={formState.isSystemSchema}
              onChange={handleSwitchChange('isSystemSchema')}
            />
            <FormSwitch
              config={{ name: 'isNotCompanyBased', label: 'Is Not Company Based' }}
              value={formState.isNotCompanyBased}
              onChange={handleSwitchChange('isNotCompanyBased')}
            />
          </div>
          <div className="border-t pt-4 mt-4 border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Data Management Options</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormSwitch
                config={{ name: 'allowDataInactive', label: 'Allow Data Inactive' }}
                value={formState.allowDataInactive || false}
                onChange={handleSwitchChange('allowDataInactive')}
              />
              <FormSwitch
                config={{ name: 'allowDataForce', label: 'Allow Data Force' }}
                value={formState.allowDataForce || false}
                onChange={handleSwitchChange('allowDataForce')}
              />
              <FormSwitch
                config={{ name: 'allowDataHardDelete', label: 'Allow Data Hard Delete' }}
                value={formState.allowDataHardDelete || false}
                onChange={handleSwitchChange('allowDataHardDelete')}
              />
            </div>
          </div>
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Schema'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
