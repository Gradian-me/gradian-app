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
}

export const ALL_COMPONENTS: ComponentMeta[] = [
  // form-elements
  { id: 'popup-picker', label: 'PopupPicker', color: 'violet', icon: 'List', category: 'form-elements', description: 'Searchable modal picker for selecting items, supports pagination and multiselect.', usecase: 'Relational fields, reference selectors, quick search and choose UX.', directory: 'src/gradian-ui/form-builder/form-elements/components/PopupPicker.tsx' },
  { id: 'search-input', label: 'SearchInput', color: 'cyan', icon: 'Search', category: 'form-elements', description: 'Lightweight search input with clear and debounced change support.', usecase: 'Filtering lists, searching within pickers and tables.', directory: 'src/gradian-ui/form-builder/form-elements/components/SearchInput.tsx' },
  { id: 'icon-input', label: 'IconInput', color: 'amber', icon: 'Star', category: 'form-elements', description: 'Icon chooser input integrated with Lucide icon set.', usecase: 'Pick an icon when configuring entities or UI.', directory: 'src/gradian-ui/form-builder/form-elements/components/IconInput.tsx' },
  { id: 'color-picker', label: 'ColorPicker', color: 'rose', icon: 'Palette', category: 'form-elements', description: 'Color picker input with previews.', usecase: 'Select theme or status colors.', directory: 'src/gradian-ui/form-builder/form-elements/components/ColorPicker.tsx' },
  { id: 'sortable-selector', label: 'SortableSelector', color: 'slate', icon: 'MoveVertical', category: 'form-elements', description: 'Sortable list selector for ordering selected items.', usecase: 'Order fields, steps, or preferences.', directory: 'src/gradian-ui/form-builder/form-elements/components/SortableSelector.tsx' },
  { id: 'name-input', label: 'NameInput', color: 'sky', icon: 'Type', category: 'form-elements', description: 'Text input specialized for names with validation.', usecase: 'Collect person or entity names.', directory: 'src/gradian-ui/form-builder/form-elements/components/NameInput.tsx' },
  { id: 'text-input', label: 'TextInput', color: 'sky', icon: 'Type', category: 'form-elements', description: 'General purpose text input.', usecase: 'Forms for arbitrary text.', directory: 'src/gradian-ui/form-builder/form-elements/components/TextInput.tsx' },
  { id: 'email-input', label: 'EmailInput', color: 'sky', icon: 'AtSign', category: 'form-elements', description: 'Email-specific input with validation.', usecase: 'Collect email addresses.', directory: 'src/gradian-ui/form-builder/form-elements/components/EmailInput.tsx' },
  { id: 'password-input', label: 'PasswordInput', color: 'neutral', icon: 'EyeOff', category: 'form-elements', description: 'Password input with show/hide.', usecase: 'Authentication forms.', directory: 'src/gradian-ui/form-builder/form-elements/components/PasswordInput.tsx' },
  { id: 'number-input', label: 'NumberInput', color: 'teal', icon: 'Hash', category: 'form-elements', description: 'Numeric input with constraints.', usecase: 'Collect integers or floats.', directory: 'src/gradian-ui/form-builder/form-elements/components/NumberInput.tsx' },
  { id: 'phone-input', label: 'PhoneInput', color: 'teal', icon: 'Phone', category: 'form-elements', description: 'Phone input with formatting.', usecase: 'Collect phone numbers.', directory: 'src/gradian-ui/form-builder/form-elements/components/PhoneInput.tsx' },
  { id: 'date-input', label: 'DateInput', color: 'lime', icon: 'Calendar', category: 'form-elements', description: 'Date picker input.', usecase: 'Pick dates.', directory: 'src/gradian-ui/form-builder/form-elements/components/DateInput.tsx' },
  { id: 'date-time-input', label: 'DateTimeInput', color: 'lime', icon: 'Clock', category: 'form-elements', description: 'Date and time picker input.', usecase: 'Pick date-time values.', directory: 'src/gradian-ui/form-builder/form-elements/components/DateTimeInput.tsx' },
  { id: 'file-input', label: 'FileInput', color: 'zinc', icon: 'Paperclip', category: 'form-elements', description: 'File upload input.', usecase: 'Upload files and attachments.', directory: 'src/gradian-ui/form-builder/form-elements/components/FileInput.tsx' },
  { id: 'picker-input', label: 'PickerInput', color: 'violet', icon: 'Boxes', category: 'form-elements', description: 'Form element that opens PopupPicker to select related records.', usecase: 'Reference fields.', directory: 'src/gradian-ui/form-builder/form-elements/components/PickerInput.tsx' },
  { id: 'select', label: 'Select', color: 'violet', icon: 'ChevronDown', category: 'form-elements', description: 'Select input supporting badges/options.', usecase: 'Choose from a list.', directory: 'src/gradian-ui/form-builder/form-elements/components/Select.tsx' },
  { id: 'slider', label: 'Slider', color: 'orange', icon: 'Sliders', category: 'form-elements', description: 'Slider input for continuous values.', usecase: 'Pick numeric ranges/values.', directory: 'src/gradian-ui/form-builder/form-elements/components/Slider.tsx' },
  { id: 'switch', label: 'Switch', color: 'emerald', icon: 'ToggleRight', category: 'form-elements', description: 'Boolean toggle switch.', usecase: 'Enable/disable flags.', directory: 'src/gradian-ui/form-builder/form-elements/components/Switch.tsx' },
  { id: 'radio-group', label: 'RadioGroup', color: 'purple', icon: 'CircleDot', category: 'form-elements', description: 'Radio buttons group.', usecase: 'Pick one option.', directory: 'src/gradian-ui/form-builder/form-elements/components/RadioGroup.tsx' },
  { id: 'checkbox', label: 'Checkbox', color: 'purple', icon: 'CheckSquare', category: 'form-elements', description: 'Single checkbox input.', usecase: 'Single boolean.', directory: 'src/gradian-ui/form-builder/form-elements/components/Checkbox.tsx' },
  { id: 'checkbox-list', label: 'CheckboxList', color: 'purple', icon: 'SquareCheck', category: 'form-elements', description: 'Checklist for multiple selections.', usecase: 'Multiple booleans/options.', directory: 'src/gradian-ui/form-builder/form-elements/components/CheckboxList.tsx' },
  { id: 'toggle', label: 'Toggle', color: 'emerald', icon: 'ToggleLeft', category: 'form-elements', description: 'Toggle button.', usecase: 'Alternative to switch.', directory: 'src/gradian-ui/form-builder/form-elements/components/Toggle.tsx' },
  { id: 'toggle-group', label: 'ToggleGroup', color: 'emerald', icon: 'LayoutGrid', category: 'form-elements', description: 'Exclusive or multi toggle groups.', usecase: 'Segmented controls.', directory: 'src/gradian-ui/form-builder/form-elements/components/ToggleGroup.tsx' },
  { id: 'textarea', label: 'Textarea', color: 'sky', icon: 'FileText', category: 'form-elements', description: 'Multiline text input.', usecase: 'Descriptions and notes.', directory: 'src/gradian-ui/form-builder/form-elements/components/Textarea.tsx' },
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
  { id: 'code-viewer', label: 'CodeViewer', color: 'indigo', icon: 'Code', category: 'shared', description: 'Lightweight code block viewer with copy-to-clipboard.', usecase: 'Embed snippets and configuration examples in documentation.', directory: 'src/gradian-ui/shared/components/CodeViewer.tsx' },
];


