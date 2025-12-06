// Dynamic Card Renderer Component

import { motion } from 'framer-motion';
import React, { KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Rating, Countdown, CodeBadge, ForceIcon, Avatar } from '@/gradian-ui/form-builder/form-elements';
import { CardSection, FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { cn } from '@/gradian-ui/shared/utils';
import { CardContent } from '@/gradian-ui/data-display/card/components/CardContent';
import { CardWrapper } from '@/gradian-ui/data-display/card/components/CardWrapper';
import { getArrayValuesByRole, getBadgeConfig, getSingleValueByRole, getValueByRole, renderCardSection, RoleBasedAvatar } from '../utils';
import { AvatarUser } from './AvatarUser';
import { BadgeViewer, BadgeRenderer } from '../../form-builder/form-elements/utils/badge-viewer';
import { getFieldsByRole } from '../../form-builder/form-elements/utils/field-resolver';
import { DynamicActionButtons } from './DynamicActionButtons';
import { DynamicMetricRenderer } from './DynamicMetricRenderer';
import { UI_PARAMS } from '@/gradian-ui/shared/constants/application-variables';
import { CopyContent } from '../../form-builder/form-elements/components/CopyContent';
import { normalizeOptionArray } from '../../form-builder/form-elements/utils/option-normalizer';
import type { BadgeItem } from '../../form-builder/form-elements/utils/badge-viewer';
import { useRouter } from 'next/navigation';
import { getDisplayStrings, getPrimaryDisplayString, hasDisplayValue } from '../utils/value-display';
import { renderHighlightedText } from '../../shared/utils/highlighter';
import { formatFieldValue } from '../table/utils/field-formatters';
import { EntityMetadata } from './CreateUpdateDetail';

export interface DynamicCardRendererProps {
  schema: FormSchema;
  data: any;
  index: number;
  onView?: (data: any) => void; // Opens dialog (card click)
  onViewDetail?: (data: any) => void; // Navigates to detail page (view button)
  onEdit?: (data: any) => void;
  onDelete?: (data: any) => void;
  viewMode?: 'grid' | 'list';
  className?: string;
  maxBadges?: number;
  maxMetrics?: number;
  disableAnimation?: boolean;
  highlightQuery?: string;
  /**
   * When true, the card is rendered inside a dialog and should not behave like a clickable/focusable card.
   */
  isInDialog?: boolean;
  /**
   * When true, shows user details (created/updated metadata)
   */
  showUserDetails?: boolean;
}

export const DynamicCardRenderer: React.FC<DynamicCardRendererProps> = ({
  schema,
  data,
  index,
  onView, // Card click - opens dialog
  onViewDetail, // View button - navigates to detail page
  onEdit,
  onDelete,
  viewMode = 'grid',
  className,
  maxBadges = 2,
  maxMetrics = 3,
  disableAnimation = false,
  highlightQuery = '',
  isInDialog = false,
  showUserDetails = false,
}) => {
  const router = useRouter();
  const normalizedHighlightQuery = highlightQuery.trim();
  // Get card metadata from schema
  const cardMetadata = schema?.cardMetadata || [] as CardSection[];

  // Default actions configuration
  const showView = !!onView;
  const showEdit = !!onEdit;
  const showDelete = !!onDelete;

  // Find status field options from schema
  const findStatusFieldOptions = () => {
    if (!schema || !schema.fields) return undefined;

    for (const field of schema.fields) {
      if (field.role === 'status' && field.options) {
        return field.options;
      }
    }
    return undefined;
  };

  const statusFieldDef = schema?.fields?.find(field => field.role === 'status');
  const statusRoleValues = getArrayValuesByRole(schema, data, 'status');
  const statusFieldArray = statusRoleValues.length > 0 ? statusRoleValues : [];
  const rawStatusValueFromField = statusFieldDef ? data?.[statusFieldDef.name] : undefined;
  const statusOptions = findStatusFieldOptions();
  
  // Check if schema has statusGroup configured (new status system)
  const hasStatusGroup = Array.isArray(schema?.statusGroup) && schema.statusGroup.length > 0;

  // Check if rating, status, duedate, code, avatar, icon, and person fields exist in schema
  const hasRatingField = schema?.fields?.some(field => field.role === 'rating') || false;
  const hasStatusField = schema?.fields?.some(field => field.role === 'status') || false || hasStatusGroup;
  const hasDuedateField = schema?.fields?.some(field => field.role === 'duedate') || false;
  const duedateFieldLabel = schema?.fields?.find(field => field.role === 'duedate')?.label || 'Due Date';
  const hasCodeField = schema?.fields?.some(field => field.role === 'code') || false;
  const hasAvatarField = schema?.fields?.some(field => field.role === 'avatar') || false;
  const hasIconField = schema?.fields?.some(field => field.role === 'icon') || false;
  const hasColorField = schema?.fields?.some(field => field.role === 'color') || false;
  const hasPersonField = schema?.fields?.some(field => field.role === 'person') || false;

  // Filter out performance section from cardMetadata
  const filteredSections = cardMetadata.filter(section =>
    section.id !== 'performance'
  ) || [];

  // Get all badge fields from schema and combine their values
  const badgeFields = getFieldsByRole(schema, 'badge');
  const allBadgeValues: any[] = [];
  const allOptions = new Map<string, any>();
  let combinedBadgeField: any = null;
  const badgeValueTargetSchema = new Map<string, string>();

  // Collect values from all badge fields and combine options
  badgeFields.forEach(field => {
    const value = data[field.name];
    const valuesArray = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : [];
    if (valuesArray.length > 0) {
      allBadgeValues.push(...valuesArray);
    }

    if (field.targetSchema) {
      valuesArray.forEach((entry) => {
        const normalized = normalizeOptionArray(entry)[0];
        const entryId = normalized?.id ?? (typeof entry === 'string' ? entry : undefined);
        if (entryId) {
          badgeValueTargetSchema.set(entryId, field.targetSchema as string);
        }
      });
    }

    // Collect options from all fields
    if (field.options && Array.isArray(field.options)) {
      field.options.forEach((opt: any) => {
        const optionKey = opt?.id ?? opt?.value;
        if (optionKey && !allOptions.has(optionKey)) {
          allOptions.set(optionKey, opt);
        }
      });
    }

    // Use first badge field as base, but combine options from all
    if (!combinedBadgeField && field) {
      combinedBadgeField = { ...field, options: Array.from(allOptions.values()) };
    }
  });

  // Update combined field with all options
  if (combinedBadgeField && allOptions.size > 0) {
    combinedBadgeField.options = Array.from(allOptions.values());
  }

  // Fallback if no badge fields found
  const badgeValues = allBadgeValues.length > 0
    ? allBadgeValues
    : (getArrayValuesByRole(schema, data, 'badge') || data.categories || []);

  const codeFieldValue = getSingleValueByRole(schema, data, 'code');

  const normalizedStatusOption =
    normalizeOptionArray(rawStatusValueFromField)[0] ??
    normalizeOptionArray(statusFieldArray)[0] ??
    normalizeOptionArray(data?.status)[0];
  const statusValueFromRole = getSingleValueByRole(schema, data, 'status', '');

  const statusIdentifier =
    normalizedStatusOption?.id ??
    (typeof rawStatusValueFromField === 'string' || typeof rawStatusValueFromField === 'number'
      ? String(rawStatusValueFromField)
      : undefined) ??
    (typeof data?.status === 'string' || typeof data?.status === 'number'
      ? String(data.status)
      : undefined);

  const statusLabel =
    normalizedStatusOption?.label ??
    (statusValueFromRole && statusValueFromRole.trim() !== '' ? statusValueFromRole : undefined) ??
    getPrimaryDisplayString(rawStatusValueFromField) ??
    getPrimaryDisplayString(statusFieldArray) ??
    getPrimaryDisplayString(data?.status) ??
    statusIdentifier ??
    'PENDING';

  const statusValueForConfig = statusIdentifier ?? statusLabel ?? 'PENDING';
  const configMetadata = getBadgeConfig(statusValueForConfig, statusOptions);

  const normalizedStatusMetadata = {
    color: normalizedStatusOption?.color ?? configMetadata.color ?? 'outline',
    icon: normalizedStatusOption?.icon ?? configMetadata.icon,
    label: statusLabel,
    value: statusValueForConfig,
  };

  // Check if subtitle role exists in schema
  const hasSubtitleRole = schema?.fields?.some(field => field.role === 'subtitle') || false;

  // Get subtitle value(s) - concatenate multiple fields with same role using |
  const subtitleValue = hasSubtitleRole ? getValueByRole(schema, data, 'subtitle') : null;
  const subtitleStrings = getDisplayStrings(subtitleValue);
  const subtitle = subtitleStrings.length > 0 ? subtitleStrings.join(' | ') : null;

  // Check if description role exists in schema OR if any field label contains "description"
  const hasDescriptionRole = schema?.fields?.some(field =>
    field.role === 'description' ||
    (field.label && typeof field.label === 'string' && field.label.toLowerCase().includes('description'))
  ) || false;

  // Get description value(s) - concatenate multiple fields with same role using |
  let descriptionValue: any = null;
  if (hasDescriptionRole) {
    // First try to get by role (concatenates multiple fields with |)
    const roleBasedDescription = getValueByRole(schema, data, 'description');
    const roleDescriptionStrings = getDisplayStrings(roleBasedDescription);
    if (roleDescriptionStrings.length > 0) {
      descriptionValue = roleDescriptionStrings.join(' | ');
    } else {
      // If not found by role, find by field label containing "description"
      if (schema?.fields) {
        const descriptionFields = schema.fields.filter(field =>
          field.label &&
          typeof field.label === 'string' &&
          field.label.toLowerCase().includes('description') &&
          !field.role // Only if it doesn't already have a role
        );
        if (descriptionFields.length > 0) {
          const values = descriptionFields
            .map(field => getDisplayStrings(data[field.name]).join(' | '))
            .filter(val => val && val.trim() !== '');
          if (values.length > 0) {
            descriptionValue = values.join(' | ');
          }
        }
      }
    }
  }

  const descriptionStrings = getDisplayStrings(descriptionValue);
  const description = descriptionStrings.length > 0 ? descriptionStrings.join(' | ') : null;

  const handleNavigateToEntity = (schemaId: string, entityId: string) => {
    if (!schemaId || !entityId) {
      return;
    }
    router.push(`/page/${schemaId}/${encodeURIComponent(entityId)}?showBack=true`);
  };

  const isBadgeItemClickable = (item: BadgeItem): boolean => {
    const candidateId = item.normalized?.id ?? item.id;
    if (!candidateId) return false;
    return (
      badgeValueTargetSchema.has(candidateId) ||
      badgeValueTargetSchema.has(item.id)
    );
  };

  const handleBadgeClick = (item: BadgeItem) => {
    if (!isBadgeItemClickable(item)) return;
    const candidateId = item.normalized?.id ?? item.id;
    const targetSchema =
      badgeValueTargetSchema.get(candidateId) ||
      badgeValueTargetSchema.get(item.id);
    if (!targetSchema) return;
    handleNavigateToEntity(targetSchema, candidateId);
  };

  // Get duedate value - check if it's a valid date
  const duedateValue = getSingleValueByRole(schema, data, 'duedate', '') || data.duedate || data.expirationDate;
  // Validate that duedate is a valid date value (not empty string, null, or undefined)
  // Check if it's a valid string or Date object, and if string, ensure it's not empty
  let duedateField: string | Date | null = null;
  if (duedateValue) {
    if (duedateValue instanceof Date) {
      duedateField = duedateValue;
    } else if (typeof duedateValue === 'string' && duedateValue.trim() !== '') {
      // Try to parse the date string to ensure it's valid
      const parsedDate = new Date(duedateValue);
      if (!isNaN(parsedDate.getTime())) {
        duedateField = duedateValue;
      }
    }
  }

  // Get person value (assignedTo)
  const personFieldDef = schema?.fields?.find(field => field.role === 'person');
  const personValue = personFieldDef ? (data[personFieldDef.name] || data.assignedTo) : (data.assignedTo || null);
  let personField: any = null;
  if (personValue) {
    // Normalize person value
    const normalizedPerson = normalizeOptionArray(personValue)[0];
    if (normalizedPerson) {
      personField = {
        ...normalizedPerson,
        ...normalizedPerson.normalized,
        ...personValue,
        label: normalizedPerson.label || normalizedPerson.normalized?.label || personValue?.label || personValue?.name || personValue?.email || 'Unknown',
        avatar: normalizedPerson.avatar || normalizedPerson.normalized?.avatar || personValue?.avatar || personValue?.image || personValue?.avatarUrl || null,
        avatarUrl: normalizedPerson.avatar || normalizedPerson.normalized?.avatar || personValue?.avatar || personValue?.image || personValue?.avatarUrl || null,
        id: normalizedPerson.id || normalizedPerson.normalized?.id || personValue?.id || null,
        email: normalizedPerson.email || normalizedPerson.normalized?.email || personValue?.email || null,
        firstName: normalizedPerson.firstName || normalizedPerson.normalized?.firstName || personValue?.firstName || null,
        lastName: normalizedPerson.lastName || normalizedPerson.normalized?.lastName || personValue?.lastName || null,
        username: normalizedPerson.username || normalizedPerson.normalized?.username || personValue?.username || null,
        postTitle: normalizedPerson.postTitle || normalizedPerson.normalized?.postTitle || personValue?.postTitle || null,
        company: normalizedPerson.company || normalizedPerson.normalized?.company || personValue?.company || null,
      };
    } else if (personValue && typeof personValue === 'object') {
      personField = {
        label: personValue.label || personValue.name || personValue.email || 'Unknown',
        avatar: personValue.avatar || personValue.image || personValue.avatarUrl || null,
        avatarUrl: personValue.avatar || personValue.image || personValue.avatarUrl || null,
        id: personValue.id || null,
        email: personValue.email || null,
        firstName: personValue.firstName || null,
        lastName: personValue.lastName || null,
        username: personValue.username || null,
        postTitle: personValue.postTitle || null,
        company: personValue.company || null,
        ...personValue,
      };
    }
  }

  // Get title - check if role "title" exists, otherwise use first text field
  const hasTitleRole = schema?.fields?.some(field => field.role === 'title') || false;
  let title: string = '';

  if (hasTitleRole) {
    // Use title role value
    title = getValueByRole(schema, data, 'title') || data.name || 'Unknown';
  } else {
    // Find first text field that doesn't have excluded roles (sorted by order)
    const excludedRoles = ['code', 'subtitle', 'description'];
    const textFields = schema?.fields
      ?.filter(field =>
        field.component === 'text' &&
        (!field.role || !excludedRoles.includes(field.role)) &&
        hasDisplayValue(data[field.name])
      )
      .sort((a, b) => (a.order || 999) - (b.order || 999)) || [];

    const firstTextField = textFields[0];

    if (firstTextField) {
      const fieldValue = data[firstTextField.name];
      const primaryText = getPrimaryDisplayString(fieldValue);
      title = primaryText ?? (fieldValue ? String(fieldValue).trim() : (data.name || 'Unknown'));
    } else {
      title = data.name || 'Unknown';
    }
  }


  // Check if entity is incomplete
  const isIncomplete = data.incomplete === true;

  // Check if entity is forced
  const isForce = data.isForce === true;
  const forceReason = data.forceReason || '';

  const cardConfig = {
    title,
    subtitle,
    avatarField: getSingleValueByRole(schema, data, 'avatar', data.name) || data.name || 'V',
    statusField: normalizedStatusMetadata.value,
    statusMetadata: normalizedStatusMetadata,
    badgeField: combinedBadgeField,
    badgeValues,
    ratingField: getSingleValueByRole(schema, data, 'rating') || data.rating || 0,
    codeField: codeFieldValue,
    metricsField: data.performanceMetrics || null,
    duedateField,
    personField,
    sections: filteredSections,
    statusOptions,
    isIncomplete
  };



  const cardClasses = cn(
    'group cursor-pointer transition-all duration-100 h-full',
    viewMode === 'list' && 'w-full',
    className
  );

  const contentClasses = cn(
    'flex gap-4',
    viewMode === 'grid' ? 'flex-col' : 'flex-row items-center'
  );

  return (
    <motion.div
      initial={disableAnimation ? false : { opacity: 0, y: 8 }}
      animate={disableAnimation ? false : { opacity: 1, y: 0 }}
      transition={
        disableAnimation
          ? {}
          : {
            duration: 0.3,
            delay: Math.min(
              index * UI_PARAMS.CARD_INDEX_DELAY.STEP,
              UI_PARAMS.CARD_INDEX_DELAY.MAX
            ),
            ease: 'easeOut',
          }
      }
      whileHover={undefined}
      whileTap={disableAnimation ? undefined : {
        scale: 0.995,
        transition: { duration: 0.1 }
      }}
      className={cn(
        cardClasses,
        isInDialog && 'focus:outline-none focus-visible:outline-none'
      )}
      role={isInDialog ? undefined : 'button'}
      tabIndex={isInDialog ? -1 : 0}
      onClick={(e) => {
        if (isInDialog) {
          // In dialog mode, clicking the card itself should not trigger view navigation
          return;
        }
        // Only open dialog if click is not on action buttons, tooltip triggers, or avatar user dialogs
        const target = e.target as HTMLElement;
        if (!target.closest('[data-action-button]') && 
            !target.closest('[data-tooltip-trigger]') &&
            !target.closest('[data-avatar-user]')) {
          e.preventDefault();
          e.stopPropagation();
          if (onView) onView(data);
        }
      }}
      aria-label={`Vendor card for ${cardConfig.title}`}
    >
      <CardWrapper
        config={{
          id: `dynamic-card-${data.id || index}`,
          name: `Dynamic Card ${cardConfig.title}`,
          styling: { variant: 'default', size: 'md' },
          behavior: { hoverable: !disableAnimation, clickable: true }
        }}
        className={cn(
          "h-full bg-white dark:bg-gray-800 overflow-hidden",
          isInDialog 
            ? "rounded-lg sm:rounded-xl" 
            : "rounded-2xl",
          !className?.includes('border-none') && "border border-gray-200 dark:border-gray-700",
          !disableAnimation && !isInDialog && "transition-colors hover:bg-gray-200 dark:hover:bg-gray-600",
          className?.includes('border-none') 
            ? "focus-within:ring-0" 
            : !isInDialog && "focus-within:ring-2 focus-within:ring-violet-400 focus-within:ring-offset-0 focus-within:rounded-xl"
        )}
        onKeyDown={(e: KeyboardEvent) => {
          if (isInDialog) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (onView) onView(data);
          }
        }}
      >
        <CardContent className={cn(
          "h-full flex flex-col",
          viewMode === 'list' 
            ? 'p-2 sm:p-3' 
            : isInDialog 
              ? 'p-2 sm:p-3 md:p-4' 
              : 'p-3 sm:p-4'
        )}>
          {viewMode === 'grid' ? (
            <>
              {/* Avatar and Status Header */}
              <div className={cn(
                "flex justify-between mb-2 w-full",
                isInDialog 
                  ? "flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-3" 
                  : "flex-row space-x-3 flex-nowrap"
              )}>
                <div className={cn(
                  "flex items-center gap-2",
                  isInDialog ? "w-full sm:flex-1 min-w-0" : "flex-1 min-w-0 truncate"
                )}>
                  {(hasAvatarField || hasIconField || hasColorField) && (
                    <motion.div
                      initial={disableAnimation ? false : { opacity: 0, scale: 0.8 }}
                      animate={disableAnimation ? false : { opacity: 1, scale: 1 }}
                      transition={disableAnimation ? {} : { duration: 0.3 }}
                      whileHover={disableAnimation ? undefined : { scale: 1.01, transition: { type: "spring", stiffness: 300, damping: 30 } }}
                    >
                      <RoleBasedAvatar
                        schema={schema}
                        data={data}
                        size="lg"
                        showBorder={true}
                        showShadow={true}
                        />
                    </motion.div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <motion.div
                        className="flex items-center gap-1.5 flex-1 min-w-0 pe-2"
                        initial={disableAnimation ? false : { opacity: 0, x: 5 }}
                        animate={disableAnimation ? false : { opacity: 1, x: 0 }}
                        transition={disableAnimation ? {} : { duration: 0.3 }}
                        whileHover={{ x: 2, transition: { duration: 0.15, delay: 0 } }}
                      >
                        <motion.h3
                          className={cn(
                            "font-semibold text-gray-900 dark:text-gray-50 transition-colors duration-100 truncate flex-1 min-w-0",
                            isInDialog 
                              ? "text-sm sm:text-base" 
                              : "text-md",
                            !isInDialog && "group-hover:text-violet-800 dark:group-hover:text-violet-300"
                          )}
                          whileHover={isInDialog ? undefined : { x: 2, transition: { duration: 0.15, delay: 0 } }}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <ForceIcon isForce={isForce} size="md" title={cardConfig.title} forceReason={forceReason} showTooltip={false} />
                            {renderHighlightedText(cardConfig.title, normalizedHighlightQuery)}
                            <span
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="ms-1"
                            >
                              <CopyContent content={cardConfig.title} />
                            </span>
                          </span>
                        </motion.h3>
                      </motion.div>
                      {/* Code Badge */}
                      {hasCodeField && cardConfig.codeField && (
                        <motion.div
                          initial={disableAnimation ? false : { opacity: 0, scale: 0.9 }}
                          animate={disableAnimation ? false : { opacity: 1, scale: 1 }}
                          transition={disableAnimation ? {} : { duration: 0.2 }}
                        >
                          <CodeBadge code={cardConfig.codeField} />
                        </motion.div>
                      )}
                      {/* Incomplete Badge */}
                      {cardConfig.isIncomplete && (
                        <motion.div
                          initial={disableAnimation ? false : { opacity: 0, scale: 0.9 }}
                          animate={disableAnimation ? false : { opacity: 1, scale: 1 }}
                          transition={disableAnimation ? {} : { duration: 0.2 }}
                        >
                          <Badge variant="warning" className="flex items-center gap-1 px-1.5 py-0.5 shadow-sm">
                            <IconRenderer iconName="AlertTriangle" className="h-3 w-3" />
                            <span className="text-[0.625rem]">Incomplete</span>
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    {cardConfig.subtitle && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, x: 5 }}
                        animate={disableAnimation ? false : { opacity: 1, x: 0 }}
                        transition={disableAnimation ? {} : { duration: 0.3 }}
                        className="text-xs text-gray-500 dark:text-gray-400 truncate"
                        whileHover={{ x: 2, transition: { duration: 0.15, delay: 0 } }}
                      >
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {renderHighlightedText(cardConfig.subtitle, normalizedHighlightQuery)}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
                {(hasRatingField || hasStatusField) && (
                  <div className={cn(
                    "flex gap-2",
                    isInDialog 
                      ? "flex-row sm:flex-col items-start sm:items-end w-full sm:w-auto sm:shrink-0" 
                      : "flex-col items-end shrink-0"
                  )}>
                    {/* Rating */}
                    {hasRatingField && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, y: -10 }}
                        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                        transition={disableAnimation ? {} : { duration: 0.3 }}
                        whileHover={{ x: 2, transition: { duration: 0.15, delay: 0 } }}
                      >
                        <Rating
                          value={cardConfig.ratingField}
                          size="sm"
                          showValue={true}
                        />
                      </motion.div>
                    )}
                    {/* Status */}
                    {hasStatusField && (statusFieldDef || hasStatusGroup) && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, scale: 0.9 }}
                        animate={disableAnimation ? false : { opacity: 1, scale: 1 }}
                        transition={disableAnimation ? {} : { duration: 0.2 }}
                        whileHover={disableAnimation ? undefined : { x: 2, scale: 1.05, transition: { duration: 0.1, delay: 0 } }}
                      >
                        {formatFieldValue(
                          statusFieldDef || {
                            id: 'status',
                            name: 'status',
                            role: 'status',
                            component: 'picker',
                          },
                          rawStatusValueFromField || data?.status,
                          data
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {hasDescriptionRole && description && (
                <motion.div
                  initial={disableAnimation ? false : { opacity: 0, y: 5 }}
                  animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                  transition={disableAnimation ? {} : { duration: 0.3 }}
                  className="w-full mb-2"
                  whileHover={{ x: 2, transition: { duration: 0.15 } }}
                >
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                    {renderHighlightedText(description, normalizedHighlightQuery)}
                  </p>
                </motion.div>
              )}

              {/* Force Reason */}
              {isForce && forceReason && (
                <motion.div
                  initial={disableAnimation ? false : { opacity: 0, y: 5 }}
                  animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                  transition={disableAnimation ? {} : { duration: 0.3 }}
                  className="w-full mb-2"
                >
                  <p className="text-xs text-pink-700 dark:text-pink-400 line-clamp-2">
                    <span className="font-medium">Force Reason:</span> {forceReason}
                  </p>
                </motion.div>
              )}

              <div
                className="w-full items-center justify-start mb-2"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {cardConfig.badgeField && Array.isArray(cardConfig.badgeValues) && cardConfig.badgeValues.length > 0 ? (
                  <BadgeViewer
                    field={cardConfig.badgeField}
                    value={cardConfig.badgeValues}
                    maxBadges={maxBadges}
                    className="w-full"
                    badgeVariant="default"
                    enforceVariant
                    animate={!disableAnimation}
                    onBadgeClick={
                      badgeValueTargetSchema.size > 0 ? handleBadgeClick : undefined
                    }
                    isItemClickable={isBadgeItemClickable}
                  />
                ) : (
                  cardConfig.badgeValues.length > 0 && (
                    <BadgeRenderer
                      items={cardConfig.badgeValues}
                      maxBadges={maxBadges}
                      className="w-full"
                      badgeVariant="outline"
                      animate={!disableAnimation}
                      onBadgeClick={
                        badgeValueTargetSchema.size > 0 ? handleBadgeClick : undefined
                      }
                      isItemClickable={isBadgeItemClickable}
                    />
                  )
                )}
              </div>

              {/* Performance Metrics */}
              {Array.isArray(cardConfig.metricsField) && cardConfig.metricsField.length > 0 && (
                <motion.div
                  initial={disableAnimation ? false : { opacity: 0, y: 10 }}
                  animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                  transition={disableAnimation ? {} : { duration: 0.3 }}
                  className="w-full mb-2 border-t border-gray-100 dark:border-gray-800 pt-2 mt-2"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Performance:</div>
                  <DynamicMetricRenderer
                    metrics={cardConfig.metricsField}
                    maxMetrics={maxMetrics}
                    className="w-full"
                    animate={!disableAnimation}
                  />
                </motion.div>
              )}

              {/* Separator after metrics */}
              {Array.isArray(cardConfig.metricsField) && cardConfig.metricsField.length > 0 && (
                <div className="w-full border-t border-gray-100 dark:border-gray-800 mb-3"></div>
              )}

              {/* Entity Metadata */}
              {showUserDetails && (
                <motion.div
                  initial={disableAnimation ? false : { opacity: 0, y: 5 }}
                  animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                  transition={disableAnimation ? {} : { duration: 0.3 }}
                  className="w-full mb-3 pt-2 border-t border-gray-200 dark:border-gray-600"
                >
                  <EntityMetadata
                    createdAt={data.createdAt}
                    createdBy={data.createdBy}
                    updatedAt={data.updatedAt}
                    updatedBy={data.updatedBy}
                    variant="compact"
                    avatarType="user"
                  />
                </motion.div>
              )}

              {/* Person Field */}
              {hasPersonField && cardConfig.personField && (
                <motion.div
                  initial={disableAnimation ? false : { opacity: 0, y: 10 }}
                  animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                  transition={disableAnimation ? {} : { duration: 0.3 }}
                  className="w-full mb-3 flex items-center gap-2"
                >
                  <AvatarUser
                    user={cardConfig.personField}
                    avatarType="user"
                    size="md"
                    showDialog={true}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Assigned To</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cardConfig.personField.label}</span>
                  </div>
                </motion.div>
              )}

              {/* Due Date Countdown */}
              {hasDuedateField && cardConfig.duedateField && (
                <motion.div
                  initial={disableAnimation ? false : { opacity: 0, y: 10 }}
                  animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                  transition={disableAnimation ? {} : { duration: 0.3 }}
                  className="w-full mb-3"
                >
                  <Countdown
                    expireDate={cardConfig.duedateField}
                    includeTime={true}
                    size="sm"
                    showIcon={true}
                    fieldLabel={duedateFieldLabel}
                  />
                </motion.div>
              )}

              {/* Content Sections */}
              <div className="flex-1">
                <motion.div
                  className={cn(
                    "grid text-xs",
                    filteredSections.length === 1 
                      ? "grid-cols-1 gap-3 sm:gap-4" 
                      : isInDialog
                        ? "grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
                        : "grid-cols-1 sm:grid-cols-2 gap-4"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {filteredSections.map((section, index) => (
                    <div
                      key={section.id || `section-${index}`}
                      className={cn(
                        "overflow-hidden",
                        section.colSpan === 2 ? "col-span-1 sm:col-span-2" : "col-span-1"
                      )}
                    >
                      {renderCardSection({ section, schema, data, maxMetrics, onBadgeNavigate: handleNavigateToEntity })}
                    </div>
                  ))}
                </motion.div>
              </div>
            </>
          ) : (
            // List view layout
            <div className="flex items-center space-x-4 w-full flex-wrap gap-2 justify-between">
              <div className="flex items-center gap-2">
                {(hasAvatarField || hasIconField || hasColorField) && (
                  <motion.div
                    initial={disableAnimation ? false : { opacity: 0, scale: 0.8 }}
                    animate={disableAnimation ? false : { opacity: 1, scale: 1 }}
                    transition={disableAnimation ? {} : { duration: 0.3 }}
                    whileHover={disableAnimation ? undefined : { scale: 1.01, transition: { type: "spring", stiffness: 300, damping: 30 } }}
                  >
                    <RoleBasedAvatar
                      schema={schema}
                      data={data}
                      size="xl"
                      showBorder={true}
                      showShadow={true}
                    />
                  </motion.div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <motion.h3
                      initial={disableAnimation ? false : { opacity: 0, x: 5 }}
                      animate={disableAnimation ? false : { opacity: 1, x: 0 }}
                      transition={disableAnimation ? {} : { duration: 0.3 }}
                      className={cn(
                        "text-base font-semibold text-gray-900 dark:text-gray-200 truncate flex-1 min-w-0",
                        !disableAnimation && "group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors duration-100"
                      )}
                      whileHover={disableAnimation ? undefined : {
                        x: 2,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ForceIcon isForce={isForce} size="md" title={cardConfig.title} forceReason={forceReason} showTooltip={false} />
                        {renderHighlightedText(cardConfig.title, normalizedHighlightQuery)}
                        <span
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="ms-1"
                        >
                          <CopyContent content={cardConfig.title} />
                        </span>
                      </span>
                    </motion.h3>
                    {/* Code Badge */}
                    {hasCodeField && cardConfig.codeField && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, scale: 0.9 }}
                        animate={disableAnimation ? false : { opacity: 1, scale: 1 }}
                        transition={disableAnimation ? {} : { duration: 0.2 }}
                      >
                        <CodeBadge code={cardConfig.codeField} />
                      </motion.div>
                    )}
                    {/* Incomplete Badge */}
                    {cardConfig.isIncomplete && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, scale: 0.9 }}
                        animate={disableAnimation ? false : { opacity: 1, scale: 1 }}
                        transition={disableAnimation ? {} : { duration: 0.2 }}
                      >
                        <Badge variant="warning" className="flex items-center gap-1 px-1.5 py-0.5 shadow-sm">
                          <IconRenderer iconName="AlertTriangle" className="h-3 w-3" />
                          <span className="text-xs">Incomplete</span>
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                  {cardConfig.subtitle && (
                    <motion.p
                      initial={disableAnimation ? false : { opacity: 0, x: 5 }}
                      animate={disableAnimation ? false : { opacity: 1, x: 0 }}
                      transition={disableAnimation ? {} : { duration: 0.3 }}
                      className={cn(
                        "text-xs text-gray-500 dark:text-gray-400 truncate",
                        !disableAnimation && "group-hover:text-gray-700 transition-colors duration-200"
                      )}
                      whileHover={disableAnimation ? undefined : {
                        x: 2,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }}
                    >
                      {renderHighlightedText(cardConfig.subtitle, normalizedHighlightQuery)}
                    </motion.p>
                  )}
                  {/* Force Reason */}
                  {isForce && forceReason && (
                    <motion.div
                      initial={disableAnimation ? false : { opacity: 0, x: 5 }}
                      animate={disableAnimation ? false : { opacity: 1, x: 0 }}
                      transition={disableAnimation ? {} : { duration: 0.3 }}
                      className="mt-1"
                    >
                      <p className="text-xs text-pink-700 dark:text-pink-400 truncate">
                        <span className="font-medium">Force Reason:</span> {forceReason}
                      </p>
                    </motion.div>
                  )}
                  {/* Entity Metadata */}
                  {showUserDetails && (
                    <motion.div
                      initial={disableAnimation ? false : { opacity: 0, x: 5 }}
                      animate={disableAnimation ? false : { opacity: 1, x: 0 }}
                      transition={disableAnimation ? {} : { duration: 0.3 }}
                      className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800"
                    >
                      <EntityMetadata
                        createdAt={data.createdAt}
                        createdBy={data.createdBy}
                        updatedAt={data.updatedAt}
                        updatedBy={data.updatedBy}
                        variant="compact"
                        avatarType="user"
                      />
                    </motion.div>
                  )}
                  <div
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {cardConfig.badgeField && Array.isArray(cardConfig.badgeValues) && cardConfig.badgeValues.length > 0 ? (
                      <BadgeViewer
                        field={cardConfig.badgeField}
                        value={cardConfig.badgeValues}
                        maxBadges={maxBadges}
                        badgeVariant="default"
                        enforceVariant
                        animate={!disableAnimation}
                        onBadgeClick={
                          badgeValueTargetSchema.size > 0 ? handleBadgeClick : undefined
                        }
                        isItemClickable={isBadgeItemClickable}
                      />
                    ) : (
                      cardConfig.badgeValues.length > 0 && (
                        <BadgeRenderer
                          items={cardConfig.badgeValues}
                          maxBadges={maxBadges}
                          badgeVariant="outline"
                          animate={!disableAnimation}
                          onBadgeClick={
                            badgeValueTargetSchema.size > 0 ? handleBadgeClick : undefined
                          }
                          isItemClickable={isBadgeItemClickable}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
              {(hasRatingField || hasStatusField || hasDuedateField || hasPersonField) && (
                <div className="flex flex-row items-center justify-between space-y-1 ms-auto gap-2">
                  <div className="flex items-center gap-2">
                    {hasPersonField && cardConfig.personField && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, y: -10 }}
                        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                        transition={disableAnimation ? {} : { duration: 0.3 }}
                        whileHover={disableAnimation ? undefined : {
                          scale: 1.01,
                          transition: { type: "spring", stiffness: 300, damping: 30 }
                        }}
                        className="flex items-center gap-2"
                      >
                        <AvatarUser
                          user={cardConfig.personField}
                          avatarType="user"
                          size="sm"
                          showDialog={true}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{cardConfig.personField.label}</span>
                      </motion.div>
                    )}
                    {hasDuedateField && cardConfig.duedateField && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, y: -10 }}
                        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                        transition={disableAnimation ? {} : { duration: 0.3 }}
                        whileHover={disableAnimation ? undefined : {
                          scale: 1.01,
                          transition: { type: "spring", stiffness: 300, damping: 30 }
                        }}
                      >
                        <Countdown
                          expireDate={cardConfig.duedateField}
                          includeTime={true}
                          size="sm"
                          showIcon={true}
                          fieldLabel={duedateFieldLabel}
                        />
                      </motion.div>
                    )}
                  </div>
                  <div className="flex items-end gap-2 flex-col">
                    {hasRatingField && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, y: -10 }}
                        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
                        transition={disableAnimation ? {} : { duration: 0.3 }}
                        whileHover={disableAnimation ? undefined : {
                          scale: 1.01,
                          transition: { type: "spring", stiffness: 300, damping: 30 }
                        }}
                      >
                        <Rating
                          value={cardConfig.ratingField}
                          size="sm"
                          showValue={true}
                        />
                      </motion.div>
                    )}
                    {hasStatusField && (statusFieldDef || hasStatusGroup) && (
                      <motion.div
                        initial={disableAnimation ? false : { opacity: 0, scale: 0.9 }}
                        animate={disableAnimation ? false : { opacity: 1, scale: 1 }}
                        transition={disableAnimation ? {} : { duration: 0.3 }}
                        whileHover={disableAnimation ? undefined : {
                          scale: 1.01,
                          transition: { type: "spring", stiffness: 300, damping: 30 }
                        }}
                      >
                        {formatFieldValue(
                          statusFieldDef || {
                            id: 'status',
                            name: 'status',
                            role: 'status',
                            component: 'picker',
                          },
                          rawStatusValueFromField || data?.status,
                          data
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons for List View */}
              <DynamicActionButtons
                variant="minimal"
                actions={[
                  ...(onViewDetail || onView ? [{
                    type: 'view' as const,
                    onClick: onViewDetail ? () => onViewDetail(data) : () => onView?.(data),
                  }] : []),
                  ...(onEdit ? [{
                    type: 'edit' as const,
                    onClick: () => onEdit(data),
                  }] : []),
                  ...(onDelete ? [{
                    type: 'delete' as const,
                    onClick: () => onDelete(data),
                  }] : []),
                ]}
              />
            </div>
          )}

          {/* Action Buttons - Only for Grid View */}
          {viewMode === 'grid' && (
            <div className="mt-auto pt-4">
              <DynamicActionButtons
                variant="expanded"
                actions={[
                  ...(onViewDetail || onView ? [{
                    type: 'view' as const,
                    onClick: onViewDetail ? () => onViewDetail(data) : () => onView?.(data),
                  }] : []),
                  ...(onEdit ? [{
                    type: 'edit' as const,
                    onClick: () => onEdit(data),
                  }] : []),
                  ...(onDelete ? [{
                    type: 'delete' as const,
                    onClick: () => onDelete(data),
                  }] : []),
                ]}
              />
            </div>
          )}
        </CardContent>
      </CardWrapper>
    </motion.div>
  );
};

DynamicCardRenderer.displayName = 'DynamicCardRenderer';
