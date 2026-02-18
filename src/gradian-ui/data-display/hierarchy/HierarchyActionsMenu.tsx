'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Plus, Pencil, Trash2, ArrowRightLeft, MessageCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/gradian-ui/shared/utils';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

/** Action keys; order in arrays controls display order. */
export type ActionKey = 'view' | 'addChild' | 'changeParent' | 'discussions' | 'edit' | 'delete';

const DEFAULT_MENU_ORDER: ActionKey[] = ['view', 'addChild', 'changeParent', 'discussions', 'edit', 'delete'];

/**
 * Shared row/card actions menu (ellipsis). Use for table rows, cards, and hierarchy nodes.
 * Same actions everywhere: View, Discussions, Edit, Delete. In hierarchy context, also
 * supports Add child and Change parent when provided.
 */
export interface HierarchyActionsMenuProps {
  onView?: () => void;
  /** When set, View is rendered as a link so Ctrl+click / middle-click open in new tab. */
  viewHref?: string;
  onAddChild?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onChangeParent?: () => void;
  onDiscussions?: () => void;
  hasParent?: boolean;
  /** When set, shows a badge on the trigger with the count (e.g. discussion count). */
  discussionCount?: number;
  /** When true, stops click/mouseDown propagation (e.g. to avoid row/card selection). @default true */
  stopPropagation?: boolean;
  /**
   * Actions to show as separate icon buttons (in this order). The rest stay in the ellipsis menu.
   * E.g. outOfEllipsis={['view', 'edit']} shows View and Edit as buttons, others in menu.
   */
  outOfEllipsis?: ActionKey[];
  /**
   * Order of items inside the ellipsis menu. Only used for actions that are not in outOfEllipsis.
   * Default: view, addChild, changeParent, discussions, edit, delete.
   */
  menuOrder?: ActionKey[];
  /**
   * When set (non-empty), only show actions whose key is in this array (e.g. from schema.permissions).
   * Omit or empty = show all actions the handler allows.
   */
  permissions?: string[];
  /** When true, use larger button size (squircleSizeOverrideBig). @default false */
  showBig?: boolean;
}

const actionMeta: Record<
  ActionKey,
  { handler: (p: HierarchyActionsMenuProps) => (() => void) | undefined; Icon: React.ComponentType<{ className?: string }>; isDestructive?: boolean }
> = {
  view: { handler: (p) => p.onView ?? (p.viewHref ? () => {} : undefined), Icon: Eye },
  addChild: { handler: (p) => p.onAddChild, Icon: Plus },
  changeParent: { handler: (p) => p.onChangeParent && p.hasParent ? p.onChangeParent : undefined, Icon: ArrowRightLeft },
  discussions: { handler: (p) => p.onDiscussions, Icon: MessageCircle },
  edit: { handler: (p) => p.onEdit, Icon: Pencil },
  delete: { handler: (p) => p.onDelete, Icon: Trash2, isDestructive: true },
};

export const HierarchyActionsMenu: React.FC<HierarchyActionsMenuProps> = ({
  onView,
  viewHref,
  onAddChild,
  onEdit,
  onDelete,
  onChangeParent,
  onDiscussions,
  hasParent = false,
  discussionCount,
  stopPropagation = true,
  outOfEllipsis,
  menuOrder = DEFAULT_MENU_ORDER,
  permissions,
  showBig = false,
}) => {
  const router = useRouter();
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const props = { onView, viewHref, onAddChild, onEdit, onDelete, onChangeParent, onDiscussions, hasParent };

  const handleViewLinkClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (stopPropagation) {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation?.();
      }
      const openInNewTab = e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0;
      if (openInNewTab && viewHref) {
        e.preventDefault();
        window.open(viewHref, '_blank', 'noopener,noreferrer');
        return;
      }
      if (!openInNewTab) {
        e.preventDefault();
        if (viewHref) router.push(viewHref);
      }
    },
    [viewHref, router, stopPropagation]
  );
  const labels: Record<ActionKey, string> = {
    view: getT(TRANSLATION_KEYS.BUTTON_VIEW, language, defaultLang),
    addChild: getT(TRANSLATION_KEYS.ACTION_ADD_CHILD, language, defaultLang),
    changeParent: getT(TRANSLATION_KEYS.ACTION_CHANGE_PARENT, language, defaultLang),
    discussions: getT(TRANSLATION_KEYS.DISCUSSION_TITLE_DIALOG, language, defaultLang),
    edit: getT(TRANSLATION_KEYS.BUTTON_EDIT, language, defaultLang),
    delete: getT(TRANSLATION_KEYS.BUTTON_DELETE, language, defaultLang),
  };

  const allowedSet = React.useMemo(
    () => (permissions != null && permissions.length > 0 ? new Set(permissions) : null),
    [permissions]
  );
  const isAllowed = (key: ActionKey) => allowedSet == null || allowedSet.has(key);

  const outSet = React.useMemo(() => new Set(outOfEllipsis ?? []), [outOfEllipsis]);
  const outKeys = (outOfEllipsis ?? []).filter(
    (key) => isAllowed(key) && actionMeta[key].handler(props)
  );
  const inKeys = menuOrder.filter((key) => {
    if (!isAllowed(key)) return false;
    const h = actionMeta[key].handler(props);
    return h != null && !outSet.has(key);
  });

  const hasAnyAction = outKeys.length > 0 || inKeys.length > 0;
  if (!hasAnyAction) {
    return null;
  }

  const count = discussionCount != null && discussionCount > 0 ? Math.min(discussionCount, 99) : 0;

  const menuContentClasses = cn(
    'z-50 overflow-hidden rounded-xl border p-1 shadow-lg',
    'w-44',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
    "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-100 dark:text-gray-900"
  );

  const itemClasses = cn(
    'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors',
    'hover:bg-violet-50 focus:bg-violet-50 text-gray-800 dark:hover:bg-violet-500/10 dark:focus:bg-violet-500/10 dark:text-gray-200'
  );

  const triggerProps = stopPropagation
    ? {
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
      }
    : {};

  const squircleSizeOverride = '!h-8 !min-h-8 !w-8 !min-w-8';
  const squircleSizeOverrideBig = '!h-10 !min-h-10 !w-10 !min-w-10';
  const sizeClass = showBig ? squircleSizeOverrideBig : squircleSizeOverride;
  const baseButtonClass = sizeClass;
  const destructiveButtonClass = cn(sizeClass, 'hover:squircle-red-50 hover:squircle-border-red-200 dark:hover:squircle-red-500/15 dark:hover:squircle-border-red-500/40 hover:!text-red-600 dark:hover:!text-red-400');

  const wrapProps = stopPropagation
    ? { onClick: (e: React.MouseEvent) => e.stopPropagation(), onMouseDown: (e: React.MouseEvent) => e.stopPropagation() }
    : {};

  const outButtons = outKeys.map((key) => {
    const meta = actionMeta[key];
    const handler = meta.handler(props);
    if (!handler) return null;
    const Icon = meta.Icon;
    const buttonClass = cn('relative', meta.isDestructive ? destructiveButtonClass : baseButtonClass);
    if (key === 'view' && viewHref) {
      return (
        <Button key={key} variant="square" size="icon" className={buttonClass} asChild>
          <a
            href={viewHref}
            aria-label={labels[key]}
            onClick={handleViewLinkClick}
            onMouseDown={stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
          >
            <Icon className="h-4 w-4" />
          </a>
        </Button>
      );
    }
    return (
      <Button
        key={key}
        type="button"
        variant="square"
        size="icon"
        className={buttonClass}
        onClick={handler}
        aria-label={labels[key]}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  });

  const ellipsisMenu =
    inKeys.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="square"
            size="icon"
            className={cn('relative', baseButtonClass)}
            {...triggerProps}
          >
            <MoreVertical className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1.5 flex items-center justify-center tabular-nums text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 rounded-full">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={menuContentClasses}>
          {inKeys.map((key) => {
            const meta = actionMeta[key];
            const handler = meta.handler(props);
            if (!handler) return null;
            const Icon = meta.Icon;
            const itemClassName = cn(
              itemClasses,
              meta.isDestructive && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10'
            );
            if (key === 'view' && viewHref) {
              return (
                <DropdownMenuItem key={key} asChild>
                  <a
                    href={viewHref}
                    className={itemClassName}
                    onClick={handleViewLinkClick}
                    onMouseDown={stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
                  >
                    <Icon className="me-3 h-4 w-4" />
                    <span>{labels[key]}</span>
                  </a>
                </DropdownMenuItem>
              );
            }
            return (
              <DropdownMenuItem
                key={key}
                onClick={handler}
                className={itemClassName}
              >
                <Icon className="me-3 h-4 w-4" />
                <span>{labels[key]}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  if (outButtons.length > 0 && ellipsisMenu) {
    return (
      <div className="flex items-center gap-1" {...wrapProps}>
        {outButtons}
        {ellipsisMenu}
      </div>
    );
  }
  if (outButtons.length > 0) {
    return <div className="flex items-center gap-1" {...wrapProps}>{outButtons}</div>;
  }
  return ellipsisMenu;
};

HierarchyActionsMenu.displayName = 'HierarchyActionsMenu';

/** Alias for use in table/card views; same component as HierarchyActionsMenu. */
export const ItemActionsMenu = HierarchyActionsMenu;

