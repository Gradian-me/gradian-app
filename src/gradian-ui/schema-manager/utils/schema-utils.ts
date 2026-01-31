import { FormSchema as SharedFormSchema } from '../types/form-schema';
import { FormSchema as FormBuilderFormSchema } from '../types/form-schema';

// Extended form schema with additional properties
export type ExtendedFormSchema = SharedFormSchema & {
  // Add any extended properties here if needed
  [key: string]: any;
};

/**
 * Safely cast an ExtendedFormSchema to SharedFormSchema for components that require it
 */
export const asFormSchema = (schema: ExtendedFormSchema): SharedFormSchema => {
  // Ensure name and title are set as aliases for compatibility
  if (!schema.name && schema.singular_name) {
    schema.name = schema.singular_name;
  }
  
  if (!schema.title && schema.plural_name) {
    schema.title = schema.plural_name;
  }
  
  // Add default actions if not present
  if (!schema.actions) {
    schema.actions = ['cancel', 'reset', 'submit'];
  }
  
  // Add default validation settings if not present
  if (!schema.validation) {
    schema.validation = {
      mode: 'onChange',
      showErrors: true,
    };
  }
  
  return schema as SharedFormSchema;
};

/**
 * Convert ExtendedFormSchema to FormBuilderFormSchema for form-builder components.
 * Normalizes fields, sections, and detailPageMetadata so null/undefined from backend
 * never cause "Cannot read properties of null (reading 'length')" in consumers.
 */
export const asFormBuilderSchema = (schema: ExtendedFormSchema): FormBuilderFormSchema => {
  // Ensure name is set (required by form-builder FormSchema)
  const name = schema.name || schema.singular_name || 'Item';
  
  // Ensure title is set (required by form-builder FormSchema)
  const title = schema.title || schema.plural_name || 'Items';
  
  // Normalize arrays so backend null/undefined never cause .length access on null
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  const sections = Array.isArray(schema.sections) ? schema.sections : [];
  const cardMetadata = Array.isArray(schema.cardMetadata) ? schema.cardMetadata : [];
  const detailPageMetadata = schema.detailPageMetadata
    ? {
        ...schema.detailPageMetadata,
        sections: Array.isArray(schema.detailPageMetadata.sections) ? schema.detailPageMetadata.sections : [],
        componentRenderers: Array.isArray(schema.detailPageMetadata.componentRenderers) ? schema.detailPageMetadata.componentRenderers : [],
        tableRenderers: Array.isArray(schema.detailPageMetadata.tableRenderers) ? schema.detailPageMetadata.tableRenderers : [],
        quickActions: Array.isArray(schema.detailPageMetadata.quickActions) ? schema.detailPageMetadata.quickActions : [],
      }
    : undefined;
  
  const formBuilderSchema = {
    ...schema,
    name,
    title,
    description: schema.description,
    fields,
    sections,
    cardMetadata,
    detailPageMetadata,
    layout: schema.layout,
    styling: schema.styling,
    validation: schema.validation || {
      mode: 'onChange' as const,
      showErrors: true,
    },
    actions: schema.actions || ['cancel', 'reset', 'submit'],
  } as FormBuilderFormSchema;
  
  return formBuilderSchema;
};

