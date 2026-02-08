// Header Mobile Menu Component

import React, { useEffect } from 'react';
import { HeaderMobileMenuProps } from '../types';
import { cn } from '../../../shared/utils';

export const HeaderMobileMenu: React.FC<HeaderMobileMenuProps> = ({
  isOpen,
  onClose,
  navigation,
  user,
  onItemClick,
  onUserAction,
  className,
  ...props
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleItemClick = (item: any) => {
    onItemClick?.(item);
    onClose();
  };

  const handleUserAction = (action: string) => {
    onUserAction?.(action);
    onClose();
  };

  const menuClasses = cn(
    'fixed inset-0 z-50 lg:hidden',
    isOpen ? 'block' : 'hidden'
  );

  const overlayClasses = cn(
    'fixed inset-0 bg-black bg-opacity-50 transition-opacity',
    isOpen ? 'opacity-100' : 'opacity-0'
  );

  const panelClasses = cn(
    'fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform',
    isOpen ? 'translate-x-0' : 'translate-x-full'
  );

  return (
    <div className={menuClasses} {...props}>
      {/* Overlay */}
      <div
        className={overlayClasses}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Panel */}
      <div className={panelClasses}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-4 space-y-2">
              {navigation.map((item) => (
                <div key={item.id}>
                  {item.href ? (
                    <a
                      href={item.href}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        'block px-3 py-2 rounded-md text-base font-medium transition-colors',
                        'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
                        item.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon && <span>{item.icon}</span>}
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ms-auto px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </a>
                  ) : (
                    <button
                      onClick={() => !item.disabled && handleItemClick(item)}
                      disabled={item.disabled}
                      className={cn(
                        'block w-full text-start px-3 py-2 rounded-md text-base font-medium transition-colors',
                        'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
                        item.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon && <span>{item.icon}</span>}
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ms-auto px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  )}

                  {/* Children items */}
                  {item.children && item.children.length > 0 && (
                    <div className="ms-6 mt-2 space-y-1">
                      {item.children.map((child) => (
                        <a
                          key={child.id}
                          href={child.href || '#'}
                          onClick={() => handleItemClick(child)}
                          className={cn(
                            'block px-3 py-2 rounded-md text-sm transition-colors',
                            'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                            child.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            {child.icon && <span>{child.icon}</span>}
                            <span>{child.label}</span>
                            {child.badge && (
                              <span className="ms-auto px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                {child.badge}
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* User Section */}
          {user && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700"
                  style={user.avatar ? { backgroundImage: `url(${user.avatar})` } : {}}
                >
                  {!user.avatar && user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <button
                  onClick={() => handleUserAction('profile')}
                  className="block w-full text-start px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Profile
                </button>
                <button
                  onClick={() => handleUserAction('settings')}
                  className="block w-full text-start px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Settings
                </button>
                <button
                  onClick={() => handleUserAction('logout')}
                  className="block w-full text-start px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

HeaderMobileMenu.displayName = 'HeaderMobileMenu';
