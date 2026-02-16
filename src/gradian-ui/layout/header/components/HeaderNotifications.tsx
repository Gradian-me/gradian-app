// Header Notifications Component

import React, { useState } from 'react';
import { HeaderNotificationsProps } from '../types';
import { cn } from '../../../shared/utils';
import { Button } from '@/components/ui/button';

export const HeaderNotifications: React.FC<HeaderNotificationsProps> = ({
  count = 0,
  onClick,
  items = [],
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
    onClick?.();
  };

  const handleItemClick = (itemId: string) => {
    // Handle individual notification click
    console.log('Notification clicked:', itemId);
  };

  const notificationsClasses = cn(
    'relative',
    className
  );

  const buttonClasses = cn(
    'relative'
  );

  const badgeClasses = cn(
    'absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full',
    'flex items-center justify-center font-medium',
    count === 0 && 'hidden'
  );

  const dropdownClasses = cn(
    'absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200',
    'opacity-0 invisible transform scale-95 transition-all duration-200',
    isOpen && 'opacity-100 visible transform scale-100'
  );

  return (
    <div className={notificationsClasses} {...props}>
      <Button
        type="button"
        variant="square"
        size="sm"
        onClick={handleClick}
        className={buttonClasses}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
      >
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className={badgeClasses}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>

      {/* Notifications Dropdown */}
      <div className={dropdownClasses}>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {items.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                    !item.read && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className="shrink-0">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No notifications</p>
            </div>
          )}
        </div>
        
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
              View all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

HeaderNotifications.displayName = 'HeaderNotifications';
