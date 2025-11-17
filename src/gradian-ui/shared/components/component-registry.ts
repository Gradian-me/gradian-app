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

export const ALL_COMPONENTS: ComponentMeta[] = [
  // form-elements
  { id: 'popup-picker', label: 'PopupPicker', color: 'violet', icon: 'List', category: 'form-elements', description: 'Searchable modal picker for selecting items, supports pagination and multiselect.', usecase: 'Relational fields, reference selectors, quick search and choose UX.', directory: 'src/gradian-ui/form-builder/form-elements/components/PopupPicker.tsx' },
  { id: 'search-input', label: 'SearchInput', color: 'cyan', icon: 'Search', category: 'form-elements', description: 'Lightweight search input with clear and debounced change support.', usecase: 'Filtering lists, searching within pickers and tables.', directory: 'src/gradian-ui/form-builder/form-elements/components/SearchInput.tsx' },
  { id: 'icon-input', label: 'IconInput', color: 'amber', icon: 'Star', category: 'form-elements', description: 'Icon chooser input integrated with Lucide icon set.', usecase: 'Pick an icon when configuring entities or UI.', directory: 'src/gradian-ui/form-builder/form-elements/components/IconInput.tsx' },
  { id: 'color-picker', label: 'ColorPicker', color: 'rose', icon: 'Palette', category: 'form-elements', description: 'Color picker input with previews.', usecase: 'Select theme or status colors.', directory: 'src/gradian-ui/form-builder/form-elements/components/ColorPicker.tsx' },
  { id: 'sortable-selector', label: 'SortableSelector', color: 'slate', icon: 'MoveVertical', category: 'form-elements', description: 'Sortable list selector for ordering selected items.', usecase: 'Order fields, steps, or preferences.', directory: 'src/gradian-ui/form-builder/form-elements/components/SortableSelector.tsx' },
  { id: 'name-input', label: 'NameInput', color: 'sky', icon: 'Type', category: 'form-elements', description: 'Text input specialized for names with validation.', usecase: 'Collect person or entity names.', directory: 'src/gradian-ui/form-builder/form-elements/components/NameInput.tsx' },
  { 
    id: 'text-input', 
    label: 'TextInput', 
    color: 'sky', 
    icon: 'Type', 
    category: 'form-elements', 
    description: 'General purpose text input.', 
    usecase: 'Forms for arbitrary text.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/TextInput.tsx',
    configSchema: {
      fields: [
        {
          name: 'maxLength',
          label: 'Max Length',
          type: 'number',
          description: 'Maximum number of characters',
          min: 1,
        },
        {
          name: 'minLength',
          label: 'Min Length',
          type: 'number',
          description: 'Minimum number of characters',
          min: 0,
        },
        {
          name: 'pattern',
          label: 'Pattern (Regex)',
          type: 'string',
          description: 'Regular expression pattern for validation',
        },
        {
          name: 'inputType',
          label: 'Input Type',
          type: 'select',
          description: 'HTML input type',
          defaultValue: 'text',
          options: [
            { value: 'text', label: 'Text' },
            { value: 'password', label: 'Password' },
            { value: 'search', label: 'Search' },
            { value: 'url', label: 'URL' },
            { value: 'tel', label: 'Tel' },
          ],
        },
      ],
    },
  },
  { 
    id: 'email-input', 
    label: 'EmailInput', 
    color: 'sky', 
    icon: 'AtSign', 
    category: 'form-elements', 
    description: 'Email-specific input with validation.', 
    usecase: 'Collect email addresses.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/EmailInput.tsx',
    configSchema: {
      fields: [
        {
          name: 'maxLength',
          label: 'Max Length',
          type: 'number',
          description: 'Maximum number of characters',
          min: 1,
        },
        {
          name: 'minLength',
          label: 'Min Length',
          type: 'number',
          description: 'Minimum number of characters',
          min: 0,
        },
        {
          name: 'allowMultiple',
          label: 'Allow Multiple Emails',
          type: 'boolean',
          description: 'Allow comma-separated multiple email addresses',
          defaultValue: false,
        },
        {
          name: 'validateDomain',
          label: 'Validate Domain',
          type: 'boolean',
          description: 'Validate email domain',
          defaultValue: false,
        },
      ],
    },
  },
  { 
    id: 'url-input', 
    label: 'URLInput', 
    color: 'sky', 
    icon: 'Link', 
    category: 'form-elements', 
    description: 'URL-specific input with validation and open link functionality.', 
    usecase: 'Collect and open URLs.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/URLInput.tsx',
    configSchema: {
      fields: [
        {
          name: 'maxLength',
          label: 'Max Length',
          type: 'number',
          description: 'Maximum number of characters',
          min: 1,
        },
        {
          name: 'minLength',
          label: 'Min Length',
          type: 'number',
          description: 'Minimum number of characters',
          min: 0,
        },
        {
          name: 'requireProtocol',
          label: 'Require Protocol',
          type: 'boolean',
          description: 'Require http:// or https:// in URL',
          defaultValue: false,
        },
        {
          name: 'label',
          label: 'Link Label',
          type: 'string',
          description: 'Label text for the URL link (default: "show more")',
          defaultValue: 'show more',
        },
      ],
    },
  },
  { id: 'password-input', label: 'PasswordInput', color: 'neutral', icon: 'EyeOff', category: 'form-elements', description: 'Password input with show/hide.', usecase: 'Authentication forms.', directory: 'src/gradian-ui/form-builder/form-elements/components/PasswordInput.tsx' },
  { 
    id: 'number-input', 
    label: 'NumberInput', 
    color: 'teal', 
    icon: 'Hash', 
    category: 'form-elements', 
    description: 'Numeric input with constraints.', 
    usecase: 'Collect integers or floats.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/NumberInput.tsx',
    configSchema: {
      fields: [
        {
          name: 'useThousandSeparator',
          label: 'Use Thousand Separator',
          type: 'boolean',
          description: 'Format numbers with thousand separators (e.g., 1,000)',
          defaultValue: true,
        },
        {
          name: 'decimalPoints',
          label: 'Decimal Points',
          type: 'number',
          description: 'Number of decimal places (0-10, leave empty for no limit)',
          min: 0,
          max: 10,
          step: 1,
        },
        {
          name: 'allowNegative',
          label: 'Allow Negative Numbers',
          type: 'boolean',
          description: 'Allow negative number input',
          defaultValue: true,
        },
        {
          name: 'min',
          label: 'Minimum Value',
          type: 'number',
          description: 'Minimum allowed value',
        },
        {
          name: 'max',
          label: 'Maximum Value',
          type: 'number',
          description: 'Maximum allowed value',
        },
        {
          name: 'step',
          label: 'Step',
          type: 'number',
          description: 'Step increment for number input',
          defaultValue: 1,
        },
      ],
    },
  },
  { 
    id: 'phone-input', 
    label: 'PhoneInput', 
    color: 'teal', 
    icon: 'Phone', 
    category: 'form-elements', 
    description: 'Phone input with formatting.', 
    usecase: 'Collect phone numbers.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/PhoneInput.tsx',
    configSchema: {
      fields: [
        {
          name: 'countryCode',
          label: 'Default Country Code',
          type: 'string',
          description: 'Default country code (e.g., US, GB)',
          defaultValue: 'US',
        },
        {
          name: 'format',
          label: 'Phone Format',
          type: 'select',
          description: 'Phone number format',
          defaultValue: 'international',
          options: [
            { value: 'international', label: 'International' },
            { value: 'national', label: 'National' },
            { value: 'e164', label: 'E.164' },
          ],
        },
        {
          name: 'allowExtensions',
          label: 'Allow Extensions',
          type: 'boolean',
          description: 'Allow phone number extensions',
          defaultValue: false,
        },
      ],
    },
  },
  { 
    id: 'date-input', 
    label: 'DateInput', 
    color: 'lime', 
    icon: 'Calendar', 
    category: 'form-elements', 
    description: 'Date picker input.', 
    usecase: 'Pick dates.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/DateInput.tsx',
    configSchema: {
      fields: [
        {
          name: 'minDate',
          label: 'Minimum Date',
          type: 'string',
          description: 'Minimum selectable date (YYYY-MM-DD)',
        },
        {
          name: 'maxDate',
          label: 'Maximum Date',
          type: 'string',
          description: 'Maximum selectable date (YYYY-MM-DD)',
        },
        {
          name: 'format',
          label: 'Date Format',
          type: 'string',
          description: 'Date display format (e.g., YYYY-MM-DD)',
          defaultValue: 'YYYY-MM-DD',
        },
      ],
    },
  },
  { 
    id: 'date-time-input', 
    label: 'DateTimeInput', 
    color: 'lime', 
    icon: 'Clock', 
    category: 'form-elements', 
    description: 'Date and time picker input.', 
    usecase: 'Pick date-time values.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/DateTimeInput.tsx',
    configSchema: {
      fields: [
        {
          name: 'minDate',
          label: 'Minimum Date',
          type: 'string',
          description: 'Minimum selectable date (YYYY-MM-DD)',
        },
        {
          name: 'maxDate',
          label: 'Maximum Date',
          type: 'string',
          description: 'Maximum selectable date (YYYY-MM-DD)',
        },
        {
          name: 'format',
          label: 'Date Format',
          type: 'string',
          description: 'Date display format',
          defaultValue: 'YYYY-MM-DD HH:mm',
        },
        {
          name: 'timeFormat',
          label: 'Time Format',
          type: 'select',
          description: 'Time display format',
          defaultValue: '24h',
          options: [
            { value: '12h', label: '12 Hour (AM/PM)' },
            { value: '24h', label: '24 Hour' },
          ],
        },
      ],
    },
  },
  { id: 'file-input', label: 'FileInput', color: 'zinc', icon: 'Paperclip', category: 'form-elements', description: 'File upload input.', usecase: 'Upload files and attachments.', directory: 'src/gradian-ui/form-builder/form-elements/components/FileInput.tsx' },
  { id: 'picker-input', label: 'PickerInput', color: 'violet', icon: 'Boxes', category: 'form-elements', description: 'Form element that opens PopupPicker to select related records.', usecase: 'Reference fields.', directory: 'src/gradian-ui/form-builder/form-elements/components/PickerInput.tsx' },
  { 
    id: 'select', 
    label: 'Select', 
    color: 'violet', 
    icon: 'ChevronDown', 
    category: 'form-elements', 
    description: 'Select input supporting badges/options.', 
    usecase: 'Choose from a list.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/Select.tsx',
    configSchema: {
      fields: [
        {
          name: 'allowSearch',
          label: 'Allow Search',
          type: 'boolean',
          description: 'Enable search functionality in dropdown',
          defaultValue: false,
        },
        {
          name: 'allowClear',
          label: 'Allow Clear',
          type: 'boolean',
          description: 'Show clear button to reset selection',
          defaultValue: false,
        },
        {
          name: 'multiple',
          label: 'Multiple Selection',
          type: 'boolean',
          description: 'Allow selecting multiple options',
          defaultValue: false,
        },
        {
          name: 'maxSelections',
          label: 'Max Selections',
          type: 'number',
          description: 'Maximum number of selections (for multiple select)',
          min: 1,
        },
      ],
    },
  },
  { 
    id: 'slider', 
    label: 'Slider', 
    color: 'orange', 
    icon: 'Sliders', 
    category: 'form-elements', 
    description: 'Slider input for continuous values.', 
    usecase: 'Pick numeric ranges/values.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/Slider.tsx',
    configSchema: {
      fields: [
        {
          name: 'min',
          label: 'Minimum Value',
          type: 'number',
          description: 'Minimum slider value',
          defaultValue: 0,
        },
        {
          name: 'max',
          label: 'Maximum Value',
          type: 'number',
          description: 'Maximum slider value',
          defaultValue: 100,
        },
        {
          name: 'step',
          label: 'Step',
          type: 'number',
          description: 'Step increment',
          defaultValue: 1,
        },
        {
          name: 'showValue',
          label: 'Show Value',
          type: 'boolean',
          description: 'Display current value',
          defaultValue: true,
        },
        {
          name: 'showMarks',
          label: 'Show Marks',
          type: 'boolean',
          description: 'Show tick marks on slider',
          defaultValue: false,
        },
      ],
    },
  },
  { id: 'switch', label: 'Switch', color: 'emerald', icon: 'ToggleRight', category: 'form-elements', description: 'Boolean toggle switch.', usecase: 'Enable/disable flags.', directory: 'src/gradian-ui/form-builder/form-elements/components/Switch.tsx' },
  { id: 'radio-group', label: 'RadioGroup', color: 'purple', icon: 'CircleDot', category: 'form-elements', description: 'Radio buttons group.', usecase: 'Pick one option.', directory: 'src/gradian-ui/form-builder/form-elements/components/RadioGroup.tsx' },
  { id: 'checkbox', label: 'Checkbox', color: 'purple', icon: 'CheckSquare', category: 'form-elements', description: 'Single checkbox input.', usecase: 'Single boolean.', directory: 'src/gradian-ui/form-builder/form-elements/components/Checkbox.tsx' },
  { id: 'checkbox-list', label: 'CheckboxList', color: 'purple', icon: 'SquareCheck', category: 'form-elements', description: 'Checklist for multiple selections.', usecase: 'Multiple booleans/options.', directory: 'src/gradian-ui/form-builder/form-elements/components/CheckboxList.tsx' },
  { id: 'toggle', label: 'Toggle', color: 'emerald', icon: 'ToggleLeft', category: 'form-elements', description: 'Toggle button.', usecase: 'Alternative to switch.', directory: 'src/gradian-ui/form-builder/form-elements/components/Toggle.tsx' },
  { id: 'toggle-group', label: 'ToggleGroup', color: 'emerald', icon: 'LayoutGrid', category: 'form-elements', description: 'Exclusive or multi toggle groups.', usecase: 'Segmented controls.', directory: 'src/gradian-ui/form-builder/form-elements/components/ToggleGroup.tsx' },
  { 
    id: 'textarea', 
    label: 'Textarea', 
    color: 'sky', 
    icon: 'FileText', 
    category: 'form-elements', 
    description: 'Multiline text input.', 
    usecase: 'Descriptions and notes.', 
    directory: 'src/gradian-ui/form-builder/form-elements/components/Textarea.tsx',
    configSchema: {
      fields: [
        {
          name: 'rows',
          label: 'Rows',
          type: 'number',
          description: 'Number of visible rows',
          defaultValue: 4,
          min: 1,
          max: 20,
        },
        {
          name: 'maxLength',
          label: 'Max Length',
          type: 'number',
          description: 'Maximum number of characters',
          min: 1,
        },
        {
          name: 'autoResize',
          label: 'Auto Resize',
          type: 'boolean',
          description: 'Automatically resize based on content',
          defaultValue: false,
        },
      ],
    },
  },
  { id: 'otp-input', label: 'OTPInput', color: 'fuchsia', icon: 'Keyboard', category: 'form-elements', description: 'One-time-password input with slots.', usecase: 'Verification codes.', directory: 'src/gradian-ui/form-builder/form-elements/components/OTPInput.tsx' },
  { id: 'rating', label: 'Rating', color: 'yellow', icon: 'Star', category: 'form-elements', description: 'Star rating input.', usecase: 'Feedback and reviews.', directory: 'src/gradian-ui/form-builder/form-elements/components/Rating.tsx' },
  { id: 'avatar', label: 'Avatar', color: 'pink', icon: 'User', category: 'form-elements', description: 'Avatar display component.', usecase: 'Initials-based avatar.', directory: 'src/gradian-ui/form-builder/form-elements/components/Avatar.tsx' },
  { id: 'cta-button', label: 'CTAButton', color: 'indigo', icon: 'ArrowRight', category: 'form-elements', description: 'Call-to-action button with icon and color variants.', usecase: 'Primary action buttons.', directory: 'src/gradian-ui/form-builder/form-elements/components/CTAButton.tsx' },
  { id: 'add-button-full', label: 'AddButtonFull', color: 'indigo', icon: 'Plus', category: 'form-elements', description: 'Full-width call-to-action button (e.g., Load More).', usecase: 'List/grid actions.', directory: 'src/gradian-ui/form-builder/form-elements/components/AddButtonFull.tsx' },
  { id: 'code-badge', label: 'CodeBadge', color: 'gray', icon: 'Tag', category: 'form-elements', description: 'Compact code/tag badge used in lists.', usecase: 'Show entity codes.', directory: 'src/gradian-ui/form-builder/form-elements/components/CodeBadge.tsx' },

  // layout
  { id: 'end-line', label: 'EndLine', color: 'emerald', icon: 'Minus', category: 'layout', description: 'End-of-list indicator component with a subtle separator UI.', usecase: 'Show the end of paginated lists or grids.', directory: 'src/gradian-ui/layout/end-line/components/EndLine.tsx' },
  { id: 'sidebar', label: 'Sidebar', color: 'slate', icon: 'PanelLeft', category: 'layout', description: 'Sidebar container with navigation.', usecase: 'App shell layout.', directory: 'src/gradian-ui/layout/sidebar/components/Sidebar.tsx' },
  { id: 'header', label: 'Header', color: 'slate', icon: 'PanelTop', category: 'layout', description: 'App header with actions.', usecase: 'App shell layout.', directory: 'src/gradian-ui/layout/header/components/Header.tsx' },
  { id: 'go-to-top', label: 'GoToTop', color: 'slate', icon: 'ChevronUp', category: 'layout', description: 'Scroll to top floating action.', usecase: 'Long pages and docs.', directory: 'src/gradian-ui/layout/go-to-top/components/GoToTop.tsx' },

  // data-display
  { id: 'view-switcher', label: 'ViewSwitcher', color: 'blue', icon: 'LayoutGrid', category: 'data-display', description: 'Switch between table/card/list views.', usecase: 'Data browsing UX.', directory: 'src/gradian-ui/data-display/components/ViewSwitcher.tsx' },
  { id: 'data-table', label: 'DataTable', color: 'blue', icon: 'Table', category: 'data-display', description: 'Configurable data table with pagination and aggregation.', usecase: 'Tabular data.', directory: 'src/gradian-ui/data-display/components/DataTable.tsx' },
  { id: 'dynamic-card', label: 'DynamicCard', color: 'blue', icon: 'LayoutPanelTop', category: 'data-display', description: 'Schema-driven card renderer.', usecase: 'Summaries and dashboards.', directory: 'src/gradian-ui/data-display/components/DynamicCard.tsx' },
  { id: 'dynamic-list', label: 'DynamicList', color: 'blue', icon: 'List', category: 'data-display', description: 'Schema-driven list renderer.', usecase: 'Collections preview.', directory: 'src/gradian-ui/data-display/components/DynamicList.tsx' },
  { id: 'dynamic-detail-page', label: 'DynamicDetailPageRenderer', color: 'blue', icon: 'FileText', category: 'data-display', description: 'Schema-driven detail page renderer.', usecase: 'Entity profiles/details.', directory: 'src/gradian-ui/data-display/components/DynamicDetailPageRenderer.tsx' },

  // analytics
  { id: 'kpi-indicator', label: 'KPIIndicator', color: 'rose', icon: 'Gauge', category: 'analytics', description: 'KPI indicator tile.', usecase: 'Dashboards and metrics.', directory: 'src/gradian-ui/analytics/indicators/kpi-indicator/components/KPIIndicator.tsx' },
  { id: 'line-chart', label: 'LineChart', color: 'rose', icon: 'LineChart', category: 'analytics', description: 'Line chart component.', usecase: 'Trend visualization.', directory: 'src/gradian-ui/analytics/charts/line/components/LineChart.tsx' },

  // shared
  { 
    id: 'code-viewer', 
    label: 'CodeViewer', 
    color: 'indigo', 
    icon: 'Code', 
    category: 'shared', 
    description: 'Lightweight code block viewer with copy-to-clipboard.', 
    usecase: 'Embed snippets and configuration examples in documentation.', 
    directory: 'src/gradian-ui/shared/components/CodeViewer.tsx',
    configSchema: {
      fields: [
        {
          name: 'programmingLanguage',
          label: 'Programming Language',
          type: 'select',
          description: 'Code language for syntax highlighting',
          defaultValue: 'ts',
          options: [
            { value: 'ts', label: 'TypeScript' },
            { value: 'tsx', label: 'TSX' },
            { value: 'js', label: 'JavaScript' },
            { value: 'jsx', label: 'JSX' },
            { value: 'json', label: 'JSON' },
            { value: 'yaml', label: 'YAML' },
            { value: 'yml', label: 'YML' },
            { value: 'html', label: 'HTML' },
            { value: 'css', label: 'CSS' },
            { value: 'scss', label: 'SCSS' },
            { value: 'python', label: 'Python' },
            { value: 'go', label: 'Go' },
            { value: 'rust', label: 'Rust' },
            { value: 'java', label: 'Java' },
            { value: 'c', label: 'C' },
            { value: 'cpp', label: 'C++' },
            { value: 'sql', label: 'SQL' },
            { value: 'bash', label: 'Bash' },
            { value: 'sh', label: 'Shell' },
            { value: 'shell', label: 'Shell Script' },
          ],
        },
        {
          name: 'title',
          label: 'Title',
          type: 'string',
          description: 'Title displayed in the code viewer header',
          defaultValue: 'Code Snippet',
        },
      ],
    },
  },
];

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
    'url': 'url-input',
    'tel': 'phone-input',
    'date': 'date-input',
    'datetime': 'date-time-input',
    'datetime-local': 'date-time-input',
    'select': 'select',
    'slider': 'slider',
    'code-viewer': 'code-viewer',
  };
  
  return typeMap[componentType] || componentType;
}
