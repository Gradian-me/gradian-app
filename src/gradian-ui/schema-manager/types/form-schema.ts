// Unified Form Schema Types
// This is the single source of truth for all form schema types

import { ColumnMapConfig } from '@/gradian-ui/shared/utils/column-mapper';

export interface FormField {
  id: string;
  name: string;
  label: string;
  sectionId: string; // Reference to the section this field belongs to
  component: 'text' | 'email' | 'tel' | 'number' | 'password' | 'url' | 'textarea' | 'json' | 'select' | 'checkbox' | 'checkbox-list' | 'radio' | 'date' | 'datetime-local' | 'datetime' | 'file' | 'picker' | 'icon' | 'image-text' | 'image-viewer' | 'name' | 'avatar' | 'color-picker' | 'rating' | 'badge' | 'countdown' | 'code-viewer' | 'list-input' | 'tag-input' | 'toggle' | 'toggle-group' | 'switch' | 'formula' | 'checklist';
  placeholder?: string;
  icon?: string;
  displayType?: 'text' | 'number' | 'currency' | 'percentage' | 'array' | 'computed';
  truncate?: boolean;
  description?: string;
  disabled?: boolean;
  hidden?: boolean;
  readonly?: boolean;
  canCopy?: boolean;
  inactive?: boolean;
  addToReferenceMetadata?: boolean;
  isSensitive?: boolean; // If true, field value will be encrypted before storage and decrypted for display
  role?: 'title' | 'subtitle' | 'description' | 'list' | 'image' | 'avatar' | 'icon' | 'rating' | 'badge' | 'status' | 'email' | 'location' | 'tel' | 'duedate' | 'code' | 'color' | 'person' | 'entityType';
  roleColor?: 'default' | 'secondary' | 'outline' | 'destructive' | 'gradient' | 'success' | 'warning' | 'info' | 'muted';
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp | string;
    min?: number;
    max?: number;
    custom?: (value: any) => { isValid: boolean; error?: string };
  };
  options?: Array<{ id?: string; label: string; value?: string; disabled?: boolean; icon?: string; color?: string }>;
  defaultValue?: any;
  colSpan?: number; // Number of columns this field should span
  order?: number; // Order for field display
  source?: string; // Data path for nested values (e.g., "user.profile.name")
  compute?: (data: any) => any; // Function to compute field value from data
  targetSchema?: string; // Target schema ID for picker component (popup picker to another schema)
  sourceUrl?: string; // Source URL for picker component (alternative to targetSchema, fetches data from API endpoint)
  sourceColumnRoles?: Array<{ column: string; role?: string }>; // Column to role mapping for sourceUrl items (e.g., [{ column: "singular_name", role: "title" }, { column: "description", role: "description" }])
  columnMap?: ColumnMapConfig; // Optional mapping for request/response and item fields when using sourceUrl
  pageSize?: number; // Page size for paginated data sources (default: 50)
  sortType?: 'ASC' | 'DESC' | null; // Sort order for items (null = no sorting, default)
  mustSelectLeaves?: boolean; // If true, only allow selecting leaf nodes (nodes without children) in hierarchical schemas
  // Reference-based filtering: filter items based on relation to a reference entity
  referenceSchema?: string; // Schema of the reference entity (e.g., "status-groups", "parameter-groups")
  referenceRelationTypeId?: string; // Relation type ID to filter by (e.g., "HAS_STATUS_ITEM", "HAS_PARAMETER_ITEM")
  referenceEntityId?: string; // ID of the reference entity, supports dynamic context (e.g., "{{formSchema.statusGroup.[0].id}}" or "{{formData.category.id}}")
  metadata?: {
    allowMultiselect?: boolean;
    [key: string]: any;
  };
  // Keep layout and styling for backward compatibility (form-builder)
  layout?: {
    width?: string;
    rowSpan?: number;
    variant?: 'default' | 'outlined' | 'filled' | 'underlined';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  };
  styling?: {
    variant?: 'default' | 'outlined' | 'filled' | 'underlined';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  };
  conditional?: {
    dependsOn: string;
    condition: (value: any) => boolean;
  };
  // Formula configuration for formula fields
  formula?: string; // Formula expression (e.g., "{{formData.price}} * {{formData.quantity}}")
  formulaConfig?: {
    showEditor?: boolean; // Allow editing formula (default: false for display-only)
    precision?: number; // Decimal precision for numeric results (default: 2)
    format?: 'number' | 'currency' | 'percentage' | 'text'; // Format for display
    unit?: string; // Unit to display after the value (e.g., "kg", "{{formData.currency.icon}}", "m²")
  };
  // @deprecated - Use compute property instead. Kept for backward compatibility.
  display?: {
    icon?: string;
    type?: 'text' | 'number' | 'currency' | 'percentage' | 'array' | 'computed';
    source?: string;
    compute?: (data: any) => any;
    displayType?: 'badges' | 'list' | 'grid';
    maxDisplay?: number;
    showMore?: boolean;
    truncate?: boolean;
    format?: string;
  };
  // Component-specific configuration
  componentTypeConfig?: Record<string, any>; // Component-specific config (e.g., { useThousandSeparator: true, decimalPoints: 2 } for NumberInput)
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  order?: number;
  columns?: number; // Default: 2 if not specified
  gap?: number;
  inactive?: boolean;
  // Keep layout for backward compatibility (form-builder)
  layout?: {
    columns?: number;
    gap?: number;
    direction?: 'row' | 'column';
  };
  styling?: {
    variant?: 'default' | 'card' | 'minimal';
    className?: string;
  };
  isRepeatingSection?: boolean;
  repeatingConfig?: {
    fieldRelationType?: 'addFields' | 'connectToSchema'; // Default: 'addFields' - determines if fields are added directly or connected to another schema
    minItems?: number;
    maxItems?: number;
    itemTitle?: (index: number) => string;
    targetSchema?: string; // Schema ID for relation-based repeating sections
    relationTypeId?: string; // Relation type ID for relation-based repeating sections
    deleteType?: 'relationOnly' | 'itemAndRelation'; // Default: 'itemAndRelation'
    addType?: 'addOnly' | 'canSelectFromData' | 'mustSelectFromData'; // Default: 'addOnly'
    isUnique?: boolean; // If true, each item can only be selected once (excludes already selected items)
  };
  initialState?: 'expanded' | 'collapsed';
  showNotApplicable?: boolean; // If true, shows N.A switch in section header (only for sections that are NOT repeating sections with minItems > 1)
}

// Card-related types
export interface CardSection {
  id: string;
  title: string;
  colSpan?: number;
  fieldIds: string[];
}

export interface CardConfig {
  title: string;
  subtitle?: string;
  avatar?: string;
  status?: string;
  rating?: string;
  sections: Array<{
    id: string;
    title: string;
    fields: Array<{
      name: string;
      type: string;
      label: string;
    }>;
  }>;
}

export interface CardMetadata {
  id: string;
  name: string;
  title?: string;
  subtitle?: string;
  description?: string;
  avatar?: {
    field?: string;
    fallback?: string;
    imagePath?: string;
  };
  status?: {
    field?: string;
    colorMap?: Record<string, string>;
  };
  rating?: {
    field?: string;
    maxRating?: number;
    showValue?: boolean;
  };
  sections: Array<{
    id: string;
    title: string;
    width?: string; // Width percentage, defaults to '100%'
    colSpan?: number; // Number of columns to span in grid (1 or 2)
    fieldIds: string[]; // References to form field IDs
    // Section-level layout (overrides individual field displayType if needed)
    layout?: 'grid' | 'list';
    columns?: number;
  }>;
  styling?: {
    variant?: 'default' | 'minimal' | 'elevated' | 'outlined' | 'filled';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    rounded?: boolean;
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  };
  behavior?: {
    clickable?: boolean;
    hoverable?: boolean;
  };
  animations?: {
    stagger?: boolean;
    duration?: number;
    delay?: number;
  };
}

export interface ListMetadata {
  id: string;
  name: string;
  layout: {
    type: 'grid' | 'list';
    columns?: {
      default: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    };
    gap?: number;
  };
  emptyState?: {
    icon: string;
    title: string;
    description: string;
    searchDescription?: string;
  };
  loadingState?: {
    skeleton?: boolean;
    count?: number;
  };
  animations?: {
    stagger?: boolean;
    duration?: number;
    delay?: number;
  };
}

// Detail page types
export interface DetailPageSection {
  id: string;
  title: string;
  description?: string;
  colSpan?: number; // Number of columns this section should span in the grid
  fieldIds: string[]; // Field IDs to display as key-value pairs
  columnArea?: 'main' | 'sidebar'; // Which area to place this section in (main or sidebar)
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'gradient' | 'success' | 'warning' | 'info' | 'muted';
  enforceBadgeVariant?: boolean;
  badgeClickable?: boolean;
  layout?: {
    columns?: number; // Number of columns for the key-value grid inside the card (default: 2)
    gap?: number;
  };
  styling?: {
    variant?: 'default' | 'card' | 'minimal';
    className?: string;
  };
}

export interface ComponentRendererConfig {
  id: string;
  componentType: 'kpi' | 'chart' | 'metric' | 'custom'; // Type of component to render
  componentName?: string; // Name of the custom component (for 'custom' type)
  fieldIds?: string[]; // Field IDs to extract data from
  dataPath?: string; // Path to data in the object (e.g., 'performanceMetrics.onTimeDelivery')
  config?: any; // Component-specific configuration (e.g., KPIIndicator config)
  props?: Record<string, any>; // Additional props to pass to the component
  colSpan?: number; // Number of columns this component should span
}

export interface RepeatingTableRendererConfig {
  id: string;
  schemaId: string;
  sectionId: string;
  columns?: string[]; // Field IDs to display as columns (if empty, show all fields from section)
  title?: string;
  description?: string;
  targetSchema?: string; // Target schema ID for relation-based tables
  relationTypeId?: string; // Relation type ID for relation-based tables
  // Reference-based filtering: filter items based on relation to a reference entity
  referenceSchema?: string; // Schema of the reference entity (e.g., "parameter-groups", "status-groups")
  referenceRelationTypeId?: string; // Relation type ID to filter by (e.g., "HAS_PARAMETER_ITEM", "HAS_STATUS_ITEM")
  referenceEntityId?: string; // ID of the reference entity, supports dynamic context (e.g., "{{formData.id}}")
  tableProperties?: {
    sortingEnabled?: boolean;
    paginationEnabled?: boolean;
    paginationPageSize?: number;
    alwaysShowPagination?: boolean; // If true, always show pagination even with one page (default: false)
    cardColumns?: 1 | 2 | 3; // Number of columns for key-value pairs in cards (default: 2)
    aggregationAlignment?: 'start' | 'center' | 'end'; // Alignment for aggregation values (default: 'end')
    aggregationColumns?: 1 | 2 | 3; // Number of columns for aggregation grid (default: 3, 1 = full width)
    aggregations?: Array<{
      column: string; // Column ID (field ID)
      aggregationTypes: Array<'sum' | 'avg' | 'min' | 'max' | 'first' | 'last' | 'count' | 'countdistinct' | 'stdev'>;
      unit?: string; // Unit to display after the value (e.g., "USD", "%", "kg")
      precision?: number; // Number of decimal places (default: 2)
    }>;
    columnWidths?: Record<string, {
      minWidth?: number;
      maxWidth?: number;
      width?: number;
    }>; // Custom column width configuration by field type (overrides defaults)
  };
  colSpan?: number; // Number of columns this table should span
  columnArea?: 'main' | 'sidebar'; // Which area to place this table in (main or sidebar)
}

export interface QuickAction {
  id: string;
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient';
  icon?: string; // Icon name to display before the label
  componentType?: 'button' | 'ai-agent-response'; // How the quick action is rendered (default: 'button')
  action: 'goToUrl' | 'openUrl' | 'openFormDialog' | 'openActionForm' | 'runAiAgent' | 'callApi' | 'openMetadataEditor';
  targetSchema?: string; // Required for openFormDialog action
  targetUrl?: string; // Required for goToUrl and openUrl actions
  passItemAsReference?: boolean; // Default: false - if true, pass current schema item as reference to target URL
  // Custom submission route for openFormDialog actions
  submitRoute?: string; // Supports dynamic context variables like {{formData.id}}
  submitMethod?: 'POST' | 'PUT' | 'PATCH'; // HTTP method for custom submit route
  passParentDataAs?: string; // Optional key name to include parent entity data in submission payload
  enrichFormData?: boolean; // Whether to enrich form data with parent entity context (default true)
  /**
   * Optional payload template for callApi actions.
   * When provided, the body is built from this template with dynamic context replacement.
   */
  payloadTemplate?: any;
  /**
   * Optional payload override for callApi/openFormDialog actions.
   * For runAiAgent actions, this is passed as the 'body' parameter to the AI agent API.
   * Supports dynamic context replacement via {{formData.*}} and {{formSchema.*}}.
   */
  body?: any;
  /**
   * Optional extra body parameters for runAiAgent actions.
   * This is passed as the 'extra_body' parameter to the AI agent API.
   * Supports dynamic context replacement via {{formData.*}} and {{formSchema.*}}.
   */
  extra_body?: any;
  // Properties for runAiAgent action
  agentId?: string; // ID of the AI agent to run
  selectedFields?: string[]; // Array of field IDs to include in prompt
  selectedSections?: string[]; // Array of section IDs to include in prompt
  additionalSystemPrompt?: string; // Additional system prompt to append to agent's system prompt for extra context
  preloadRoutes?: Array<{
    route: string; // Supports dynamic context variables like {{formData.id}}
    title: string;
    description: string;
    method?: 'GET' | 'POST';
    jsonPath?: string;
    body?: any;
    queryParameters?: Record<string, string>; // Values support dynamic context variables
    outputFormat?: 'json' | 'string' | 'toon';
    includedFields?: string[];
  }>; // Additional preload routes to fetch before running the agent
  displayType?: 'default' | 'hideForm' | 'showFooter'; // Control what parts of the form to show
  runType?: 'manual' | 'automatic'; // manual: user clicks "Do the Magic", automatic: auto-runs when dialog opens
  /**
   * Default language for AI agent output (e.g., 'en', 'fa', 'ar', 'es', etc.)
   * If not specified, defaults to 'fa' for non-image-generation agents, 'en' for image-generation agents
   */
  language?: string;
  /**
   * Maximum height (in pixels) for the AI agent response container content.
   * If set, the content will be scrollable. If null or 0, content will show in full without scrolling.
   */
  maxHeight?: number | null;
  /**
   * If true, will add encrypted skip_key from localStorage as query parameter to the API call
   * The middleware will decrypt this parameter before the request reaches the route handler
   */
  passSkipKey?: boolean;
}

export interface DetailPageMetadata {
  sections?: DetailPageSection[]; // Info card sections with key-value pairs
  componentRenderers?: ComponentRendererConfig[]; // Custom components to render (e.g., KPIIndicator)
  tableRenderers?: RepeatingTableRendererConfig[]; // Repeating section tables to render
  quickActions?: QuickAction[]; // Quick action buttons shown in sidebar before badges
  layout?: {
    mainColumns?: number; // Number of columns for main content area (default: 2)
    sidebarColumns?: number; // Number of columns for sidebar (default: 1)
    // totalColumns is calculated automatically as mainColumns + sidebarColumns
    gap?: number;
  };
  header?: {
    showBackButton?: boolean;
    showActions?: boolean;
    actions?: Array<'edit' | 'delete' | 'export'>;
  };
}

// Main FormSchema interface - supports both naming conventions
export interface FormSchema {
  id: string;
  description?: string;
  // Primary naming (used in data storage)
  singular_name: string;
  plural_name: string;
  // Compatibility aliases for form-builder FormSchema
  name?: string; // Alias for singular_name
  title?: string; // Alias for plural_name
  icon?: string;
  showInNavigation?: boolean;
  /**
   * Schema type selector. Replaces legacy isSystemSchema boolean.
   * - system: platform/system schemas
   * - business: customer/business schemas
   * - action-form: lightweight action-only forms (e.g., reset password)
   */
  schemaType?: 'system' | 'business' | 'action-form';
  /**
   * @deprecated Use schemaType instead. Kept for backward compatibility during migration.
   */
  isSystemSchema?: boolean;
  isNotCompanyBased?: boolean;
  /**
   * When true, shows a multi-company selector in the System Section so
   * records of this schema can be linked to multiple companies.
   * Selected companies are stored in the `relatedCompanies` field of data.
   */
  canSelectMultiCompanies?: boolean;
  /**
   * When true, shows a multi-tenant selector in the System Section so
   * records of this schema can be linked to multiple tenants.
   * Selected tenants are stored in the `relatedTenants` field of data.
   */
  allowDataRelatedTenants?: boolean;
  inactive?: boolean;
  allowDataInactive?: boolean;
  allowDataForce?: boolean;
  /**
   * When true, shows a bookmark/favorite toggle in the System Section.
   * Stored in data as `isBookmarked` (boolean).
   */
  allowDataBookmark?: boolean;
  allowDataHardDelete?: boolean;
  /**
   * When true, shows an "Assigned To" user selector in the System Section.
   * Stored in data as `assignedTo` (typically an array of selection objects from users schema).
   */
  allowDataAssignedTo?: boolean;
  /**
   * When true, shows a "Due Date" date picker in the System Section.
   * Stored in data as `dueDate` (ISO date string compatible with date input).
   */
  allowDataDueDate?: boolean;
  allowHierarchicalParent?: boolean;
  /**
   * Optional status group configuration for this schema.
   * When set, forms can show a status selector based on related status items.
   * Stored as an array of selection objects (first item is the primary group).
   */
  statusGroup?: any[];
  /**
   * Optional entity type group configuration for this schema.
   * When set, forms can show an entity type selector based on related entity type items.
   * Stored as an array of selection objects (first item is the primary group).
   */
  entityTypeGroup?: any[];
  /**
   * Optional tenant scoping configuration. When applyToAllTenants is true,
   * the form applies to every tenant and relatedTenants should be ignored.
   * Otherwise, relatedTenants should contain tenant IDs selected via picker.
   */
  applyToAllTenants?: boolean;
  relatedTenants?: Array<{
    id: string;
    label?: string;
    color?: string;
    icon?: string;
  }>;
  syncToDatabases?: string[]; // Array of database IDs to sync this schema to
  syncStrategy?: 'schema-only' | 'schema-and-data'; // Sync strategy: schema only or schema and data
  statistics?: {
    maxUpdatedAt?: string | null;
    hasPartition?: boolean;
    isIndexed?: boolean;
    records?: number;
    size?: number; // in megabytes
  };
  fields: FormField[]; // All fields at schema level, each with a sectionId
  sections: FormSection[]; // Sections no longer contain fields
  fieldsCount?: number;
  sectionsCount?: number;
  cardMetadata?: CardSection[];
  cardConfig?: CardConfig; // Form-builder specific
  listMetadata?: ListMetadata; // Form-builder specific
  detailPageMetadata?: DetailPageMetadata;
  layout?: {
    direction?: 'column' | 'row';
    gap?: number;
    spacing?: 'sm' | 'md' | 'lg';
  };
  styling?: {
    variant?: 'default' | 'card' | 'minimal';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  };
  /**
   * Related applications for this schema.
   * Populated by the API when fetching schemas with related application data.
   */
  applications?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  actions?: Array<'submit' | 'cancel' | 'reset'>;
  showActionsInModal?: boolean; // If true, actions will be rendered by Modal component, not in the form itself
  validation?: {
    mode?: 'onChange' | 'onBlur' | 'onSubmit';
    showErrors?: boolean;
    showSuccess?: boolean;
  };
  customButtons?: QuickAction[]; // Custom buttons shown above filter pane in list page
  isCollapsibleSections?: boolean; // If false, sections are always expanded and collapse/expand UI is hidden (default: true)
}

// Form state and data types
export interface FormData {
  [key: string]: any;
}

export interface FormErrors {
  [key: string]: string;
}

export interface FormTouched {
  [key: string]: boolean | boolean[];
}

export interface FormState {
  values: FormData;
  errors: FormErrors;
  touched: FormTouched;
  dirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

// Form builder specific interfaces
export interface FormActions {
  setValue: (fieldName: string, value: any) => void;
  setError: (fieldName: string, error: string) => void;
  setTouched: (fieldName: string, touched: boolean) => void;
  validateField: (fieldName: string) => boolean;
  validateForm: () => Promise<{ isValid: boolean; isIncomplete: boolean }>;
  reset: () => void;
  submit: () => Promise<{ isValid: boolean; isIncomplete: boolean }>;
  addRepeatingItem: (sectionId: string) => void;
  removeRepeatingItem: (sectionId: string, index: number) => void;
}

/** Optional: register a getter so this field's value is merged into submission data on submit (e.g. list fields that commit on blur). */
export type DeferredFieldGetter = () => unknown;

export interface FormContextType {
  state: FormState;
  actions: FormActions;
  schema: FormSchema;
  /** When provided, register a field that should be flushed into submission data on submit (used by list/checklist with commitOnBlur). */
  registerDeferredField?: (fieldName: string, getValue: DeferredFieldGetter) => void;
  /** Unregister a deferred field (on unmount). */
  unregisterDeferredField?: (fieldName: string) => void;
}

export interface FormWrapperProps {
  schema: FormSchema;
  onSubmit: (data: FormData, options?: { isIncomplete?: boolean }) => void | Promise<void>;
  onReset?: () => void;
  onCancel?: () => void;
  onFieldChange?: (fieldName: string, value: any) => void;
  initialValues?: FormData;
  referenceEntityData?: Record<string, any>;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  onMount?: (submitFn: () => Promise<{ isValid: boolean; isIncomplete: boolean }>) => void;
  hideActions?: boolean;
  error?: string | null;
  message?: string | null;
  errorStatusCode?: number;
  onErrorDismiss?: () => void;
  hideCollapseExpandButtons?: boolean; // Hide collapse/expand all buttons
  forceExpandedSections?: boolean; // Force all sections to be expanded
  hideGoToTopButton?: boolean; // Hide go to top button
}

export interface FormSectionProps {
  section: FormSection;
  schema: FormSchema; // Schema needed to get fields for the section
  values: FormData;
  errors: FormErrors;
  touched: FormTouched;
  onChange: (fieldName: string, value: any) => void;
  onBlur: (fieldName: string) => void;
  onFocus: (fieldName: string) => void;
  disabled?: boolean;
  repeatingItems?: any[];
  onAddRepeatingItem?: () => void;
  onRemoveRepeatingItem?: (index: number) => void;
  initialState?: 'expanded' | 'collapsed'; // New prop for initial state
  isExpanded?: boolean; // Controlled expanded state
  onToggleExpanded?: () => void; // Callback to toggle expanded state
  addItemError?: string | null; // Error message to display under the Add button
  refreshRelationsTrigger?: number; // Trigger to refresh relations (increments when relations change)
  isAddingItem?: boolean; // Whether the add item modal is currently open (for loading state)
}

export interface RepeatingSectionProps {
  section: FormSection;
  items: any[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: any, index: number) => React.ReactNode;
  values: FormData;
  errors: FormErrors;
  touched: FormTouched;
  onChange: (fieldName: string, value: any) => void;
  onBlur: (fieldName: string) => void;
  onFocus: (fieldName: string) => void;
  disabled?: boolean;
}

// Relation data interface for all-data-relations.json
export interface DataRelation {
  id: string;
  sourceSchema: string;
  sourceId: string;
  targetSchema: string;
  targetId: string;
  relationTypeId: string;
  /**
   * Optional field identifier (form field id) that owns this relation.
   * Used primarily for HAS_FIELD_VALUE relations to map back to specific fields.
   */
  fieldId?: string;
  /**
   * Soft-delete flag for relations.
   * When true, relation is kept for history but should be treated as inactive.
   */
  inactive?: boolean;
  /**
   * Incomplete flag for relations.
   * When true, indicates that the target entity is incomplete.
   */
  incomplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Direction indicator for API responses - indicates whether this relation is from the perspective of source or target
  direction?: 'source' | 'target';
}

