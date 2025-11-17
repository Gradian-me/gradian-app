import React from 'react';
import { formatCurrency, formatDate, formatNumber } from '@/gradian-ui/shared/utils';
import { BadgeViewer } from '@/gradian-ui/form-builder/form-elements/utils/badge-viewer';
import type { BadgeItem } from '@/gradian-ui/form-builder/form-elements/utils/badge-viewer';
import { Badge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { getBadgeConfig, mapBadgeColorToVariant } from '../../utils';
import { normalizeOptionArray } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import {
  getDisplayStrings,
  getJoinedDisplayString,
  getPickerDisplayValue,
  renderRatingValue,
} from '../../utils/value-display';

export const getFieldValue = (field: any, row: any): any => {
  if (!field || !row) return null;

  if (field.source) {
    const path = field.source.split('.');
    let value = row;
    for (const key of path) {
      value = value?.[key];
      if (value === undefined) return null;
    }
    return value;
  }

  if (field.compute && typeof field.compute === 'function') {
    return field.compute(row);
  }

  return row[field.name];
};

export const formatRelationType = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value.replace(/_/g, ' ').toLowerCase();
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatFieldValue = (
  field: any,
  value: any,
  row?: any
): React.ReactNode => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">—</span>;
  }

  const normalizedOptions = normalizeOptionArray(value);
  const displayStrings = getDisplayStrings(value);
  const hasStructuredOptions =
    displayStrings.length > 0 &&
    (Array.isArray(value) || (typeof value === 'object' && value !== null));

  if (field?.type === 'picker' && field.targetSchema && row) {
    const pickerDisplay = getPickerDisplayValue(field, value, { row });
    if (pickerDisplay) {
      return <span>{pickerDisplay}</span>;
    }
    return <span className="text-gray-400">—</span>;
  }

  const displayType = field?.type || 'text';

  if (field?.role === 'status') {
    const statusOptions = field.options || [];
    const primaryOption = normalizedOptions[0];
    const statusValue = primaryOption?.id ?? String(
      Array.isArray(value) ? value[0] : value
    );
    const badgeConfig = getBadgeConfig(statusValue, statusOptions);
    const badgeColor = primaryOption?.color ?? badgeConfig.color;
    const badgeIcon = primaryOption?.icon ?? badgeConfig.icon;
    const badgeLabel = primaryOption?.label ?? badgeConfig.label;
    return (
      <div className="inline-flex items-center whitespace-nowrap">
        <Badge
          variant={mapBadgeColorToVariant(badgeColor)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] leading-tight w-auto whitespace-nowrap"
        >
          {badgeIcon && <IconRenderer iconName={badgeIcon} className="h-2.5 w-2.5" />}
          <span>{badgeLabel}</span>
        </Badge>
      </div>
    );
  }

  if (field?.role === 'rating') {
    return (
      <div className="inline-flex items-center">
        {renderRatingValue(value, { size: 'sm', showValue: true })}
      </div>
    );
  }

  const candidateComponents = new Set([
    'select',
    'checkbox',
    'radio',
    'popup-picker',
    'popuppicker',
    'popup-picker-input',
    'picker',
    'pickerinput',
    'combo',
    'multiselect',
    'multi-select',
  ]);
  const componentKey = (field?.component || field?.type || '').toString().toLowerCase();
  const hasFieldOptions = Array.isArray(field?.options) && field.options.length > 0;
  const shouldRenderAsBadges =
    (field?.role === 'badge' || candidateComponents.has(componentKey)) &&
    (hasStructuredOptions || hasFieldOptions || Array.isArray(value));

  if (shouldRenderAsBadges) {
    const handleBadgeClick = (item: BadgeItem) => {
      const candidateId = item.normalized?.id ?? item.id;
      if (!candidateId) return;
      const targetSchema = field?.targetSchema;
      if (!targetSchema) return;

      const url = `/page/${targetSchema}/${encodeURIComponent(candidateId)}?showBack=true`;
      if (typeof window !== 'undefined') {
        window.open(url, '_self');
      }
    };

    return (
      <BadgeViewer
        field={field}
        value={value}
        badgeVariant="default"
        enforceVariant
        animate={true}
        onBadgeClick={field?.targetSchema ? handleBadgeClick : undefined}
        isItemClickable={
          field?.targetSchema
            ? (item) => Boolean(item.normalized?.id ?? item.id)
            : () => false
        }
      />
    );
  }

  switch (displayType) {
    case 'currency':
      return (
        <span className="whitespace-nowrap">
          {formatCurrency(typeof value === 'number' ? value : parseFloat(value) || 0)}
        </span>
      );
    case 'percentage': {
      const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
      return <span className="whitespace-nowrap">{numValue.toFixed(2)}%</span>;
    }
    case 'number':
      return (
        <span className="whitespace-nowrap">
          {formatNumber(typeof value === 'number' ? value : parseFloat(value) || 0)}
        </span>
      );
    case 'date':
    case 'datetime-local':
      try {
        const dateValue = typeof value === 'string' ? new Date(value) : value;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          return (
            <span>
              {formatDate(dateValue, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          );
        }
        return <span>{String(value)}</span>;
      } catch {
        return <span>{String(value)}</span>;
      }
    case 'url':
    case 'url-input': {
      const stringValue = String(value);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      if (!isUrl) {
        return <span>{stringValue}</span>;
      }
      // Get link label from componentTypeConfig or use default
      const linkLabel = field?.componentTypeConfig?.label || 'show more';
      const urlToOpen = stringValue.startsWith('//') ? `https:${stringValue}` : stringValue;
      return (
        <a
          href={urlToOpen}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 underline transition-colors duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {linkLabel}
        </a>
      );
    }
    case 'array':
    case 'checkbox':
      if (displayStrings.length > 0) {
        return <span>{displayStrings.join(', ')}</span>;
      }
      if (Array.isArray(value)) {
        return <span>{value.join(', ')}</span>;
      }
      return <span>{String(value)}</span>;
    default:
      if (hasStructuredOptions) {
        const joined = getJoinedDisplayString(value);
        if (joined) {
          return <span>{joined}</span>;
        }
      }
      if (normalizedOptions.length > 0 && !(Array.isArray(value) || typeof value === 'object')) {
        const label = normalizedOptions[0].label ?? normalizedOptions[0].id;
        return <span>{String(label)}</span>;
      }
      // Check if it's a URL even if not explicitly typed as url
      const stringValue = String(value);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      if (isUrl && (field?.type === 'url' || field?.component === 'url-input' || field?.component === 'url')) {
        const linkLabel = field?.componentTypeConfig?.label || 'show more';
        const urlToOpen = stringValue.startsWith('//') ? `https:${stringValue}` : stringValue;
        return (
          <a
            href={urlToOpen}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 underline transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {linkLabel}
          </a>
        );
      }
      return <span>{stringValue}</span>;
  }
};


