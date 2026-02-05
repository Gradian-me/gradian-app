"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { useUserStore } from '@/stores/user.store';
import { User, LocalizedField } from '@/types';
import { AssignmentCounts, AssignmentUser, AssignmentView } from '../types';

/** Counts from GET /api/data/[schema-id]/count (when provided, badges use these) */
export interface AssignmentCountsFromApi {
  assignedToCount: number;
  initiatedByCount: number;
}

interface UseAssignmentSwitcherArgs {
  isEnabled: boolean;
  /** Total items from API for the current tab (fallback when countsFromApi not set) */
  totalItems?: number;
  /** Counts from /api/data/[schema-id]/count – when set, both badges use these */
  countsFromApi?: AssignmentCountsFromApi | null;
  activeView: AssignmentView;
  setActiveView: (view: AssignmentView) => void;
}

interface UseAssignmentSwitcherResult {
  isEnabled: boolean;
  activeView: AssignmentView;
  setActiveView: (view: AssignmentView) => void;
  counts: AssignmentCounts;
  selectedUser: AssignmentUser | null;
  isUsingDefaultUser: boolean;
  handleUserOptionChange: (option: NormalizedOption | null) => void;
  resetToCurrentUser: () => void;
}

const resolveLocalizedField = (field?: LocalizedField): string | undefined => {
  if (!field) {
    return undefined;
  }
  if (typeof field === 'string') {
    return field;
  }
  const prioritizedKeys = ['en', 'fa', 'ar'];
  for (const key of prioritizedKeys) {
    if (field[key]) {
      return field[key];
    }
  }
  const firstValue = Object.values(field).find((value) => Boolean(value));
  return typeof firstValue === 'string' ? firstValue : undefined;
};

const buildAssignmentUserFromUser = (user: User | null): AssignmentUser | null => {
  if (!user?.id) {
    return null;
  }
  const label = resolveLocalizedField(user.name) ?? user.username ?? user.email ?? user.id;
  const subtitle = user.email ?? resolveLocalizedField(user.lastname);
  return {
    id: String(user.id),
    label,
    subtitle,
    avatarUrl: user.avatar,
  };
};

const buildAssignmentUserFromOption = (option: NormalizedOption | null): AssignmentUser | null => {
  if (!option?.id) {
    return null;
  }
  const metadata = option.metadata ?? {};
  return {
    id: option.id,
    label: option.label ?? option.value ?? option.id,
    subtitle: metadata.email ?? metadata.username ?? option.value,
    avatarUrl: metadata.avatar ?? metadata.avatarUrl ?? option.icon,
  };
};

export const useAssignmentSwitcher = ({
  isEnabled,
  totalItems = 0,
  countsFromApi,
  activeView,
  setActiveView,
}: UseAssignmentSwitcherArgs): UseAssignmentSwitcherResult => {
  const currentUser = useUserStore((state) => state.user);
  const defaultAssignmentUser = useMemo(() => buildAssignmentUserFromUser(currentUser), [currentUser]);

  const [selectedUser, setSelectedUser] = useState<AssignmentUser | null>(defaultAssignmentUser);
  const [hasUserOverride, setHasUserOverride] = useState(false);

  useEffect(() => {
    if (!hasUserOverride) {
      setSelectedUser(defaultAssignmentUser);
    }
  }, [defaultAssignmentUser, hasUserOverride]);

  const handleUserOptionChange = useCallback(
    (option: NormalizedOption | null) => {
      const mappedUser = buildAssignmentUserFromOption(option);
      setSelectedUser(mappedUser);
      setHasUserOverride(Boolean(mappedUser && mappedUser.id !== defaultAssignmentUser?.id));
    },
    [defaultAssignmentUser?.id]
  );

  const resetToCurrentUser = useCallback(() => {
    setHasUserOverride(false);
    setSelectedUser(defaultAssignmentUser);
  }, [defaultAssignmentUser]);

  const counts = useMemo<AssignmentCounts>(() => {
    if (countsFromApi != null) {
      return {
        assignedTo: countsFromApi.assignedToCount,
        initiatedBy: countsFromApi.initiatedByCount,
      };
    }
    if (activeView === 'assignedTo') {
      return { assignedTo: totalItems, initiatedBy: 0 };
    }
    return { assignedTo: 0, initiatedBy: totalItems };
  }, [countsFromApi, activeView, totalItems]);

  return {
    isEnabled,
    activeView,
    setActiveView,
    counts,
    selectedUser,
    isUsingDefaultUser: !hasUserOverride,
    handleUserOptionChange,
    resetToCurrentUser,
  };
};
