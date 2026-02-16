// Header Actions Component

import React, { useState } from 'react';
import { HeaderActionsProps } from '../types';
import { HeaderSearch } from './HeaderSearch';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderUser } from './HeaderUser';
import { ModeToggle } from '../../mode-toggle';
import { cn } from '../../../shared/utils';

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  actions,
  user,
  onAction,
  className,
  ...props
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    actions?.search?.onSearch?.(query);
  };

  const handleNotificationClick = () => {
    actions?.notifications?.onClick?.();
  };

  const handleUserAction = (action: string) => {
    onAction?.(action);
  };

  const handleThemeToggle = () => {
    const currentTheme = actions?.theme?.current || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    actions?.theme?.onToggle?.(newTheme);
  };

  const actionsClasses = cn(
    'flex items-center space-x-4',
    className
  );

  return (
    <div className={actionsClasses} {...props}>
      {/* Search */}
      {actions?.search?.enabled && (
        <HeaderSearch
          placeholder={actions.search.placeholder}
          onSearch={handleSearch}
          value={searchQuery}
        />
      )}

      {/* Theme Toggle */}
      {actions?.theme?.enabled && <ModeToggle />}

      {/* User Menu */}
      {actions?.user?.enabled && user && (
        <HeaderUser
          user={user}
          onAction={handleUserAction}
          showAvatar={actions.user.showAvatar}
          showName={actions.user.showName}
          showRole={actions.user.showRole}
        />
      )}

      {/* Notifications (after user selector) */}
      {actions?.notifications?.enabled && (
        <HeaderNotifications
          count={actions.notifications.count}
          onClick={handleNotificationClick}
        />
      )}
    </div>
  );
};

HeaderActions.displayName = 'HeaderActions';
