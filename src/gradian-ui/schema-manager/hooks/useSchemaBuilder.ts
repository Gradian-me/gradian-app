// Schema Builder Hook
// Main hook for managing schema builder state and operations

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { FormSchema, FormField, FormSection } from '../types/form-schema';
import { config as appConfig } from '../../../lib/config';
import { 
  SchemaBuilderState, 
  SchemaBuilderActions, 
  SchemaBuilderConfig,
  UseSchemaBuilderReturn 
} from '../types/builder';

export function useSchemaBuilder(
  config?: SchemaBuilderConfig
): UseSchemaBuilderReturn {
  const [state, setState] = useState<SchemaBuilderState>({
    schema: null,
    loading: false,
    saving: false,
    error: null,
    expandedSections: new Set(),
    selectedTab: 'general',
    validationErrors: {},
  });

  const loadSchema = useCallback(async (schemaId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`${config?.apiBaseUrl || appConfig.schemaApi.basePath}/${schemaId}`);
      const result = await response.json();
      
      if (result.success) {
        const schema = result.data;
        setState(prev => ({
          ...prev,
          schema,
          expandedSections: new Set(schema.sections.map((s: FormSection) => s.id)),
          loading: false,
        }));
      } else {
        throw new Error(result.error || 'Failed to load schema');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load schema',
      }));
      throw error;
    }
  }, [config]);

  const saveSchema = useCallback(async () => {
    if (!state.schema) return;
    
    setState(prev => ({ ...prev, saving: true, error: null }));
    try {
      if (config?.onSave) {
        await config.onSave(state.schema);
      } else {
        const { id: _schemaId, ...payload } = state.schema;
        const response = await fetch(
          `${config?.apiBaseUrl || appConfig.schemaApi.basePath}/${state.schema.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to save schema');
        }
      }
      setState(prev => ({ ...prev, saving: false }));
      toast.success('Schema saved successfully');
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save schema',
      }));
      toast.error('Failed to save schema. Please review your changes or try again.');
      throw error;
    }
  }, [state.schema, config]);

  const deleteSchema = useCallback(async () => {
    if (!state.schema) return;
    
    try {
      const updatedSchema = { ...state.schema, inactive: true };
      setState(prev => ({ ...prev, schema: updatedSchema }));
      
      if (config?.onDelete) {
        await config.onDelete(state.schema.id);
      } else {
        const { id: _schemaId, ...payload } = updatedSchema;
        const response = await fetch(
          `${config?.apiBaseUrl || appConfig.schemaApi.basePath}/${state.schema.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to set schema inactive');
        }
      }
      toast.success('Schema has been set inactive.');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to set schema inactive',
      }));
      toast.error('Failed to update schema status. Please try again.');
      throw error;
    }
  }, [state.schema, config]);

  const updateSchema = useCallback((updates: Partial<FormSchema>) => {
    setState(prev => ({
      ...prev,
      schema: prev.schema ? { ...prev.schema, ...updates } : null,
    }));
  }, []);

  const addSection = useCallback(() => {
    setState(prev => {
      if (!prev.schema) return prev;
      
      const newSection: FormSection = {
        id: `section-${Date.now()}`,
        title: 'New Section',
        columns: 2,
      };
      
      return {
        ...prev,
        schema: {
          ...prev.schema,
          sections: [...prev.schema.sections, newSection],
        },
        expandedSections: new Set([...prev.expandedSections, newSection.id]),
      };
    });
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<FormSection>) => {
    setState(prev => {
      if (!prev.schema) return prev;
      
      return {
        ...prev,
        schema: {
          ...prev.schema,
          sections: prev.schema.sections.map(s =>
            s.id === sectionId ? { ...s, ...updates } : s
          ),
        },
      };
    });
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setState(prev => {
      if (!prev.schema) return prev;
      
      return {
        ...prev,
        schema: {
          ...prev.schema,
          sections: prev.schema.sections.map(s => 
            s.id === sectionId ? { ...s, inactive: true } : s
          ),
          fields: prev.schema.fields.map(f => 
            f.sectionId === sectionId ? { ...f, inactive: true } : f
          ),
        },
      };
    });
  }, []);

  const addField = useCallback((sectionId: string) => {
    setState(prev => {
      if (!prev.schema) return prev;
      
      const sectionFields = prev.schema.fields.filter(f => f.sectionId === sectionId);
      const maxOrder = sectionFields.length > 0 
        ? Math.max(...sectionFields.map(f => f.order || 0))
        : 0;
      
      const newField: FormField = {
        id: `field-${Date.now()}`,
        name: 'new_field',
        label: 'New Field',
        sectionId,
        component: 'text',
        order: maxOrder + 1,
      };
      
      return {
        ...prev,
        schema: {
          ...prev.schema,
          fields: [...prev.schema.fields, newField],
        },
      };
    });
  }, []);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setState(prev => {
      if (!prev.schema) return prev;
      
      const currentField = prev.schema.fields.find(f => f.id === fieldId);
      if (!currentField) return prev;

      let updatedFields: FormField[];
      
      // If sectionId is being changed, move to the end of the new section
      if (updates.sectionId && updates.sectionId !== currentField.sectionId) {
        const newSectionFields = prev.schema.fields.filter(f => f.sectionId === updates.sectionId);
        const maxOrder = newSectionFields.length > 0 
          ? Math.max(...newSectionFields.map(f => f.order || 0))
          : 0;
        
        updatedFields = prev.schema.fields.map(f => {
          if (f.id === fieldId) {
            return { ...f, ...updates, order: maxOrder + 1 };
          }
          return f;
        });
      } else {
        updatedFields = prev.schema.fields.map(f =>
          f.id === fieldId ? { ...f, ...updates } : f
        );
      }
      
      return {
        ...prev,
        schema: {
          ...prev.schema,
          fields: updatedFields,
        },
      };
    });
  }, []);

  const deleteField = useCallback((fieldId: string) => {
    setState(prev => {
      if (!prev.schema) return prev;
      
      return {
        ...prev,
        schema: {
          ...prev.schema,
          fields: prev.schema.fields.map(f => 
            f.id === fieldId ? { ...f, inactive: true } : f
          ),
        },
      };
    });
  }, []);

  const moveField = useCallback((sectionId: string, fromIndex: number, toIndex: number) => {
    setState(prev => {
      if (!prev.schema) return prev;
      
      const sectionFields = prev.schema.fields
        .filter(f => f.sectionId === sectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      const [movedField] = sectionFields.splice(fromIndex, 1);
      sectionFields.splice(toIndex, 0, movedField);
      
      const updatedFields = prev.schema.fields.map(field => {
        const newIndex = sectionFields.findIndex(f => f.id === field.id);
        if (newIndex !== -1 && field.sectionId === sectionId) {
          return { ...field, order: newIndex + 1 };
        }
        return field;
      });
      
      return {
        ...prev,
        schema: {
          ...prev.schema,
          fields: updatedFields,
        },
      };
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setState(prev => {
      const newSet = new Set(prev.expandedSections);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return { ...prev, expandedSections: newSet };
    });
  }, []);

  const validateSchema = useCallback((): boolean => {
    if (!state.schema) return false;
    
    const errors: Record<string, string[]> = {};
    
    // Validate schema has required fields
    if (!state.schema.id) errors.schema = ['ID is required'];
    if (!state.schema.singular_name) errors.schema = [...(errors.schema || []), 'Singular name is required'];
    if (!state.schema.plural_name) errors.schema = [...(errors.schema || []), 'Plural name is required'];
    
    // Validate fields
    state.schema.fields.forEach((field, index) => {
      const fieldErrors: string[] = [];
      if (!field.id) fieldErrors.push('ID is required');
      if (!field.name) fieldErrors.push('Name is required');
      if (!field.label) fieldErrors.push('Label is required');
      if (!field.sectionId) fieldErrors.push('Section is required');
      if (fieldErrors.length > 0) {
        errors[`field-${index}`] = fieldErrors;
      }
    });
    
    // Validate sections
    state.schema.sections.forEach((section, index) => {
      const sectionErrors: string[] = [];
      if (!section.id) sectionErrors.push('ID is required');
      if (!section.title) sectionErrors.push('Title is required');
      if (sectionErrors.length > 0) {
        errors[`section-${index}`] = sectionErrors;
      }
    });
    
    setState(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  }, [state.schema]);

  const reset = useCallback(() => {
    setState({
      schema: null,
      loading: false,
      saving: false,
      error: null,
      expandedSections: new Set(),
      selectedTab: 'general',
      validationErrors: {},
    });
  }, []);

  const actions: SchemaBuilderActions = {
    loadSchema,
    saveSchema,
    deleteSchema,
    updateSchema,
    addSection,
    updateSection,
    deleteSection,
    addField,
    updateField,
    deleteField,
    moveField,
    toggleSection,
    validateSchema,
    reset,
  };

  return { state, actions };
}

