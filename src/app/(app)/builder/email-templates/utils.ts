import { PlaceholderValues } from './types';

const placeholderPattern = /{{\s*([\w.-]+)\s*}}/g;

export const normalizeTemplateId = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'template';
};

export const renderWithValues = (content: string | undefined, values: PlaceholderValues) =>
  (content ?? '').replace(placeholderPattern, (_, key: string) =>
    values[key] !== undefined && values[key] !== '' ? values[key] : `{{${key}}}`,
  );

export const extractPlaceholders = (content: string | undefined) => {
  if (!content) return [];
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = placeholderPattern.exec(content)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
};

export const DEFAULT_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{{subject}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family: Arial, sans-serif; padding: 24px;">
  <h1>Hello {{audience}}</h1>
  <p>Start crafting the HTML for your email here.</p>
</body>
</html>`;

