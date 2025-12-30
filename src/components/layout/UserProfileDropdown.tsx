'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/gradian-ui/form-builder/form-elements';
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';

interface UserProfileDropdownProps {
  userName?: string;
  userAvatar?: string;
  userInitials?: string;
  userId?: string;
  variant?: 'light' | 'dark';
}

const DROPDOWN_Z_INDEX = 2147483000;

export function UserProfileDropdown({ 
  userName = "Mahyar Abidi", 
  userAvatar = "/avatars/mahyar.jpg", 
  userInitials = "MA",
  userId = "mahyar", // Default user ID
  variant = "light"
}: UserProfileDropdownProps) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const isDarkVariant = variant === 'dark';
  const buttonClasses = cn(
    "flex items-center space-x-2 h-10 rounded-lg border px-3 transition-colors duration-200",
    "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
    "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleProfileClick = () => {
    router.push(`/profiles/${userId}`);
  };

  const handleSettingsClick = () => {
    router.push('/settings');
  };

  const handleLogout = async () => {
    // Use centralized logout flow
    const { performLogout } = await import('@/gradian-ui/shared/utils/logout-flow');
    await performLogout('User requested logout', false);
  };

  if (!isMounted) {
    return (
      <Button 
        type="button"
        variant="ghost" 
        className={buttonClasses}
        aria-label="User profile menu"
        disabled
      >
        <Avatar
          src={userAvatar}
          alt={userName}
          fallback={userInitials}
          size="md"
          variant="primary"
          className={cn(
            "border",
            isDarkVariant ? "border-gray-700" : "border-gray-100",
            "dark:border-gray-700"
          )}
        />
        <span className="text-sm font-medium truncate">{userName}</span>
        <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-300" />
      </Button>
    );
  }

  return (
    <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <Button 
            type="button"
            variant="ghost" 
            className={buttonClasses}
            aria-label="User profile menu"
          >
          <Avatar
            src={userAvatar}
            alt={userName}
            fallback={userInitials}
            size="md"
            variant="primary"
            className={cn(
              "border",
              isDarkVariant ? "border-gray-700" : "border-gray-100",
              "dark:border-gray-700"
            )}
          />
          <span className="text-sm font-medium truncate">{userName}</span>
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-300" />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={cn(
            "min-w-32 overflow-hidden rounded-xl border p-1 shadow-lg backdrop-blur-sm",
            isDarkVariant
              ? "border-gray-700 bg-gray-900/95 text-gray-100"
              : "border-gray-200 bg-white/95 text-gray-900",
            "dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-100",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          )}
          align="end"
          sideOffset={4}
          style={{ zIndex: DROPDOWN_Z_INDEX }}
        >
          <DropdownMenuPrimitive.Label className="px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            My Account
          </DropdownMenuPrimitive.Label>
          
          <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700" />
          
          <DropdownMenuPrimitive.Item
            className={cn(
              "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none",
              "hover:bg-violet-50 focus:bg-violet-50",
              "dark:hover:bg-violet-500/10 dark:focus:bg-violet-500/10"
            )}
            onSelect={handleProfileClick}
          >
            Profile
          </DropdownMenuPrimitive.Item>
          
          <DropdownMenuPrimitive.Item
            className={cn(
              "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none",
              "hover:bg-violet-50 focus:bg-violet-50",
              "dark:hover:bg-violet-500/10 dark:focus:bg-violet-500/10"
            )}
            onSelect={handleSettingsClick}
          >
            Settings
          </DropdownMenuPrimitive.Item>
          
          <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-gray-200 dark:bg-gray-700" />
          
          <DropdownMenuPrimitive.Item
            className={cn(
              "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none text-red-600",
              "hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
            )}
            onSelect={handleLogout}
          >
            Logout
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
