// Header User Component

import React, { useState } from 'react';
import { HeaderUserProps } from '../types';
import { cn } from '../../../shared/utils';

export const HeaderUser: React.FC<HeaderUserProps> = ({
  user,
  onAction,
  showAvatar = true,
  showName = true,
  showRole = false,
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleAction = (action: string) => {
    setIsOpen(false);
    onAction?.(action);
  };

  const userClasses = cn(
    'relative',
    className
  );

  const buttonClasses = cn(
    'flex items-center space-x-3 p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100',
    'focus:outline-none focus:ring-2 focus:ring-blue-500'
  );

  const dropdownClasses = cn(
    'absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200',
    'opacity-0 invisible transform scale-95 transition-all duration-200',
    isOpen && 'opacity-100 visible transform scale-100'
  );

  const avatarClasses = cn(
    'h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700',
    user.avatar && 'bg-cover bg-center'
  );

  return (
    <div className={userClasses} {...props}>
      <button
        onClick={handleClick}
        className={buttonClasses}
        aria-label="User menu"
      >
        {showAvatar && (
          <div
            className={avatarClasses}
            style={user.avatar ? { backgroundImage: `url(${user.avatar})` } : {}}
          >
            {!user.avatar && user.name.charAt(0).toUpperCase()}
          </div>
        )}
        
        {showName && (
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">
              {user.name}
            </span>
            {showRole && (
              <span className="text-xs text-gray-500">
                {user.role}
              </span>
            )}
          </div>
        )}
        
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* User Dropdown */}
      <div className={dropdownClasses}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700"
              style={user.avatar ? { backgroundImage: `url(${user.avatar})` } : {}}
            >
              {!user.avatar && user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
          </div>
        </div>
        
        <div className="py-1">
          <button
            onClick={() => handleAction('profile')}
            className="block w-full text-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Profile
          </button>
          <button
            onClick={() => handleAction('settings')}
            className="block w-full text-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </button>
          <button
            onClick={() => handleAction('help')}
            className="block w-full text-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Help & Support
          </button>
        </div>
        
        <div className="py-1 border-t border-gray-200">
          <button
            onClick={() => handleAction('logout')}
            className="block w-full text-start px-4 py-2 text-xs text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

HeaderUser.displayName = 'HeaderUser';
