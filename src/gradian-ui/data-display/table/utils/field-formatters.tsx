import React from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/gradian-ui/shared/utils';
import { BadgeViewer } from '@/gradian-ui/form-builder/form-elements/utils/badge-viewer';
import type { BadgeItem } from '@/gradian-ui/form-builder/form-elements/utils/badge-viewer';
import { Badge } from '@/gradian-ui/form-builder/form-elements/components/Badge';
import { IconRenderer, isValidLucideIcon } from '@/gradian-ui/shared/utils/icon-renderer';
import { getBadgeConfig, mapBadgeColorToVariant } from '../../utils';
import { normalizeOptionArray } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import {
  getDisplayStrings,
  getJoinedDisplayString,
  getPickerDisplayValue,
  renderRatingValue,
} from '../../utils/value-display';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar } from '@/gradian-ui/form-builder/form-elements/components/Avatar';
import { ForceIcon } from '@/gradian-ui/form-builder/form-elements/components/ForceIcon';
import { toast } from 'sonner';

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

// Helper to wrap content with ForceIcon if isForce is true and field is title role
const wrapWithForceIcon = (content: React.ReactNode, isForce: boolean, field?: any, row?: any): React.ReactNode => {
  // Only show ForceIcon for title role fields
  if (!isForce || field?.role !== 'title') return content;
  // Get title from row data
  const titleValue = row ? getFieldValue(field, row) : undefined;
  const title = titleValue ? String(titleValue).trim() : undefined;
  return (
    <span className="inline-flex items-center gap-1.5">
      <ForceIcon isForce={isForce} size="md" forceReason={row?.forceReason} title={title} />
      {content}
    </span>
  );
};

export const formatFieldValue = (
  field: any,
  value: any,
  row?: any,
  showForceIcon: boolean = true
): React.ReactNode => {
  // Check if row has isForce flag - only show for title role fields
  const isForce = showForceIcon && row?.isForce === true && field?.role === 'title';
  
  if (value === null || value === undefined || value === '') {
    // Still show ForceIcon even if value is empty (only for title role)
    if (isForce && field?.role === 'title') {
      return (
        <span className="inline-flex items-center gap-1.5">
          <ForceIcon isForce={isForce} size="md" forceReason={row?.forceReason} />
          <span className="text-gray-400">—</span>
        </span>
      );
    }
    return <span className="text-gray-400">—</span>;
  }

  const normalizedOptions = normalizeOptionArray(value);
  const displayStrings = getDisplayStrings(value);
  const hasStructuredOptions =
    displayStrings.length > 0 &&
    (Array.isArray(value) || (typeof value === 'object' && value !== null));

  if (field?.component === 'picker' && field.targetSchema && row) {
    const pickerDisplay = getPickerDisplayValue(field, value, { row });
    if (pickerDisplay) {
      return wrapWithForceIcon(<span>{pickerDisplay}</span>, isForce, field, row);
    }
    return isForce && field?.role === 'title' ? (
      <span className="inline-flex items-center gap-1.5">
        <ForceIcon isForce={isForce} size="md" forceReason={row?.forceReason} />
        <span className="text-gray-400">—</span>
      </span>
    ) : <span className="text-gray-400">—</span>;
  }

  const displayType = field?.component || 'text';
  const componentType = (field?.component || '').toString().toLowerCase();

  // Handle password fields - show masked value
  if (displayType === 'password' || componentType === 'password') {
    const passwordLength = String(value).length;
    const maskedValue = '•'.repeat(Math.max(8, Math.min(passwordLength, 20)));
    return (
      <span className="font-mono text-gray-600 dark:text-gray-400">
        {maskedValue}
      </span>
    );
  }

  // Handle color fields - show colored circle with color code on hover, copy on click
  if (displayType === 'color-picker' || componentType === 'color-picker' || componentType === 'color') {
    const colorValue = String(value).trim();
    // Validate hex color format
    const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue);
    const displayColor = isValidHex ? colorValue : '#808080'; // Default gray if invalid
    
    const handleCopyColor = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(colorValue);
        toast.success(`Color code ${colorValue} copied to clipboard`);
      } catch (err) {
        toast.error('Failed to copy color code');
      }
    };
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm cursor-pointer hover:scale-110 transition-transform duration-200"
              style={{ backgroundColor: displayColor }}
              onClick={handleCopyColor}
              title={`Click to copy ${colorValue}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-sm">{colorValue}</p>
            <p className="text-xs text-gray-500 mt-1">Click to copy</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Handle icon fields - show icon using IconRenderer
  if (displayType === 'icon' || componentType === 'icon' || field?.role === 'icon') {
    const iconName = String(value).trim();
    if (!iconName) {
      return <span className="text-gray-400">—</span>;
    }
    
    if (!isValidLucideIcon(iconName)) {
      return <span className="text-gray-600 dark:text-gray-300">{iconName}</span>;
    }
    
    return (
      <div className="inline-flex items-center">
        <IconRenderer iconName={iconName} className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </div>
    );
  }

  // Handle avatar fields - show avatar image from URL
  if (displayType === 'avatar' || componentType === 'avatar' || field?.role === 'avatar' || field?.role === 'image') {
    const avatarUrl = String(value).trim();
    // Check if it's a valid URL
    const isValidUrl = avatarUrl && (
      avatarUrl.startsWith('http://') || 
      avatarUrl.startsWith('https://') || 
      avatarUrl.startsWith('//') ||
      avatarUrl.startsWith('/')
    );
    
    // Get fallback text from title field or field name
    const getInitials = (text: string): string => {
      if (!text) return '?';
      const words = text.trim().split(/\s+/);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return text.substring(0, 2).toUpperCase();
    };
    
    const titleField = row ? (row.name || row.title || row.label || '') : '';
    const fallbackText = getInitials(titleField);
    
    if (isValidUrl) {
      const normalizedUrl = avatarUrl.startsWith('//') ? `https:${avatarUrl}` : avatarUrl;
      return (
        <Avatar
          src={normalizedUrl}
          alt={titleField || 'Avatar'}
          fallback={fallbackText}
          size="md"
          variant="default"
          className="border border-gray-200 dark:border-gray-700"
        >
          {fallbackText}
        </Avatar>
      );
    }
    
    // If not a valid URL, show fallback avatar
    return (
      <Avatar
        alt={titleField || 'Avatar'}
        fallback={fallbackText}
        size="md"
        variant="default"
        className="border border-gray-200 dark:border-gray-700"
      >
        {fallbackText}
      </Avatar>
    );
  }

  if (field?.role === 'status') {
    const statusOptions = field.options || [];
    const primaryOption = normalizedOptions[0];
    const statusValue = primaryOption?.id ?? String(
      Array.isArray(value) ? value[0] : value
    );
    const badgeConfig = getBadgeConfig(statusValue, statusOptions);
    const badgeColor = primaryOption?.color ?? field.roleColor ?? badgeConfig.color;
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
  const componentKey = (field?.component || '').toString().toLowerCase();
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

    return wrapWithForceIcon(
      <BadgeViewer
        field={field}
        value={value}
        badgeVariant={field.roleColor || "default"}
        enforceVariant
        animate={true}
        onBadgeClick={field?.targetSchema ? handleBadgeClick : undefined}
        isItemClickable={
          field?.targetSchema
            ? (item) => Boolean(item.normalized?.id ?? item.id)
            : () => false
        }
      />,
      isForce,
      field,
      row
    );
  }

  switch (displayType) {
    case 'currency':
      return wrapWithForceIcon(
        <span className="whitespace-nowrap">
          {formatCurrency(typeof value === 'number' ? value : parseFloat(value) || 0)}
        </span>,
        isForce,
        field,
        row
      );
    case 'percentage': {
      const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
      return wrapWithForceIcon(
        <span className="whitespace-nowrap">{numValue.toFixed(2)}%</span>,
        isForce,
        field,
        row
      );
    }
    case 'number':
      return wrapWithForceIcon(
        <span className="whitespace-nowrap">
          {formatNumber(typeof value === 'number' ? value : parseFloat(value) || 0)}
        </span>,
        isForce,
        field,
        row
      );
    case 'date':
    case 'datetime-local':
      try {
        const dateValue = typeof value === 'string' ? new Date(value) : value;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          return wrapWithForceIcon(
            <span>
              {formatDate(dateValue, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>,
            isForce,
            field,
            row
          );
        }
        return wrapWithForceIcon(<span>{String(value)}</span>, isForce, field, row);
      } catch {
        return wrapWithForceIcon(<span>{String(value)}</span>, isForce, field, row);
      }
    case 'url': {
      const stringValue = String(value);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      if (!isUrl) {
        return wrapWithForceIcon(<span>{stringValue}</span>, isForce, field, row);
      }
      // Get link label from componentTypeConfig or use default
      const linkLabel = field?.componentTypeConfig?.label || 'URL';
      const urlToOpen = stringValue.startsWith('//') ? `https:${stringValue}` : stringValue;
      return wrapWithForceIcon(
        <a
          href={urlToOpen}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-400 underline transition-colors duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          {linkLabel}
        </a>,
        isForce,
        field,
        row
      );
    }
    case 'array':
    case 'checkbox':
      if (displayStrings.length > 0) {
        return wrapWithForceIcon(<span>{displayStrings.join(', ')}</span>, isForce, field, row);
      }
      if (Array.isArray(value)) {
        return wrapWithForceIcon(<span>{value.join(', ')}</span>, isForce, field, row);
      }
      return wrapWithForceIcon(<span>{String(value)}</span>, isForce, field, row);
    default:
      if (hasStructuredOptions) {
        const joined = getJoinedDisplayString(value);
        if (joined) {
          return wrapWithForceIcon(<span>{joined}</span>, isForce, field, row);
        }
      }
      if (normalizedOptions.length > 0 && !(Array.isArray(value) || typeof value === 'object')) {
        const label = normalizedOptions[0].label ?? normalizedOptions[0].id;
        return wrapWithForceIcon(<span>{String(label)}</span>, isForce, field, row);
      }
      // Check if it's a URL even if not explicitly typed as url
      const stringValue = String(value);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      if (isUrl && field?.component === 'url') {
        const linkLabel = field?.componentTypeConfig?.label || 'URL';
        const urlToOpen = stringValue.startsWith('//') ? `https:${stringValue}` : stringValue;
        return wrapWithForceIcon(
          <a
            href={urlToOpen}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-400 underline transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            {linkLabel}
          </a>,
          isForce,
          field,
          row
        );
      }
      return wrapWithForceIcon(<span>{stringValue}</span>, isForce, field, row);
  }
};


