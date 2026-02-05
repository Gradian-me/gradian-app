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
  if (!label) {
    return '?';
  }
  const parts = label.trim().split(' ');
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

  const handlePickerSelect = useCallback(
    async (selections: NormalizedOption[]) => {
      const nextSelection = selections[0] ?? null;
      onUserOptionChange(nextSelection);
      setIsPickerOpen(false);
    },
    [onUserOptionChange]
  );

  const tabs = useMemo(() => {
    const assigneeLabel = selectedUser ? `Assigned to ${selectedUser.label}` : 'Assigned to user';
    const initiatorLabel = selectedUser ? `Initiated by ${selectedUser.label}` : 'Initiated by user';
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
  }, [counts.assignedTo, counts.initiatedBy, selectedUser]);

  const userSubtitle = selectedUser?.subtitle ?? 'Switch user perspective';

  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-sm dark:border-gray-800/80 dark:bg-gray-900/40">
      <div className="flex flex-col gap-3">
        {/* Header: avatar + \"Viewing as\" + compact actions inline */}
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
                Viewing as {selectedUser?.label ?? 'No user selected'}
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
                Reset
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-[0.7rem] font-medium"
              onClick={() => setIsPickerOpen(true)}
            >
              Change
            </Button>
          </div>
        </div>

        {/* Tabs below header, full width, responsive */}
        <Tabs value={activeView} onValueChange={(value) => onViewChange(value as AssignmentView)}>
          <TabsList className="flex w-full flex-wrap gap-2 bg-gray-50 p-1 dark:bg-gray-800/70">
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
        title="Switch user perspective"
        description="Select a teammate to inspect tasks as if you were them."
        canViewList={true}
        viewListUrl="/page/users"
      />
    </div>
  );
};
