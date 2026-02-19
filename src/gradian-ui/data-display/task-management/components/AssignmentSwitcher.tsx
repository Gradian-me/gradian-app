"use client";

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { User2, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';
import { NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { getInitials } from '@/gradian-ui/form-builder/form-elements/utils/avatar-utils';
import { AssignmentCounts, AssignmentUser, AssignmentView } from '../types';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage, isRTL, resolveDisplayLabel } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

interface AssignmentSwitcherProps {
  activeView: AssignmentView;
  onViewChange: (view: AssignmentView) => void;
  counts: AssignmentCounts;
  selectedUser: AssignmentUser | null;
  onUserOptionChange: (option: NormalizedOption | null) => void;
  onResetUser: () => void;
  isUsingDefaultUser: boolean;
}

export const AssignmentSwitcher = ({
  activeView,
  onViewChange,
  counts,
  selectedUser,
  onUserOptionChange,
  onResetUser,
  isUsingDefaultUser,
}: AssignmentSwitcherProps) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const language = useLanguageStore((s) => s.language);
  const defaultLang = getDefaultLanguage();
  const labelAssignedTo = getT(TRANSLATION_KEYS.LABEL_ASSIGNED_TO, language ?? undefined, defaultLang);
  const labelInitiatedBy = getT(TRANSLATION_KEYS.LABEL_INITIATED_BY, language ?? undefined, defaultLang);
  const labelUser = getT(TRANSLATION_KEYS.LABEL_USER, language ?? undefined, defaultLang);
  const labelViewingAs = getT(TRANSLATION_KEYS.LABEL_VIEWING_AS, language ?? undefined, defaultLang);
  const labelNoUserSelected = getT(TRANSLATION_KEYS.LABEL_NO_USER_SELECTED, language ?? undefined, defaultLang);
  const labelSwitchUserPerspective = getT(TRANSLATION_KEYS.LABEL_SWITCH_USER_PERSPECTIVE, language ?? undefined, defaultLang);
  const descriptionSwitchUser = getT(TRANSLATION_KEYS.DESCRIPTION_SWITCH_USER_PERSPECTIVE, language ?? undefined, defaultLang);
  const buttonReset = getT(TRANSLATION_KEYS.BUTTON_RESET, language ?? undefined, defaultLang);
  const buttonChange = getT(TRANSLATION_KEYS.BUTTON_CHANGE, language ?? undefined, defaultLang);
  const isRtl = isRTL(language ?? defaultLang);

  const handlePickerSelect = useCallback(
    async (selections: NormalizedOption[]) => {
      const nextSelection = selections[0] ?? null;
      onUserOptionChange(nextSelection);
      setIsPickerOpen(false);
    },
    [onUserOptionChange]
  );

  const tabs = useMemo(() => {
    const userLabelStr = selectedUser?.label != null ? (typeof selectedUser.label === 'string' ? selectedUser.label : resolveDisplayLabel(selectedUser.label, language ?? defaultLang, defaultLang)) : '';
    const assigneeLabel = selectedUser ? `${labelAssignedTo} ${userLabelStr || labelUser}` : `${labelAssignedTo} ${labelUser}`;
    const initiatorLabel = selectedUser ? `${labelInitiatedBy} ${userLabelStr || labelUser}` : `${labelInitiatedBy} ${labelUser}`;
    return [
      {
        id: 'assignedTo' as const,
        label: assigneeLabel,
        icon: <User2 className="h-3.5 w-3.5" />,
        count: counts.assignedTo,
        disabled: !selectedUser,
      },
      {
        id: 'initiatedBy' as const,
        label: initiatorLabel,
        icon: <Sparkles className="h-3.5 w-3.5" />,
        count: counts.initiatedBy,
        disabled: !selectedUser,
      },
    ] satisfies Array<{
      id: AssignmentView;
      label: string;
      icon: ReactNode;
      count: number;
      disabled: boolean;
    }>;
  }, [counts.assignedTo, counts.initiatedBy, selectedUser, labelAssignedTo, labelInitiatedBy, labelUser, language, defaultLang]);

  const userLabelDisplay = selectedUser?.label != null ? (typeof selectedUser.label === 'string' ? selectedUser.label : resolveDisplayLabel(selectedUser.label, language ?? defaultLang, defaultLang)) : labelNoUserSelected;

  const lang = language ?? defaultLang;

  const tabsContent = (
    <Tabs value={activeView} onValueChange={(value) => onViewChange(value as AssignmentView)}>
      <TabsList className="flex w-full flex-wrap gap-2 bg-gray-50 p-1 dark:bg-gray-800/70" dir={isRtl ? 'rtl' : undefined}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden"
          >
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs font-medium wrap-break-word">
              {tab.icon}
              <span className="min-w-0 wrap-break-word">{tab.label}</span>
            </span>
            <Badge variant="outline" className="shrink-0">{tab.count}</Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const userSelectorContent = (
    <div className="flex flex-wrap items-center gap-3 min-w-0">
      <Avatar className="h-9 w-9 shrink-0 border border-gray-200 dark:border-gray-700">
        {selectedUser?.avatarUrl ? (
          <AvatarImage src={selectedUser.avatarUrl} alt={userLabelDisplay} />
        ) : null}
        <AvatarFallback className="bg-linear-to-br from-violet-600 to-purple-600 text-white text-xs">
          {getInitials(userLabelDisplay || '?', lang)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
          {labelViewingAs} {userLabelDisplay}
        </p>
        <div className="flex items-center gap-0 mt-1">
          <Button
            variant="outline"
            size="sm"
            className={`h-6 px-2 text-[0.7rem] font-medium ${!isUsingDefaultUser ? 'rounded-e-none border-e-0 rounded-s-md' : 'rounded-md'}`}
            onClick={() => setIsPickerOpen(true)}
            title={labelSwitchUserPerspective}
          >
            {buttonChange}
          </Button>
          {!isUsingDefaultUser && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 rounded-s-none rounded-e-md p-0 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              onClick={onResetUser}
              aria-label={buttonReset}
              title={buttonReset}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm dark:border-gray-800/80 dark:bg-gray-900/40" dir={isRtl ? 'rtl' : undefined}>
      {/* Desktop (md+): user selector in front, tabs same row. Mobile: tabs first, user selector under. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="order-2 md:order-1 md:shrink-0">{userSelectorContent}</div>
        <div className="order-1 md:order-2 md:min-w-0 md:flex-1">{tabsContent}</div>
      </div>

      <PopupPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        schemaId="users"
        allowMultiselect={false}
        selectedIds={selectedUser?.id ? [selectedUser.id] : []}
        onSelect={async (options, _rawItems) => {
          await handlePickerSelect(options);
        }}
        showAddButton={false}
        title={labelSwitchUserPerspective}
        description={descriptionSwitchUser}
        canViewList={true}
        viewListUrl="/page/users"
      />
    </div>
  );
};
