import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import {
  isTranslationArray,
  resolveFromTranslationsArray,
  resolveDisplayLabel,
  getT,
} from '@/gradian-ui/shared/utils/translation-utils';
import { getFieldLabel } from '@/gradian-ui/shared/utils/field-label';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

/** Resolve display string from object with firstName/lastName (string or translation array). */
function resolvePersonDisplay(
  obj: Record<string, unknown>,
  language: string,
  defaultLang: string
): string {
  const first = resolveDisplayLabel(obj.firstName, language, defaultLang).trim();
  const last = resolveDisplayLabel(obj.lastName, language, defaultLang).trim();
  if (first || last) return [first, last].filter(Boolean).join(' ');
  return '';
}

/**
 * Resolve a raw value to a display string for group accordion labels.
 * - string -> use as-is
 * - translation array [{en},{fa}] -> resolve by language
 * - array (e.g. picker) -> use first element's label string or translation
 */
export function resolveGroupValueDisplay(
  rawValue: unknown,
  language: string,
  defaultLang: string
): string {
  if (rawValue === null || rawValue === undefined) return '';
  if (typeof rawValue === 'string') return rawValue.trim();
  if (isTranslationArray(rawValue)) {
    return resolveFromTranslationsArray(rawValue, language, defaultLang);
  }
  if (Array.isArray(rawValue) && rawValue.length > 0) {
    const first = rawValue[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      const obj = first as Record<string, unknown>;
      const fromPerson = resolvePersonDisplay(obj, language, defaultLang);
      if (fromPerson) return fromPerson;
      const label = resolveDisplayLabel(obj.label, language, defaultLang);
      if (label) return label.trim();
      const name = resolveDisplayLabel(obj.name, language, defaultLang);
      if (name) return name.trim();
      const title = resolveDisplayLabel(obj.title, language, defaultLang);
      if (title) return title.trim();
      if (obj.translations && isTranslationArray(obj.translations)) {
        return resolveFromTranslationsArray(obj.translations, language, defaultLang);
      }
    }
    return String(first);
  }
  if (typeof rawValue === 'object' && rawValue !== null && !Array.isArray(rawValue)) {
    const obj = rawValue as Record<string, unknown>;
    const fromPerson = resolvePersonDisplay(obj, language, defaultLang);
    if (fromPerson) return fromPerson;
    const label = resolveDisplayLabel(obj.label, language, defaultLang);
    if (label) return label.trim();
    const name = resolveDisplayLabel(obj.name, language, defaultLang);
    if (name) return name.trim();
    const title = resolveDisplayLabel(obj.title, language, defaultLang);
    if (title) return title.trim();
  }
  return String(rawValue);
}

type FieldWithOptions = { id: string; name?: string; options?: Array<{ id?: string; value?: string; label?: unknown }> };

/** Map common status (and similar) option labels to translation keys for accordion value labels. */
const KNOWN_VALUE_TRANSLATIONS: Record<string, string> = {
  active: TRANSLATION_KEYS.LABEL_ACTIVE,
  inactive: TRANSLATION_KEYS.LABEL_INACTIVE,
  cancelled: TRANSLATION_KEYS.LABEL_CANCELLED,
};

function translateKnownStatusValue(
  column: string,
  optionLabel: string,
  language: string,
  defaultLang: string
): string | null {
  const col = (column || '').toLowerCase();
  if (col !== 'status') return null;
  const key = KNOWN_VALUE_TRANSLATIONS[optionLabel.toLowerCase().trim()];
  if (!key) return null;
  return getT(key, language, defaultLang);
}

/**
 * Get the display string for a group key (field value) for use in accordion labels.
 * Resolves field from schema by column (id or name), gets entity value.
 * Uses field options (with language) when value is a string and field has options.
 */
export function getGroupValueDisplay(
  schema: FormSchema | null | undefined,
  entity: Record<string, unknown>,
  column: string,
  language: string,
  defaultLang: string
): string {
  if (!schema?.fields) return String(entity[column] ?? '');
  const field = (schema.fields as FieldWithOptions[]).find(
    (f) => f.id === column || (f.name ?? f.id) === column
  );
  const fieldName = field ? (field.name ?? field.id) : column;
  const rawValue = entity[fieldName];
  if (rawValue !== null && rawValue !== undefined && field?.options?.length) {
    const strVal = typeof rawValue === 'string' ? rawValue : String(rawValue);
    const opt = field.options.find(
      (o) => String(o.value ?? o.id ?? '') === strVal
    );
    if (opt?.label != null) {
      if (isTranslationArray(opt.label)) return resolveFromTranslationsArray(opt.label, language, defaultLang);
      if (typeof opt.label === 'string') {
        const trimmed = opt.label.trim();
        const translated = translateKnownStatusValue(column, trimmed, language, defaultLang);
        if (translated) return translated;
        return trimmed;
      }
    }
  }
  const resolved = resolveGroupValueDisplay(rawValue, language, defaultLang);
  if (resolved && column?.toLowerCase() === 'status') {
    const translated = translateKnownStatusValue(column, resolved, language, defaultLang);
    if (translated) return translated;
  }
  return resolved;
}

/**
 * Get the field label for a grouping column (for "FieldLabel: value" in accordion).
 * Uses getFieldLabel so schema fields and system fields (Status, Assigned To, etc.) get translated labels.
 */
export function getGroupFieldLabel(
  schema: FormSchema | null | undefined,
  column: string,
  language: string,
  defaultLang: string
): string {
  return getFieldLabel(schema, column, language, defaultLang);
}

function getFieldNameForColumn(schema: FormSchema | null | undefined, column: string): string {
  if (!schema?.fields) return column;
  const field = (schema.fields as Array<{ id: string; name?: string }>).find(
    (f) => f.id === column || (f.name ?? f.id) === column
  );
  return field ? (field.name ?? field.id) : column;
}

/** One level of grouping: key for React/accordion, label for display, children are either entities or nested groups. */
export interface SchemaGroupNode {
  key: string;
  label: string;
  fieldLabel: string;
  children: any[] | SchemaGroupNode[];
}

/**
 * Build nested group tree from entities and groupConfig. Each node has key, label (value display), fieldLabel (column label), and children.
 * @param emptyGroupLabel - Translated label for empty/null values (e.g. "(Empty)"). Used instead of __empty.
 */
export function buildSchemaGrouped(
  entities: any[],
  schema: FormSchema | null | undefined,
  groupConfig: { column: string }[],
  level: number,
  language: string,
  defaultLang: string,
  emptyGroupLabel?: string
): SchemaGroupNode[] {
  if (level >= groupConfig.length || !groupConfig[level]) return [];
  const column = groupConfig[level].column;
  const fieldName = getFieldNameForColumn(schema, column);
  const fieldLabel = getGroupFieldLabel(schema, column, language, defaultLang);
  const emptyLabel = emptyGroupLabel ?? '(Empty)';

  const buckets = new Map<string, any[]>();
  for (const e of entities) {
    const rawVal = e[fieldName] ?? e[column];
    const key =
      rawVal === null || rawVal === undefined
        ? '__empty'
        : typeof rawVal === 'object'
          ? JSON.stringify(rawVal)
          : String(rawVal);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(e);
  }

  const result: SchemaGroupNode[] = [];
  let index = 0;
  for (const [key, list] of buckets.entries()) {
    const first = list[0];
    const valueLabel =
      key === '__empty'
        ? emptyLabel
        : getGroupValueDisplay(schema, first, column, language, defaultLang) || key || emptyLabel;
    const stableKey = `g-${level}-${index}-${key.slice(0, 80)}`;
    index++;
    if (level === groupConfig.length - 1) {
      result.push({ key: stableKey, label: valueLabel, fieldLabel, children: list });
    } else {
      const nested = buildSchemaGrouped(list, schema, groupConfig, level + 1, language, defaultLang, emptyGroupLabel);
      result.push({ key: stableKey, label: valueLabel, fieldLabel, children: nested });
    }
  }
  return result;
}
