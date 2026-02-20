// Profile Utilities

import { UserProfile, ProfileField, ProfileSection } from '../types';
import { formatCurrency, formatNumber, getT, getDefaultLanguage } from '../../shared/utils';
import { formatDate as formatDateWithLocale } from '../../shared/utils/date-utils';
import { getSupportedLocaleByCode } from '../../shared/utils/language-availables';
import { TRANSLATION_KEYS } from '../../shared/constants/translations';

export interface UserProfileToSectionsOptions {
  language?: string;
  defaultLang?: string;
}

export interface FormatProfileFieldValueOptions {
  /** Language code (e.g. 'en', 'fa') – dates are formatted using that locale's calendarLocale/locale. */
  language?: string;
}

/**
 * Get user initials from full name
 */
export const getUserInitials = (user: UserProfile): string => {
  if (user.initials) return user.initials;
  
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  
  if (user.fullName) {
    const parts = user.fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return user.fullName.charAt(0).toUpperCase();
  }
  
  return user.email?.charAt(0).toUpperCase() || '?';
};

/**
 * Resolve locale for date formatting from language (uses calendarLocale when set, else locale).
 */
function getDateLocaleCode(language?: string): string | undefined {
  const supported = language ? getSupportedLocaleByCode(language) : undefined;
  return supported?.calendarLocale ?? supported?.locale;
}

/**
 * Format profile field value based on type.
 * Pass options.language so dates use that locale's calendar (e.g. Jalali for fa via calendarLocale).
 */
export const formatProfileFieldValue = (
  field: ProfileField,
  options?: FormatProfileFieldValueOptions
): string => {
  const { value, type, format } = field;

  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  const localeCode = getDateLocaleCode(options?.language);

  switch (format) {
    case 'currency':
      return formatCurrency(typeof value === 'number' ? value : parseFloat(value) || 0);
    case 'percentage':
      const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
      return `${numValue.toFixed(2)}%`;
    case 'date':
      try {
        const dateValue = typeof value === 'string' ? new Date(value) : value;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          return formatDateWithLocale(dateValue, localeCode ?? undefined);
        }
        return String(value);
      } catch {
        return String(value);
      }
    case 'phone':
      // Basic phone formatting
      return String(value).replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    case 'email':
      return String(value);
    default:
      return String(value);
  }
};

/**
 * Convert UserProfile to ProfileSections.
 * Pass options.language (and optional options.defaultLang) to get translated section titles and field labels.
 */
export const userProfileToSections = (
  user: UserProfile,
  options?: UserProfileToSectionsOptions
): ProfileSection[] => {
  const lang = options?.language ?? getDefaultLanguage();
  const defaultLang = options?.defaultLang ?? getDefaultLanguage();
  const t = (key: string) => getT(key, lang, defaultLang);

  const sections: ProfileSection[] = [];

  // Basic Information Section
  const basicFields: ProfileField[] = [
    {
      id: 'email',
      name: 'email',
      label: t(TRANSLATION_KEYS.PROFILE_LABEL_EMAIL),
      value: user.email,
      type: 'email' as const,
      format: 'email'
    },
    {
      id: 'phone',
      name: 'phone',
      label: t(TRANSLATION_KEYS.PROFILE_LABEL_PHONE),
      value: user.phone,
      type: 'tel' as const,
      format: 'phone'
    }
  ].filter(field => field.value) as ProfileField[];

  if (basicFields.length > 0) {
    sections.push({
      id: 'basic-info',
      title: t(TRANSLATION_KEYS.PROFILE_SECTION_BASIC_INFO),
      icon: 'User',
      fields: basicFields,
      colSpan: 1,
      layout: { columns: 1, gap: 4 }
    });
  }

  // Professional Information Section
  if (user.jobTitle || user.department || user.role) {
    const professionalFields: ProfileField[] = [
      {
        id: 'job-title',
        name: 'jobTitle',
        label: t(TRANSLATION_KEYS.PROFILE_LABEL_JOB_TITLE),
        value: user.jobTitle,
        type: 'text' as const,
        format: 'default'
      },
      {
        id: 'department',
        name: 'department',
        label: t(TRANSLATION_KEYS.PROFILE_LABEL_DEPARTMENT),
        value: user.department,
        type: 'text' as const,
        format: 'default'
      },
      {
        id: 'role',
        name: 'role',
        label: t(TRANSLATION_KEYS.PROFILE_LABEL_ROLE),
        value: user.role,
        type: 'badge' as const,
        format: 'default'
      }
    ].filter(field => field.value) as ProfileField[];

    if (professionalFields.length > 0) {
      sections.push({
        id: 'professional-info',
        title: t(TRANSLATION_KEYS.PROFILE_SECTION_PROFESSIONAL),
        icon: 'Briefcase',
        fields: professionalFields,
        colSpan: 1,
        layout: { columns: 1, gap: 4 }
      });
    }
  }

  // Location Section
  if (user.location) {
    sections.push({
      id: 'location',
      title: t(TRANSLATION_KEYS.PROFILE_SECTION_LOCATION),
      icon: 'MapPin',
      fields: [{
        id: 'location',
        name: 'location',
        label: t(TRANSLATION_KEYS.PROFILE_SECTION_LOCATION),
        value: user.location,
        type: 'text' as const,
        format: 'default',
        icon: 'MapPin'
      }],
      colSpan: 1,
      layout: { columns: 1, gap: 4 }
    });
  }

  // Bio Section
  if (user.bio) {
    sections.push({
      id: 'bio',
      title: t(TRANSLATION_KEYS.PROFILE_SECTION_ABOUT),
      icon: 'UserCircle',
      fields: [{
        id: 'bio',
        name: 'bio',
        label: t(TRANSLATION_KEYS.PROFILE_LABEL_BIO),
        value: user.bio,
        type: 'text' as const,
        format: 'default'
      }],
      colSpan: 2,
      layout: { columns: 1, gap: 4 }
    });
  }

  // Activity Section
  const activityFields: ProfileField[] = [
    {
      id: 'joined-at',
      name: 'joinedAt',
      label: t(TRANSLATION_KEYS.PROFILE_LABEL_JOINED),
      value: user.joinedAt,
      type: 'date' as const,
      format: 'date'
    },
    {
      id: 'last-login',
      name: 'lastLogin',
      label: t(TRANSLATION_KEYS.PROFILE_LABEL_LAST_LOGIN),
      value: user.lastLogin,
      type: 'date' as const,
      format: 'date'
    }
  ].filter(field => field.value) as ProfileField[];

  if (activityFields.length > 0) {
    sections.push({
      id: 'activity',
      title: t(TRANSLATION_KEYS.PROFILE_SECTION_ACTIVITY),
      icon: 'Activity',
      fields: activityFields,
      colSpan: 1,
      layout: { columns: 1, gap: 4 }
    });
  }

  return sections;
};


