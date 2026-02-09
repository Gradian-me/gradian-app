import { FormSchema as SharedFormSchema } from '../types/form-schema';
import { FormSchema as FormBuilderFormSchema } from '../types/form-schema';

/** Schema with optional translation arrays for names and description */
type SchemaWithNameTranslations = {
  singular_name?: string;
  plural_name?: string;
  singular_name_translations?: Array<Record<string, string>>;
  plural_name_translations?: Array<Record<string, string>>;
  description?: string;
  description_translations?: Array<Record<string, string>>;
};

/**
 * Resolve a translated string from schema name translations array.
 * Format: [{"en": "Task"}, {"fa": "وظیفه"}]
 */
function resolveFromNameTranslations(
  translations: Array<Record<string, string>> | undefined,
  lang: string | undefined,
  fallback: string
): string {
  if (!lang || !Array.isArray(translations)) return fallback;
  for (const entry of translations) {
    if (entry && typeof entry === 'object' && lang in entry && entry[lang]) return entry[lang];
  }
  return fallback;
}

/**
 * Get the singular name for a schema in the given language.
 * Uses singular_name_translations when present and lang is set; otherwise returns schema.singular_name or fallback.
 */
export function getSchemaTranslatedSingularName(
  schema: SchemaWithNameTranslations | null | undefined,
  lang: string | undefined,
  fallback = 'Entity'
): string {
  if (!schema) return fallback;
  const base = schema.singular_name || fallback;
  return resolveFromNameTranslations(schema.singular_name_translations, lang, base);
}

/**
 * Get the plural name for a schema in the given language.
 * Uses plural_name_translations when present and lang is set; otherwise returns schema.plural_name or fallback.
 */
export function getSchemaTranslatedPluralName(
  schema: SchemaWithNameTranslations | null | undefined,
  lang: string | undefined,
  fallback = 'Entities'
): string {
  if (!schema) return fallback;
  const base = schema.plural_name || fallback;
  return resolveFromNameTranslations(schema.plural_name_translations, lang, base);
}

/**
 * Get the schema description in the given language.
 * Uses description_translations when present and lang is set; otherwise returns schema.description or fallback.
 */
export function getSchemaTranslatedDescription(
  schema: SchemaWithNameTranslations | null | undefined,
  lang: string | undefined,
  fallback = ''
): string {
  if (!schema) return fallback;
  const base = schema.description ?? fallback;
  return resolveFromNameTranslations(schema.description_translations, lang, base);
}

/** Section with optional title/description translation arrays */
type SectionWithTranslations = {
  title?: string;
  description?: string;
  titleTranslations?: Array<Record<string, string>>;
  descriptionTranslations?: Array<Record<string, string>>;
};

/**
 * Get the section title in the given language.
 * Uses titleTranslations when present; otherwise returns section.title or fallback.
 */
export function getSectionTranslatedTitle(
  section: SectionWithTranslations | null | undefined,
  lang: string | undefined,
  fallback = ''
): string {
  if (!section) return fallback;
  const base = section.title ?? fallback;
  return resolveFromNameTranslations(section.titleTranslations, lang, base);
}

/**
 * Get the section description in the given language.
 * Uses descriptionTranslations when present; otherwise returns section.description or fallback.
 */
export function getSectionTranslatedDescription(
  section: SectionWithTranslations | null | undefined,
  lang: string | undefined,
  fallback = ''
): string {
  if (!section) return fallback;
  const base = section.description ?? fallback;
  return resolveFromNameTranslations(section.descriptionTranslations, lang, base);
}

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
  if (!schema || typeof schema !== 'object') {
    throw new Error('asFormBuilderSchema: schema must be a non-null object');
  }

  // Ensure name is set (required by form-builder FormSchema)
  const name = schema.name || schema.singular_name || 'Item';
  
  // Ensure title is set (required by form-builder FormSchema)
  const title = schema.title || schema.plural_name || 'Items';
  
  // Normalize arrays so backend null/undefined never cause .length access on null
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  const sections = Array.isArray(schema.sections)
    ? schema.sections.map((s: any) => (s && typeof s === 'object'
        ? {
            ...s,
            // Ensure repeatingConfig exists and is object if section is repeating
            ...(s.isRepeatingSection && (!s.repeatingConfig || typeof s.repeatingConfig !== 'object')
              ? { repeatingConfig: s.repeatingConfig || {} }
              : {}),
          }
        : s))
    : [];
  const cardMetadata = Array.isArray(schema.cardMetadata) ? schema.cardMetadata : [];
  
  // Always provide detailPageMetadata as an object with arrays (never null/undefined) so consumers never hit .length on null
  const detailPageMetadata = schema.detailPageMetadata != null
    ? {
        ...schema.detailPageMetadata,
        sections: Array.isArray(schema.detailPageMetadata?.sections) ? schema.detailPageMetadata.sections : [],
        componentRenderers: Array.isArray(schema.detailPageMetadata?.componentRenderers) ? schema.detailPageMetadata.componentRenderers : [],
        tableRenderers: Array.isArray(schema.detailPageMetadata?.tableRenderers) ? schema.detailPageMetadata.tableRenderers : [],
        quickActions: Array.isArray(schema.detailPageMetadata?.quickActions) ? schema.detailPageMetadata.quickActions : [],
      }
    : {
        sections: [] as any[],
        componentRenderers: [] as any[],
        tableRenderers: [] as any[],
        quickActions: [] as any[],
      };
  
  // Normalize statusGroup and entityTypeGroup - always use arrays so backend null never causes .length on null
  const statusGroup = Array.isArray(schema.statusGroup) ? schema.statusGroup : [];
  const entityTypeGroup = Array.isArray(schema.entityTypeGroup) ? schema.entityTypeGroup : [];
  
  const formBuilderSchema = {
    ...schema,
    name,
    title,
    description: schema.description,
    fields,
    sections,
    cardMetadata,
    detailPageMetadata,
    statusGroup,
    entityTypeGroup,
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

