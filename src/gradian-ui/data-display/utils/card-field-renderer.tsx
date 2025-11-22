import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { DynamicMetricRenderer } from '../components/DynamicMetricRenderer';
import { formatNumber } from '../../shared/utils/number-formatter';
import { cn } from '../../shared/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RenderFieldValueProps {
  field: any;
  value: any;
  maxMetrics?: number;
}

/**
 * Helper function to wrap content with tooltip showing field label
 */
const withTooltip = (content: React.ReactNode, field: any): React.ReactNode => {
  // Get label from field - prioritize label, then fallback to name
  // Ensure we're getting the actual label, not the value
  let fieldLabel = 'Field';
  
  if (field) {
    // First try field.label - this is the proper label from the schema
    if (field.label && typeof field.label === 'string' && field.label.trim() !== '') {
      fieldLabel = field.label.trim();
    } 
    // Fallback to field.name if label doesn't exist or is empty
    else if (field.name && typeof field.name === 'string' && field.name.trim() !== '') {
      // Format the name to be more readable (convert camelCase to Title Case)
      const formattedName = field.name
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
        .trim();
      fieldLabel = formattedName;
    }
  }
  
  return (
    <TooltipProvider disableHoverableContent>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-default">
            {content}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{fieldLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Format date string to remove "T" and make it more readable
 */
const formatDateValue = (value: any): string => {
  if (!value) return '';
  
  const dateStr = String(value);
  // Remove "T" and replace with space, also remove timezone info if present
  return dateStr
    .replace(/T/g, ' ') // Replace T with space
    .replace(/\.\d{3}Z?$/i, '') // Remove milliseconds and Z if present
    .replace(/Z$/i, '') // Remove trailing Z
    .trim();
};

/**
 * Extract labels from an array of values, prioritizing 'label' property.
 */
const extractLabels = (values: any[]): string[] => {
  const labels: string[] = [];
  for (const item of values) {
    if (typeof item === 'string') {
      labels.push(item);
    } else if (typeof item === 'object' && item !== null && 'label' in item) {
      labels.push(item.label);
    } else if (typeof item === 'object' && item !== null && 'name' in item) {
      labels.push(item.name);
    }
  }
  return labels;
};

/**
 * Render a field value based on its type
 */
export const renderFieldValue = ({ field, value, maxMetrics = 3 }: RenderFieldValueProps): React.ReactNode => {
  if (!value) return 'N/A';
  
  const fieldLabel = field?.label || field?.name || 'Field';
  
  // Format date values before rendering
  const formattedValue = (field.component === 'date' || field.component === 'datetime-local') 
    ? formatDateValue(value) 
    : value;
  
  // Handle performanceMetrics array
  if (field.name === 'performanceMetrics') {
    // If it's already an array of metric objects
    if (Array.isArray(value)) {
      return withTooltip(
        <DynamicMetricRenderer 
          metrics={value}
          maxMetrics={maxMetrics}
          badgeVariant="outline"
          className="mt-1"
        />,
        field
      );
    }
    // If it's an object, convert to array format
    else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      const metrics = Object.entries(value).map(([key, val]) => {
        // Convert to Pascal Case with spaces
        const pascalCaseLabel = key
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
          
        return {
          id: key,
          label: pascalCaseLabel,
          value: typeof val === 'number' || typeof val === 'string' ? val : String(val), // Ensure value is string or number
          unit: typeof val === 'number' && key.toLowerCase().includes('score') ? '' : 
                typeof val === 'number' && key.toLowerCase().includes('orders') ? '' : '%',
          trend: 'none' as const
        };
      });
      
      return withTooltip(
        <DynamicMetricRenderer 
          metrics={metrics}
          maxMetrics={maxMetrics}
          badgeVariant="outline"
          className="mt-1"
        />,
        field
      );
    }
  }
  
  // Handle checkbox/list-like fields first
  if (Array.isArray(value)) {
    const labels = extractLabels(value);
    if (labels.length > 0) {
      return withTooltip(
        <div className="flex flex-wrap gap-1">
          {labels.slice(0, 2).map((label: string, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.05,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Badge variant="secondary" className="text-xs">
                {label}
              </Badge>
            </motion.div>
          ))}
          {labels.length > 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: 0.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <Badge variant="secondary" className="text-xs">
                +{labels.length - 2}
              </Badge>
            </motion.div>
          )}
        </div>,
        field
      );
    }
  }

  // Handle picker/select values passed as array of option objects
  const normalizedValueArray = Array.isArray(value) ? value : [value];
  const normalizedLabels = extractLabels(normalizedValueArray);
  const normalizedSingle = normalizedLabels.length > 0 ? normalizedLabels[0] : undefined;

  // Check if field has a custom icon defined
  const customIcon = field?.icon ? <IconRenderer iconName={field.icon} className="h-4 w-4 shrink-0" /> : null;

  // Handle date and datetime fields
  if (field.component === 'date' || field.component === 'datetime-local') {
    const dateValue = formatDateValue(value);
    return withTooltip(
      <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-200">
        {customIcon || <IconRenderer iconName="Calendar" className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />}
        <span>{dateValue}</span>
      </div>,
      field
    );
  }
  
  switch (field.component) {
    case 'email':
      return withTooltip(
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-200">
          {customIcon || <IconRenderer iconName="Mail" className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />}
          <span className="truncate">{normalizedSingle ?? value}</span>
        </div>,
        field
      );
    case 'tel':
      return withTooltip(
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-200">
          {customIcon || <IconRenderer iconName="Phone" className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />}
          <span>{normalizedSingle ?? value}</span>
        </div>,
        field
      );
    case 'url': {
      const stringValue = String(value);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      if (!isUrl) {
        return withTooltip(
          <span className="text-gray-700 dark:text-gray-200">{stringValue}</span>,
          field
        );
      }
      // Get link label from componentTypeConfig or use default
      const linkLabel = field?.componentTypeConfig?.label || 'show more';
      const urlToOpen = stringValue.startsWith('//') ? `https:${stringValue}` : stringValue;
      return withTooltip(
        <div className="flex items-center space-x-2">
          {customIcon || <IconRenderer iconName="Link" className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />}
          <a
            href={urlToOpen}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-300 underline transition-colors duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {linkLabel}
          </a>
        </div>,
        field
      );
    }
    case 'textarea':
      return withTooltip(
        <div className="text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-200">
          <span className="line-clamp-2">{normalizedSingle ?? value}</span>
        </div>,
        field
      );
    case 'checkbox':
      if (Array.isArray(value)) {
        return withTooltip(
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 2).map((item: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: idx * 0.05,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge variant="secondary" className="text-xs">
                  {item}
                </Badge>
              </motion.div>
            ))}
            {value.length > 2 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: Math.min(2, value.length) * 0.05,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge variant="outline" className="text-xs">
                  +{value.length - 2}
                </Badge>
              </motion.div>
            )}
          </div>,
          field
        );
      }
      return withTooltip(
        <span>{value ? 'Yes' : 'No'}</span>,
        field
      );
    case 'select':
      return withTooltip(
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-200">
          {customIcon || <IconRenderer iconName="Text" className="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400" />}
          <span>{value}</span>
        </div>,
        field
      );
    case 'number': {
      const parsedValue =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? parseFloat(value.replace(/,/g, ''))
            : NaN;
      const displayValue = Number.isFinite(parsedValue) ? formatNumber(parsedValue) : value;

      return withTooltip(
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-200">
          {customIcon || <IconRenderer iconName="Hash" className="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400" />}
          <span className="whitespace-nowrap">{displayValue}</span>
        </div>,
        field
      );
    }
    default:
      // For default text fields, check if value looks like a date string and format it
      const displayValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)
        ? formatDateValue(value)
        : formattedValue;
      
      // For default text fields, use custom icon if provided
      if (customIcon) {
        return withTooltip(
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors duration-200">
            {React.cloneElement(customIcon, {
              className: cn(customIcon.props.className, 'text-gray-500 dark:text-gray-400')
            })}
            <span>{displayValue}</span>
          </div>,
          field
        );
      }
      const stringValue = String(value);
      const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://') || stringValue.startsWith('//');
      // Check if it's a URL field type even if not explicitly in the switch
      if (isUrl && field?.component === 'url') {
        const linkLabel = field?.componentTypeConfig?.label || 'show more';
        const urlToOpen = stringValue.startsWith('//') ? `https:${stringValue}` : stringValue;
        return withTooltip(
          <div className="flex items-center space-x-2">
            {customIcon || <IconRenderer iconName="Link" className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />}
            <a
              href={urlToOpen}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-300 underline transition-colors duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {linkLabel}
            </a>
          </div>,
          field
        );
      }
      return (
        <span className={cn(
          isUrl || stringValue.length > 50 ? "overflow-wrap-anywhere" : undefined,
          "text-gray-700 dark:text-gray-200"
        )}>
          {normalizedSingle ?? stringValue}
        </span>
      );
  }
};

