// System Section Fields Schema Configuration
// This file defines the field schemas for system section fields
// These fields are rendered using FormElementFactory, similar to regular form fields

import { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { FormField } from '@/gradian-ui/schema-manager/types/form-schema';

export interface SystemSectionFieldConfig {
  field: Partial<FormField>;
  shouldShow: (schema: FormSchema, values: any) => boolean;
  getFieldConfig: (schema: FormSchema, values: any) => Partial<FormField>;
  getValue?: (values: any) => any;
  onChange?: (value: any, onChange: (fieldName: string, value: any) => void) => void;
  group?: 'switches' | 'main' | 'hierarchical' | 'multi-select';
  order?: number;
}

/**
 * Get system section field configurations based on schema settings
 */
export const getSystemSectionFields = (
  schema: FormSchema,
  values: any
): SystemSectionFieldConfig[] => {
  const hasStatusGroup = Array.isArray(schema.statusGroup) && schema.statusGroup.length > 0;
  const hasEntityTypeGroup = Array.isArray(schema.entityTypeGroup) && schema.entityTypeGroup.length > 0;
  const statusGroupId = hasStatusGroup && schema.statusGroup && Array.isArray(schema.statusGroup) && schema.statusGroup.length > 0
    ? schema.statusGroup[0]?.id
    : null;
  const entityTypeGroupId = hasEntityTypeGroup && schema.entityTypeGroup && Array.isArray(schema.entityTypeGroup) && schema.entityTypeGroup.length > 0
    ? schema.entityTypeGroup[0]?.id
    : null;
  const forceValue = values?.isForce === true;
  const isParentLocked = values?.__parentLocked === true;

  const fields: SystemSectionFieldConfig[] = [];

  // Switch fields (inactive, force)
  if (schema.allowDataInactive === true) {
    fields.push({
      field: {
        id: 'system-inactive',
        name: 'inactive',
        label: 'Inactive',
        sectionId: 'system-section',
        component: 'switch',
        order: 1,
      },
      shouldShow: () => schema.allowDataInactive === true,
      getFieldConfig: () => ({
        id: 'system-inactive',
        name: 'inactive',
        label: 'Inactive',
        sectionId: 'system-section',
        component: 'switch',
      }),
      getValue: (vals) => vals?.inactive === true,
      onChange: (value, onChange) => onChange('inactive', value),
      group: 'switches',
      order: 1,
    });
  }

  if (schema.allowDataForce === true) {
    fields.push({
      field: {
        id: 'system-force',
        name: 'isForce',
        label: 'Force',
        sectionId: 'system-section',
        component: 'switch',
        order: 2,
      },
      shouldShow: () => schema.allowDataForce === true,
      getFieldConfig: () => ({
        id: 'system-force',
        name: 'isForce',
        label: 'Force',
        sectionId: 'system-section',
        component: 'switch',
      }),
      getValue: (vals) => vals?.isForce === true,
      onChange: (value, onChange) => onChange('isForce', value),
      group: 'switches',
      order: 2,
    });
  }

  // Force reason (conditional on force being enabled)
  if (schema.allowDataForce === true) {
    fields.push({
      field: {
        id: 'system-force-reason',
        name: 'forceReason',
        label: 'Force Reason',
        sectionId: 'system-section',
        component: 'textarea',
        placeholder: 'Enter the reason for forcing this record...',
        validation: {
          required: false,
        },
        order: 3,
      },
      shouldShow: () => schema.allowDataForce === true && forceValue === true,
      getFieldConfig: () => ({
        id: 'system-force-reason',
        name: 'forceReason',
        label: 'Force Reason',
        sectionId: 'system-section',
        component: 'textarea',
        placeholder: 'Enter the reason for forcing this record...',
        validation: {
          required: false,
        },
      }),
      getValue: (vals) => vals?.forceReason || '',
      onChange: (value, onChange) => onChange('forceReason', value),
      group: 'main',
      order: 3,
    });
  }

  // Main fields (assignedTo, dueDate, status, entityType)
  if (schema.allowDataAssignedTo === true) {
    fields.push({
      field: {
        id: 'system-assigned-to',
        name: 'assignedTo',
        label: 'Assigned To',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select user',
        targetSchema: 'users',
        validation: {
          required: false,
        },
        metadata: {
          allowMultiselect: false,
        },
        order: 10,
      },
      shouldShow: () => schema.allowDataAssignedTo === true,
      getFieldConfig: () => ({
        id: 'system-assigned-to',
        name: 'assignedTo',
        label: 'Assigned To',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select user',
        targetSchema: 'users',
        validation: {
          required: false,
        },
        metadata: {
          allowMultiselect: false,
        },
      }),
      getValue: (vals) => Array.isArray(vals?.assignedTo) ? vals.assignedTo : vals?.assignedTo ? [vals.assignedTo] : [],
      onChange: (value, onChange) => onChange('assignedTo', value),
      group: 'main',
      order: 10,
    });
  }

  if (schema.allowDataDueDate === true) {
    fields.push({
      field: {
        id: 'system-due-date',
        name: 'dueDate',
        label: 'Due Date',
        sectionId: 'system-section',
        component: 'date',
        placeholder: 'Select due date',
        role: 'duedate',
        validation: {
          required: false,
        },
        order: 11,
      },
      shouldShow: () => schema.allowDataDueDate === true,
      getFieldConfig: () => ({
        id: 'system-due-date',
        name: 'dueDate',
        label: 'Due Date',
        sectionId: 'system-section',
        component: 'date',
        placeholder: 'Select due date',
        role: 'duedate',
        validation: {
          required: false,
        },
      }),
      getValue: (vals) => vals?.dueDate || '',
      onChange: (value, onChange) => onChange('dueDate', value),
      group: 'main',
      order: 11,
    });
  }

  if (hasStatusGroup) {
    fields.push({
      field: {
        id: 'system-status',
        name: 'status',
        label: 'Status',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select status',
        description: 'Status for this record from the configured status group.',
        targetSchema: 'status-items',
        referenceSchema: 'status-groups',
        referenceRelationTypeId: 'HAS_STATUS_ITEM',
        referenceEntityId: statusGroupId || '{{formSchema.statusGroup.[0].id}}',
        columnMap: {
          response: { data: 'data.0.data' },
          item: {
            id: 'id',
            label: 'label',
            icon: 'icon',
            color: 'color',
          },
        },
        metadata: {
          allowMultiselect: false,
        },
        validation: {
          required: true,
        },
        role: 'status',
        order: 12,
      },
      shouldShow: () => hasStatusGroup === true,
      getFieldConfig: (sch) => {
        const sgId = Array.isArray(sch.statusGroup) && sch.statusGroup.length > 0
          ? sch.statusGroup[0]?.id
          : null;
        return {
          id: 'system-status',
          name: 'status',
          label: 'Status',
          sectionId: 'system-section',
          component: 'picker',
          placeholder: 'Select status',
          description: 'Status for this record from the configured status group.',
          targetSchema: 'status-items',
          referenceSchema: 'status-groups',
          referenceRelationTypeId: 'HAS_STATUS_ITEM',
          referenceEntityId: sgId || '{{formSchema.statusGroup.[0].id}}',
          columnMap: {
            response: { data: 'data.0.data' },
            item: {
              id: 'id',
              label: 'label',
              icon: 'icon',
              color: 'color',
            },
          },
          metadata: {
            allowMultiselect: false,
          },
          validation: {
            required: true,
          },
          role: 'status',
        };
      },
      getValue: (vals) => Array.isArray(vals?.status) ? vals.status : (vals?.status ? [vals.status] : []),
      onChange: (value, onChange) => onChange('status', value),
      group: 'main',
      order: 12,
    });
  }

  if (hasEntityTypeGroup) {
    fields.push({
      field: {
        id: 'system-entity-type',
        name: 'entityType',
        label: 'Entity Type',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select entity type',
        description: 'Entity type for this record from the configured entity type group.',
        targetSchema: 'entity-type-items',
        referenceSchema: 'entity-type-groups',
        referenceRelationTypeId: 'HAS_ENTITY_TYPE_ITEM',
        referenceEntityId: entityTypeGroupId || '{{formSchema.entityTypeGroup.[0].id}}',
        columnMap: {
          response: { data: 'data.0.data' },
          item: {
            id: 'id',
            label: 'label',
            icon: 'icon',
            color: 'color',
          },
        },
        metadata: {
          allowMultiselect: false,
        },
        validation: {
          required: true,
        },
        role: 'entityType',
        order: 13,
      },
      shouldShow: () => hasEntityTypeGroup === true,
      getFieldConfig: (sch) => {
        const etgId = Array.isArray(sch.entityTypeGroup) && sch.entityTypeGroup.length > 0
          ? sch.entityTypeGroup[0]?.id
          : null;
        return {
          id: 'system-entity-type',
          name: 'entityType',
          label: 'Entity Type',
          sectionId: 'system-section',
          component: 'picker',
          placeholder: 'Select entity type',
          description: 'Entity type for this record from the configured entity type group.',
          targetSchema: 'entity-type-items',
          referenceSchema: 'entity-type-groups',
          referenceRelationTypeId: 'HAS_ENTITY_TYPE_ITEM',
          referenceEntityId: etgId || '{{formSchema.entityTypeGroup.[0].id}}',
          columnMap: {
            response: { data: 'data.0.data' },
            item: {
              id: 'id',
              label: 'label',
              icon: 'icon',
              color: 'color',
            },
          },
          metadata: {
            allowMultiselect: false,
          },
          validation: {
            required: true,
          },
          role: 'entityType',
        };
      },
      getValue: (vals) => Array.isArray(vals?.entityType) ? vals.entityType : (vals?.entityType ? [vals.entityType] : []),
      onChange: (value, onChange) => onChange('entityType', value),
      group: 'main',
      order: 13,
    });
  }

  // Hierarchical parent field
  if (schema.allowHierarchicalParent === true) {
    fields.push({
      field: {
        id: 'system-parent',
        name: 'parent',
        label: 'Parent (hierarchical)',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select parent (optional)',
        targetSchema: schema.id,
        description: `Choose a parent ${schema.singular_name || 'item'} for hierarchical view`,
        validation: {
          required: false,
        },
        order: 20,
      },
      shouldShow: () => schema.allowHierarchicalParent === true,
      getFieldConfig: (sch) => ({
        id: 'system-parent',
        name: 'parent',
        label: 'Parent (hierarchical)',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select parent (optional)',
        targetSchema: sch.id,
        description: `Choose a parent ${sch.singular_name || 'item'} for hierarchical view`,
        validation: {
          required: false,
        },
      }),
      getValue: (vals) => vals?.parent === undefined ? null : vals.parent,
      onChange: (value, onChange) => {
        let nextValue: any = null;
        if (value && Array.isArray(value) && value.length > 0) {
          const first = value[0];
          nextValue = first?.id ? String(first.id) : null;
        }
        onChange('parent', nextValue);
      },
      group: 'hierarchical',
      order: 20,
    });
  }

  // Multi-select fields (companies, tenants)
  if (schema.canSelectMultiCompanies === true) {
    fields.push({
      field: {
        id: 'system-related-companies',
        name: 'relatedCompanies',
        label: 'Related Companies',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select related companies (optional)',
        targetSchema: 'companies',
        description: schema.isNotCompanyBased === true
          ? 'Choose one or more companies related to this record (optional).'
          : 'Choose one or more companies related to this record. Required for company-based schemas.',
        validation: {
          required: schema.isNotCompanyBased !== true,
        },
        metadata: {
          allowMultiselect: true,
        },
        order: 30,
      },
      shouldShow: () => schema.canSelectMultiCompanies === true,
      getFieldConfig: (sch) => ({
        id: 'system-related-companies',
        name: 'relatedCompanies',
        label: 'Related Companies',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select related companies (optional)',
        targetSchema: 'companies',
        description: sch.isNotCompanyBased === true
          ? 'Choose one or more companies related to this record (optional).'
          : 'Choose one or more companies related to this record. Required for company-based schemas.',
        validation: {
          required: sch.isNotCompanyBased !== true,
        },
        metadata: {
          allowMultiselect: true,
        },
      }),
      getValue: (vals) => vals?.relatedCompanies || [],
      onChange: (value, onChange) => onChange('relatedCompanies', value),
      group: 'multi-select',
      order: 30,
    });
  }

  if (schema.allowDataRelatedTenants === true) {
    fields.push({
      field: {
        id: 'system-related-tenants',
        name: 'relatedTenants',
        label: 'Related Tenants',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select related tenants (optional)',
        targetSchema: 'tenants',
        description: 'Choose one or more tenants related to this record (optional).',
        validation: {
          required: false,
        },
        metadata: {
          allowMultiselect: true,
        },
        order: 31,
      },
      shouldShow: () => schema.allowDataRelatedTenants === true,
      getFieldConfig: () => ({
        id: 'system-related-tenants',
        name: 'relatedTenants',
        label: 'Related Tenants',
        sectionId: 'system-section',
        component: 'picker',
        placeholder: 'Select related tenants (optional)',
        targetSchema: 'tenants',
        description: 'Choose one or more tenants related to this record (optional).',
        validation: {
          required: false,
        },
        metadata: {
          allowMultiselect: true,
        },
      }),
      getValue: (vals) => vals?.relatedTenants || [],
      onChange: (value, onChange) => onChange('relatedTenants', value),
      group: 'multi-select',
      order: 31,
    });
  }

  // Filter and sort by order
  return fields
    .filter(field => field.shouldShow(schema, values))
    .sort((a, b) => (a.order || 999) - (b.order || 999));
};

