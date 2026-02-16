"use client";

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { User2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PopupPicker } from '@/gradian-ui/form-builder/form-elements/components/PopupPicker';
import { NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { AssignmentCounts, AssignmentUser, AssignmentView } from '../types';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage, isRTL } from '@/gradian-ui/shared/utils/translation-utils';
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

const buildInitials = (label?: string) => {
  const safeLabel = label != null && typeof label === 'string' ? label : '';
  if (!safeLabel) {
    return '?';
  }
  const parts = safeLabel.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

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
    const assigneeLabel = selectedUser ? `${labelAssignedTo} ${selectedUser.label}` : `${labelAssignedTo} ${labelUser}`;
    const initiatorLabel = selectedUser ? `${labelInitiatedBy} ${selectedUser.label}` : `${labelInitiatedBy} ${labelUser}`;
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
  }, [counts.assignedTo, counts.initiatedBy, selectedUser, labelAssignedTo, labelInitiatedBy, labelUser]);

  const userSubtitle = selectedUser?.subtitle ?? labelSwitchUserPerspective;

  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm dark:border-gray-800/80 dark:bg-gray-900/40" dir={isRtl ? 'rtl' : undefined}>
      <div className="flex flex-col gap-3">
        {/* Header: avatar + "Viewing as" + compact actions inline */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 border border-gray-200 dark:border-gray-700">
              {selectedUser?.avatarUrl ? (
                <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.label} />
              ) : null}
              <AvatarFallback className="bg-linear-to-br from-violet-600 to-purple-600 text-white text-xs">
                {buildInitials(selectedUser?.label)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {labelViewingAs} {selectedUser?.label ?? labelNoUserSelected}
              </p>
              <p className="truncate text-[0.7rem] text-gray-500 dark:text-gray-400">
                {userSubtitle}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isUsingDefaultUser && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[0.7rem] font-medium text-violet-600 dark:text-violet-300"
                onClick={onResetUser}
              >
                {buttonReset}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-[0.7rem] font-medium"
              onClick={() => setIsPickerOpen(true)}
            >
              {buttonChange}
            </Button>
          </div>
        </div>

        {/* Tabs below header, full width, responsive */}
        <Tabs value={activeView} onValueChange={(value) => onViewChange(value as AssignmentView)}>
          <TabsList className="flex w-full flex-wrap gap-2 bg-gray-50 p-1 dark:bg-gray-800/70" dir={isRtl ? 'rtl' : undefined}>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={tab.disabled}
                className="flex flex-1 min-w-[140px] items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  {tab.icon}
                  {tab.label}
                </span>
                <Badge variant="outline">{tab.count}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
