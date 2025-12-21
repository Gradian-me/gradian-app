// Component Renderer Utility
// Renders custom components based on metadata configuration

import React from 'react';
import { motion } from 'framer-motion';
import { KPIIndicator } from '../../analytics/indicators/kpi-indicator/components/KPIIndicator';
import { ComponentRendererConfig, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { resolveFieldById } from '../../form-builder/form-elements/utils/field-resolver';
import { cn } from '../../shared/utils';

export interface ComponentRendererProps {
  config: ComponentRendererConfig;
  schema: FormSchema;
  data: any;
  index?: number;
  disableAnimation?: boolean;
  className?: string;
  // Component registry for custom components
  customComponents?: Record<string, React.ComponentType<any>>;
}

/**
 * Get nested value from object by path string (e.g., 'performanceMetrics.onTimeDelivery')
 */
const getValueByPath = (obj: any, path: string): any => {
  const keys = path.split('.');
  let value = obj;
  // SECURITY: Prevent prototype pollution by validating keys
  const PROTOTYPE_POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];
  
  for (const key of keys) {
    // SECURITY: Skip prototype pollution keys
    if (PROTOTYPE_POLLUTION_KEYS.includes(key)) {
      return null;
    }
    // SECURITY: Use hasOwnProperty check for objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        return null;
      }
    }
    value = value?.[key];
    if (value === undefined) return null;
  }
  return value;
};

/**
 * Extract component props from field IDs or data path
 */
const extractComponentData = (
  config: ComponentRendererConfig,
  schema: FormSchema,
  data: any
): Record<string, any> => {
  const props: Record<string, any> = {};

  // If dataPath is specified, use it
  if (config.dataPath) {
    const rawValue = getValueByPath(data, config.dataPath);
    
    // Handle array of metrics (like performanceMetrics)
    if (Array.isArray(rawValue)) {
      // Extract metric ID from component ID
      const metricId = config.id.includes('on-time') || config.id.includes('onTime') ? 'onTimeDelivery' :
                      config.id.includes('quality') ? 'qualityScore' :
                      config.id.includes('total-orders') || config.id.includes('totalOrders') ? 'totalOrders' :
                      config.id.includes('total-value') || config.id.includes('totalValue') ? 'totalValue' : null;
      
      if (metricId) {
        const metric = rawValue.find((m: any) => m.id === metricId);
        props.value = metric?.value || 0;
        
        // Calculate previousValue if trend exists (simplified - would come from historical data)
        if (metric?.value && config.config?.trend?.enabled) {
          props.previousValue = Math.max(0, metric.value - (metric.value * 0.1)); // 10% less as placeholder
        }
      } else {
        // Default: use first item's value
        props.value = rawValue[0]?.value || 0;
      }
    } else {
      props.value = rawValue;
    }
  }

  // If fieldIds are specified, extract data from fields
  if (config.fieldIds && config.fieldIds.length > 0) {
    config.fieldIds.forEach(fieldId => {
      const field = resolveFieldById(schema, fieldId);
      if (field && data[field.name] !== undefined) {
        // Use field name as key, or a default key
        const key = field.name;
        props[key] = data[field.name];
        
        // If value is not set yet, use the first field's value
        if (!props.value) {
          props.value = data[field.name];
        }
      }
    });
  }

  return props;
};

/**
 * Component Renderer
 * Renders components like KPIIndicator, charts, or custom components based on metadata
 */
export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  config,
  schema,
  data,
  index = 0,
  disableAnimation = false,
  className,
  customComponents = {}
}) => {
  const colSpan = config.colSpan || 1;
  const componentData = extractComponentData(config, schema, data);

  // Merge config.props with extracted data
  const componentProps: Record<string, any> = {
    ...config.props,
    ...componentData,
    // Add config if it's a KPI component
    ...(config.componentType === 'kpi' && config.config ? { config: config.config } : {})
  };

  const {
    value: extractedValue,
    currentValue,
    previousValue,
    target,
    ...restComponentProps
  } = componentProps;

  const resolveNumber = (val: unknown, fallback?: number) => {
    if (typeof val === 'number') {
      return Number.isFinite(val) ? val : fallback;
    }

    if (val === null || val === undefined || val === '') {
      return fallback;
    }

    const numeric = Number(val);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const resolvedValue = resolveNumber(
    extractedValue ?? currentValue,
    0
  ) ?? 0;

  const resolvedPreviousValue = resolveNumber(previousValue, undefined);
  const resolvedTargetValue = resolveNumber(target, undefined);

  const wrapperClasses = cn(
    "h-full",
    colSpan === 2 && "lg:col-span-2",
    colSpan === 3 && "lg:col-span-3",
    className
  );

  const renderComponent = () => {
    switch (config.componentType) {
      case 'kpi':
        // Render KPIIndicator
        return (
          <KPIIndicator
            config={config.config}
            value={resolvedValue}
            previousValue={resolvedPreviousValue}
            target={resolvedTargetValue}
            {...restComponentProps}
          />
        );

      case 'metric':
        // For now, render as KPI (can be extended later)
        return (
          <KPIIndicator
            config={config.config || { title: config.id, format: 'number' }}
            value={resolvedValue}
            previousValue={resolvedPreviousValue}
            {...restComponentProps}
          />
        );

      case 'chart':
        // Chart rendering can be added later
        // For now, return a placeholder
        return (
          <div className="p-4 border rounded-lg text-center text-gray-500">
            Chart component: {config.componentName || 'Chart'}
          </div>
        );

      case 'custom':
        // Render custom component from registry
        if (config.componentName && customComponents[config.componentName]) {
          const CustomComponent = customComponents[config.componentName];
          return <CustomComponent {...componentProps} />;
        }
        return (
          <div className="p-4 border rounded-lg text-center text-gray-500">
            Custom component not found: {config.componentName}
          </div>
        );

      default:
        return (
          <div className="p-4 border rounded-lg text-center text-gray-500">
            Unknown component type: {config.componentType}
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={disableAnimation ? false : { opacity: 0, y: 20 }}
      animate={disableAnimation ? false : { opacity: 1, y: 0 }}
      transition={disableAnimation ? {} : {
        duration: 0.3,
        delay: index * 0.1
      }}
      className={wrapperClasses}
    >
      {renderComponent()}
    </motion.div>
  );
};

ComponentRenderer.displayName = 'ComponentRenderer';

