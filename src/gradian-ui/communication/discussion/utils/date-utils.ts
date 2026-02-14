/**
 * Date formatting utilities for discussion timestamps
 */

type TranslateFn = (key: string) => string;

export function formatDiscussionDate(
  isoString: string | undefined,
  t?: TranslateFn,
): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t ? t('DISCUSSION_JUST_NOW') : 'Just now';
  if (diffMins < 60) {
    const template = t ? t('DISCUSSION_MINS_AGO') : '{{n}}m ago';
    return template.replace(/\{\{n\}\}/g, String(diffMins));
  }
  if (diffHours < 24) {
    const template = t ? t('DISCUSSION_HOURS_AGO') : '{{n}}h ago';
    return template.replace(/\{\{n\}\}/g, String(diffHours));
  }
  if (diffDays < 7) {
    const template = t ? t('DISCUSSION_DAYS_AGO') : '{{n}}d ago';
    return template.replace(/\{\{n\}\}/g, String(diffDays));
  }

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatReadAt(isoString: string | undefined): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
