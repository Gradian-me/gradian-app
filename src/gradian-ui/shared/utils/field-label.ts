import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { getDefaultLanguage, getT, resolveSchemaFieldLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

/** System fields shown in sort, group, and select-columns dialogs. Keep in sync with backend system fields. */
export const SYSTEM_FIELDS_BASE = [
  { id: 'id', name: 'id', labelKey: 'ID' as const },
  { id: 'status', name: 'status', labelKey: TRANSLATION_KEYS.LABEL_STATUS },
  { id: 'entityType', name: 'entityType', labelKey: TRANSLATION_KEYS.LABEL_ENTITY_TYPE },
  { id: 'updatedBy', name: 'updatedBy', labelKey: TRANSLATION_KEYS.LABEL_UPDATED_BY },
  { id: 'updatedAt', name: 'updatedAt', labelKey: TRANSLATION_KEYS.LABEL_UPDATED_AT },
  { id: 'createdBy', name: 'createdBy', labelKey: TRANSLATION_KEYS.LABEL_CREATED_BY },
  { id: 'createdAt', name: 'createdAt', labelKey: TRANSLATION_KEYS.LABEL_CREATED_AT },
  { id: 'assignedTo', name: 'assignedTo', labelKey: TRANSLATION_KEYS.LABEL_ASSIGNED_TO },
  { id: 'dueDate', name: 'dueDate', labelKey: TRANSLATION_KEYS.LABEL_DUE_DATE },
  { id: 'companyId', name: 'companyId', labelKey: TRANSLATION_KEYS.LABEL_COMPANY },
] as const;

/** Prefer label; if missing, humanize name (camelCase/snake_case to Title Case). */
export function humanizeFieldName(str: string): string {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get display label for a field by id/name. Uses schema field label or translations, then SYSTEM_FIELDS, then humanized id.
 */
export function getFieldLabel(
  schema: FormSchema | null | undefined,
  fieldId: string,
  language?: string,
  defaultLang?: string
): string {
  const lang = language ?? getDefaultLanguage();
  const defLang = defaultLang ?? getDefaultLanguage();
  const fromSchema = schema?.fields?.find(
    (f: { id: string; name?: string; label?: string }) => f.id === fieldId || (f as { name?: string }).name === fieldId
  );
  if (fromSchema) {
    const label = resolveSchemaFieldLabel(fromSchema as { label?: string; translations?: Array<Record<string, string>> }, lang, defLang);
    if (label && String(label).trim()) return label;
    const name = (fromSchema as { name?: string }).name;
    if (name) return humanizeFieldName(name);
    return humanizeFieldName(fieldId);
  }
  const fromSystem = SYSTEM_FIELDS_BASE.find((f) => f.id === fieldId);
  if (fromSystem) {
    if (fromSystem.labelKey === 'ID') return 'ID';
    return getT(fromSystem.labelKey, lang, defLang);
  }
  return humanizeFieldName(fieldId);
}

/**
 * Build system fields list with resolved labels. Optionally exclude companyId for non-company schemas.
 */
export function getSystemFieldsList(
  options: { schema?: FormSchema | null; language?: string; defaultLang?: string; includeCompany?: boolean }
): Array<{ id: string; name: string; label: string }> {
  const lang = options.language ?? getDefaultLanguage();
  const defLang = options.defaultLang ?? getDefaultLanguage();
  const includeCompany = options.includeCompany ?? (options.schema ? !options.schema.isNotCompanyBased : true);
  return SYSTEM_FIELDS_BASE.filter((f) => f.id !== 'companyId' || includeCompany).map((f) => ({
    id: f.id,
    name: f.name,
    label: f.labelKey === 'ID' ? 'ID' : getT(f.labelKey, lang, defLang),
  }));
}
