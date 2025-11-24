/**
 * Metric Card Types
 */

import { BaseComponentProps } from '@/gradian-ui/shared/types';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export type TailwindColor = 
  | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime'
  | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky'
  | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia'
  | 'pink' | 'rose';

export interface MetricItem {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  icon?: LucideIcon | string | ReactNode;
  iconColor?: TailwindColor;
  format?: 'number' | 'currency' | 'percentage' | 'custom';
  precision?: number;
  prefix?: string; // e.g., "$" for currency
}

export interface MetricCardProps extends BaseComponentProps {
  /**
   * Array of metrics to display (typically 2 for side-by-side layout)
   */
  metrics: MetricItem[];
  
  /**
   * Optional footer message/description
   */
  footer?: {
    icon?: LucideIcon | string | ReactNode;
    text: string;
  };
  
  /**
   * Gradient color scheme
   */
  gradient?: TailwindColor;
  
  /**
   * Show decorative pattern overlay
   */
  showPattern?: boolean;
  
  /**
   * Layout: 'grid' for side-by-side, 'stack' for vertical
   */
  layout?: 'grid' | 'stack';
  
  /**
   * Number of columns for grid layout
   */
  columns?: 1 | 2 | 3 | 4;
  
  /**
   * Enable ping animation on individual metric value changes
   * @default false
   */
  pingOnChange?: boolean;
  
  /**
   * Function to get the raw value for a metric ID (for ping tracking)
   * Should return the actual value to track changes, not the formatted display value
   */
  getMetricValue?: (metricId: string) => any;
  
  /**
   * Ping color for each metric (optional, defaults to metric's iconColor or 'blue')
   */
  getPingColor?: (metric: MetricItem) => 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'gray';
}

