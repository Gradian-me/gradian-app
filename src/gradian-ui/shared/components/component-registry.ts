export type ComponentCategory =
  | 'form-elements'
  | 'data-display'
  | 'analytics'
  | 'layout'
  | 'shared';

export interface ComponentMeta {
  id: string;
  label: string;
  color?: string;
  icon?: string; // lucide icon name compatible with IconRenderer
  category: ComponentCategory;
  description?: string;
  usecase?: string;
  directory: string; // relative path in repo
  configSchema?: ComponentConfigSchema; // Configuration schema for this component
}

// Component-specific configuration types
export type ComponentConfigValue = 
  | NumberInputConfig
  | TextInputConfig
  | DateInputConfig
  | SelectConfig
  | SliderConfig
  | TextareaConfig
  | PhoneInputConfig
  | EmailInputConfig
  | URLInputConfig
  | CodeViewerConfig;

// NumberInput configuration
export interface NumberInputConfig {
  useThousandSeparator?: boolean; // Default: true
  decimalPoints?: number; // Number of decimal places (0-10, undefined = no limit)
  min?: number;
  max?: number;
  step?: number | string;
  allowNegative?: boolean; // Default: true
}

// TextInput configuration
export interface TextInputConfig {
  maxLength?: number;
  minLength?: number;
  pattern?: string; // Regex pattern as string
  inputType?: 'text' | 'password' | 'search' | 'url' | 'tel';
  autoComplete?: string;
}

// DateInput configuration
export interface DateInputConfig {
  minDate?: string; // ISO date string
  maxDate?: string; // ISO date string
  format?: string; // Date format string
  showTime?: boolean; // For datetime inputs
  timeFormat?: '12h' | '24h';
}

// Select configuration
export interface SelectConfig {
  allowSearch?: boolean; // Default: false
  allowClear?: boolean; // Default: false
  multiple?: boolean; // Default: false
  maxSelections?: number; // For multiple select
}

// Slider configuration
export interface SliderConfig {
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean; // Default: true
  showMarks?: boolean; // Default: false
  marks?: Array<{ value: number; label: string }>;
}

// Textarea configuration
export interface TextareaConfig {
  rows?: number; // Default: 4
  maxLength?: number;
  minLength?: number;
  autoResize?: boolean; // Default: false
}

// PhoneInput configuration
export interface PhoneInputConfig {
  countryCode?: string; // Default: 'US'
  format?: 'international' | 'national' | 'e164';
  allowExtensions?: boolean; // Default: false
}

// EmailInput configuration
export interface EmailInputConfig {
  allowMultiple?: boolean; // Default: false (comma-separated emails)
  validateDomain?: boolean; // Default: false
  allowedDomains?: string[]; // Whitelist of allowed domains
}

// URLInput configuration
export interface URLInputConfig {
  requireProtocol?: boolean; // Default: false (auto-add https:// if missing)
  allowedProtocols?: string[]; // Whitelist of allowed protocols (e.g., ['http', 'https'])
  label?: string; // Label for the link (default: "show more")
}

// CodeViewer configuration
export interface CodeViewerConfig {
  programmingLanguage?: 'bash' | 'sh' | 'shell' | 'json' | 'yaml' | 'yml' | 'html' | 'css' | 'scss' | 'js' | 'jsx' | 'ts' | 'tsx' | 'python' | 'go' | 'rust' | 'java' | 'c' | 'cpp' | 'sql' | string; // Default: 'ts'
  title?: string; // Default: 'Code Snippet'
}

// Configuration schema definition for component config editor
export interface ComponentConfigSchema {
  fields: ComponentConfigField[];
}

export interface ComponentConfigField {
  name: string;
  label: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  description?: string;
  defaultValue?: any;
  options?: Array<{ value: any; label: string }>; // For select type
  min?: number; // For number type
  max?: number; // For number type
  step?: number; // For number type
}

// Load ALL components from JSON file (server-side only)
// Client-side should use the API route /api/ui/components
let ALL_COMPONENTS_CACHE: ComponentMeta[] = [];

// Try to load from JSON file (server-side only)
if (typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(process.cwd(), 'data', 'component-registry.json');
    if (fs.existsSync(dataPath)) {
      const fileContents = fs.readFileSync(dataPath, 'utf8');
      ALL_COMPONENTS_CACHE = JSON.parse(fileContents);
    }
  } catch (error) {
    console.error('Could not load component-registry.json:', error);
    // No fallback - must have JSON file
    ALL_COMPONENTS_CACHE = [];
  }
}

// Export components by category (for backward compatibility)
export const FORM_ELEMENTS_COMPONENTS: ComponentMeta[] = ALL_COMPONENTS_CACHE.filter((comp: any) => comp.category === 'form-elements');
export const OTHER_COMPONENTS: ComponentMeta[] = ALL_COMPONENTS_CACHE.filter((comp: any) => comp.category !== 'form-elements');

// All components loaded from JSON
export const ALL_COMPONENTS: ComponentMeta[] = ALL_COMPONENTS_CACHE;

/**
 * Get component metadata by component ID
 */
export function getComponentMeta(componentId: string): ComponentMeta | undefined {
  return ALL_COMPONENTS.find(comp => comp.id === componentId);
}

/**
 * Get component config schema by component ID
 */
export function getComponentConfigSchema(componentId: string): ComponentConfigSchema | undefined {
  const component = getComponentMeta(componentId);
  return component?.configSchema;
}

/**
 * Map field component type to component registry ID
 */
export function mapComponentTypeToId(componentType: string): string {
  // Map common component types to registry IDs
  const typeMap: Record<string, string> = {
    'number': 'number-input',
    'text': 'text-input',
    'textarea': 'textarea',
    'email': 'email-input',
    'url': 'url',
    'tel': 'phone-input',
    'date': 'date-input',
    'datetime': 'datetime',
    'datetime-local': 'datetime',
    'select': 'select',
    'slider': 'slider',
    'code-viewer': 'code-viewer',
    'tag-input': 'tag-input',
    'switch': 'switch',
    'checkbox': 'checkbox',
  };
  
  return typeMap[componentType] || componentType;
}
