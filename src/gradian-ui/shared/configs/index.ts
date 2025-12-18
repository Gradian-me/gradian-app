// Shared Configuration for Gradian UI Components

import { ThemeConfig, LayoutConfig, ChartConfig } from '../types';

// Export cache configuration
export * from './cache-config';

// Export application configuration files
export * from './auth-config';
export * from './ui-config';
export * from './log-config';
export * from './general-config';
export * from './env-config';

/**
 * Default theme configuration
 */
export const defaultTheme: ThemeConfig = {
  primary: '#3B82F6',
  secondary: '#6B7280',
  accent: '#F59E0B',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
};

/**
 * Dark theme configuration
 */
export const darkTheme: ThemeConfig = {
  primary: '#60A5FA',
  secondary: '#9CA3AF',
  accent: '#FBBF24',
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#374151',
  error: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  info: '#60A5FA',
};

/**
 * Default layout configuration
 */
export const defaultLayout: LayoutConfig = {
  columns: 12,
  gap: 16,
  padding: 16,
  margin: 16,
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

/**
 * Default chart configuration
 */
export const defaultChartConfig: ChartConfig = {
  width: 400,
  height: 300,
  responsive: true,
  theme: 'light',
  showLegend: true,
  showTooltip: true,
  animation: true,
  colors: [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ],
};

/**
 * Form validation patterns
 */
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+(\.\d+)?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  creditCard: /^[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}$/,
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
};

/**
 * Common form field configurations
 */
export const commonFieldConfigs = {
  email: {
    type: 'email' as const,
    validation: {
      required: true,
      pattern: validationPatterns.email,
    },
  },
  password: {
    type: 'password' as const,
    validation: {
      required: true,
      minLength: 8,
    },
  },
  phone: {
    type: 'tel' as const,
    validation: {
      pattern: validationPatterns.phone,
    },
  },
  url: {
    type: 'url' as const,
    validation: {
      pattern: validationPatterns.url,
    },
  },
  number: {
    type: 'number' as const,
    validation: {
      pattern: validationPatterns.decimal,
    },
  },
  date: {
    type: 'date' as const,
    validation: {
      pattern: validationPatterns.date,
    },
  },
};

/**
 * Animation configurations
 */
export const animationConfigs = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },
  slideIn: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
    transition: { duration: 0.3 },
  },
  scaleIn: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
    transition: { duration: 0.2 },
  },
  bounce: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

/**
 * Responsive breakpoint utilities
 */
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
};

/**
 * Z-index scale
 */
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
};

/**
 * Spacing scale
 */
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  56: '14rem',
  64: '16rem',
};

/**
 * Border radius scale
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

/**
 * Shadow configurations
 */
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: '0 0 #0000',
};
