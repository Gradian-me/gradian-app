export interface OptionLike {
  id?: string | number;
  value?: string | number;
  label?: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
  [key: string]: any;
}

export type OptionValueInput = OptionLike | string | number | null | undefined;

export interface NormalizedOption extends OptionLike {
  id: string;
  value?: string;
  metadata?: Record<string, any>; // Metadata object for fields with addToReferenceMetadata: true
}

const toStringSafe = (input: string | number): string => String(input);

export const normalizeOptionId = (input: OptionValueInput): string | undefined => {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (typeof input === 'string' || typeof input === 'number') {
    return toStringSafe(input);
  }

  if (typeof input === 'object') {
    if ('id' in input && input.id !== undefined && input.id !== null) {
      return toStringSafe(input.id as string | number);
    }
    if ('value' in input && input.value !== undefined && input.value !== null) {
      return toStringSafe(input.value as string | number);
    }
  }

  return undefined;
};

export const normalizeOptionEntry = (input: OptionValueInput): NormalizedOption | undefined => {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (typeof input === 'string' || typeof input === 'number') {
    const id = toStringSafe(input);
    return {
      id,
      label: id,
      value: id,
    };
  }

  if (typeof input === 'object') {
    const id = normalizeOptionId(input);
    if (!id) {
      return undefined;
    }

    const value = 'value' in input && input.value !== undefined && input.value !== null
      ? toStringSafe(input.value as string | number)
      : undefined;

    const label = 'label' in input && input.label !== undefined && input.label !== null
      ? String(input.label)
      : undefined;

    return {
      ...(input ?? {}),
      id,
      value,
      label,
    };
  }

  return undefined;
};

export const normalizeOptionArray = (input: unknown): NormalizedOption[] => {
  const rawArray = Array.isArray(input) ? input : input !== null && input !== undefined ? [input] : [];
  return rawArray
    .map((entry) => normalizeOptionEntry(entry as OptionValueInput))
    .filter((entry): entry is NormalizedOption => Boolean(entry));
};

export const extractFirstId = (input: unknown): string | undefined => {
  const normalized = normalizeOptionArray(input);
  if (normalized.length > 0) {
    return normalized[0].id;
  }
  return normalizeOptionId(input as OptionValueInput);
};

export const extractIds = (input: unknown): string[] => {
  return normalizeOptionArray(input).map((entry) => entry.id);
};

export const extractLabels = (input: unknown): string[] => {
  return normalizeOptionArray(input)
    .map((entry) => entry.label ?? entry.id)
    .filter((label): label is string => Boolean(label && String(label).length > 0));
};

