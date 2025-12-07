// Header Navigation Component

import React, { useState } from 'react';
import Link from 'next/link';
import { HeaderNavigationProps, MenuItem } from '../types';
import { cn } from '../../../shared/utils';

export const HeaderNavigation: React.FC<HeaderNavigationProps> = ({
  items,
  variant = 'horizontal',
  onItemClick,
  className,
  ...props
}) => {
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const handleItemClick = (item: MenuItem) => {
    setActiveItem(item.id);
    onItemClick?.(item);
  };

  const navClasses = cn(
    'flex',
    variant === 'horizontal' && 'flex-row space-x-8',
    variant === 'vertical' && 'flex-col space-y-2',
    variant === 'dropdown' && 'flex-row space-x-8',
    className
  );

  const itemClasses = (item: MenuItem) => cn(
    'relative group',
    variant === 'horizontal' && 'flex items-center',
    variant === 'vertical' && 'block',
    item.disabled && 'opacity-50 cursor-not-allowed'
  );

  const linkClasses = (item: MenuItem) => cn(
    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
    'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
    activeItem === item.id && 'text-blue-600 bg-blue-50',
    item.disabled && 'cursor-not-allowed'
  );

  const renderItem = (item: MenuItem) => (
    <div key={item.id} className={itemClasses(item)}>
      {item.href ? (
        <Link
          href={item.href}
          className={linkClasses(item)}
          onClick={() => !item.disabled && handleItemClick(item)}
        >
          <div className="flex items-center space-x-2">
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && (
              <span className="ms-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
        </Link>
      ) : (
        <button
          className={linkClasses(item)}
          onClick={() => !item.disabled && handleItemClick(item)}
          disabled={item.disabled}
        >
          <div className="flex items-center space-x-2">
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge && (
              <span className="ms-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Dropdown for children items */}
      {item.children && item.children.length > 0 && variant === 'dropdown' && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="py-1">
            {item.children.map((child) => (
              <Link
                key={child.id}
                href={child.href || '#'}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => !child.disabled && handleItemClick(child)}
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
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <nav className={navClasses} {...props}>
      {items.map(renderItem)}
    </nav>
  );
};

HeaderNavigation.displayName = 'HeaderNavigation';
