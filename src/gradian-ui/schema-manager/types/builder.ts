// Schema Builder Types
// Types for the schema builder UI components

import { FormSchema, FormField, FormSection } from './form-schema';

export interface SchemaBuilderConfig {
  apiBaseUrl?: string;
  onSave?: (schema: FormSchema) => Promise<void>;
  onDelete?: (schemaId: string) => Promise<void>;
  onCancel?: () => void;
  enableValidation?: boolean;
  enableReorder?: boolean;
  enableExport?: boolean;
  enableImport?: boolean;
}

export interface SchemaListProps {
  onSelect?: (schema: FormSchema) => void;
  onEdit?: (schemaId: string) => void;
  onDelete?: (schemaId: string) => void;
  onView?: (schemaId: string) => void;
  onCreate?: () => void;
  filterable?: boolean;
  searchable?: boolean;
}

export interface SchemaEditorProps {
  schemaId?: string;
  initialSchema?: Partial<FormSchema>;
  onSave?: (schema: FormSchema) => Promise<void> | void;
  onCancel?: () => void;
  readonly?: boolean;
}

export interface SectionEditorProps {
  section: FormSection;
  fields: FormField[];
  onUpdate: (updates: Partial<FormSection>) => void;
  onDelete: () => void;
  onAddField: (sectionId?: string) => void; // Optional sectionId - if not provided, will use current section
  onFieldUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldMove?: (fieldId: string, direction: 'up' | 'down') => void;
  sections: FormSection[];
  config?: SchemaBuilderConfig;
  currentSchemaId?: string; // Current schema ID to filter out from target schema list
}

export interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  sections: FormSection[];
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isIncomplete?: boolean;
}

export interface FieldTypeOption {
  value: FormField['component'];
  label: string;
  icon?: string;
  description?: string;
}

export interface RoleOption {
  value: NonNullable<FormField['role']>;
  label: string;
  icon?: string;
  description?: string;
}

export interface SchemaGeneralInfoProps {
  schema: FormSchema;
  onUpdate: (updates: Partial<FormSchema>) => void;
  readonly?: boolean;
}

export interface SchemaActionsProps {
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export interface SchemaBuilderState {
  schema: FormSchema | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  expandedSections: Set<string>;
  selectedTab: 'general' | 'sections';
  validationErrors: Record<string, string[]>;
}

export interface SchemaBuilderActions {
  loadSchema: (schemaId: string) => Promise<void>;
  saveSchema: () => Promise<void>;
  deleteSchema: () => Promise<void>;
  updateSchema: (updates: Partial<FormSchema>) => void;
  addSection: () => void;
  updateSection: (sectionId: string, updates: Partial<FormSection>) => void;
  deleteSection: (sectionId: string) => void;
  addField: (sectionId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  deleteField: (fieldId: string) => void;
  moveField: (sectionId: string, fromIndex: number, toIndex: number) => void;
  toggleSection: (sectionId: string) => void;
  validateSchema: () => boolean;
  reset: () => void;
}

export interface UseSchemaBuilderReturn {
  state: SchemaBuilderState;
  actions: SchemaBuilderActions;
}

