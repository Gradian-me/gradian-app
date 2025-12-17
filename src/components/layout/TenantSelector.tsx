'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/gradian-ui/form-builder/form-elements';
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { apiRequest } from '@/gradian-ui/shared/utils/api';
import { useTenantStore } from '@/stores/tenant.store';
import { useTheme } from 'next-themes';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

interface Tenant {
  id: string | number;
  name: string;
  title?: string;
  domain?: string;
  logo?: string;
  [key: string]: any;
}

interface TenantSelectorProps {
  className?: string;
  placeholder?: string;
  variant?: 'light' | 'dark' | 'auto';
  fullWidth?: boolean;
  showLogo?: 'none' | 'sidebar-avatar' | 'full';
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({
  className,
  placeholder = 'Select tenant',
  variant = 'auto',
  fullWidth = false,
  showLogo = 'full',
}) => {
  const router = useRouter();
  const { selectedTenant, setSelectedTenant } = useTenantStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { resolvedTheme } = useTheme();
  const computedVariant =
    variant === 'auto'
      ? isMounted && resolvedTheme === 'dark'
        ? 'dark'
        : 'light'
      : variant;
  const isDarkVariant = computedVariant === 'dark';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const fetchTenants = async () => {
      setLoading(true);
      try {
        const response = await apiRequest<Tenant[] | { data?: Tenant[]; items?: Tenant[] }>(
          '/api/data/tenants',
          { method: 'GET', callerName: 'TenantSelector' }
        );

        if (response.success && response.data) {
          const data = Array.isArray(response.data)
            ? response.data
            : ((response.data as any)?.data || (response.data as any)?.items || []);
          setTenants(data);
        }
      } catch (err) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading tenants: ${err instanceof Error ? err.message : String(err)}`);
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchTenants();
  }, [isMounted]);

  const handleTenantSelect = async (tenant: Tenant | null) => {
    if (!tenant) {
      // Clear tenant selection - will use domain from window.location.hostname
      setSelectedTenant(null);
    } else {
      // Ensure domain is included in the tenant object
      const fullTenant: Tenant = {
        ...tenant,
        domain: tenant.domain || '',
      };
      setSelectedTenant(fullTenant);
    }
    
    // Wait to ensure Zustand persist middleware saves to localStorage
    // Zustand persist saves synchronously, but give it a moment to ensure it's written
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Manually ensure the state is saved to localStorage
    if (typeof window !== 'undefined') {
      const store = useTenantStore.getState();
      try {
        const stateToSave = {
          state: { selectedTenant: store.selectedTenant },
          version: 0
        };
        localStorage.setItem('tenant-store', JSON.stringify(stateToSave));
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to manually save tenant to localStorage: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Refresh all pages when tenant changes
    router.refresh();
    // Also reload the page to ensure all components get fresh data
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const getTenantName = (tenant?: Tenant | null) => {
    if (!tenant) return 'None (Use Domain)';
    return (tenant.title || tenant.name || String(tenant.id)).trim() || 'Untitled tenant';
  };

  const tenantInitials = (() => {
    const name = getTenantName(selectedTenant);
    if (!name || name === 'None (Use Domain)') {
      return 'TN';
    }
    return name
      .split(' ')
      .filter(Boolean)
      .map((word: string) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'TN';
  })();

  const triggerHeightClasses = "h-10";
  const triggerBaseClasses = cn(
    "flex items-center space-x-2 rounded-xl transition-colors outline-none ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    triggerHeightClasses,
    fullWidth ? "w-full justify-between" : "",
    isDarkVariant
      ? "border border-violet-300/60 bg-gray-900 text-violet-200 hover:bg-gray-800 focus-visible:ring-violet-500 focus-visible:ring-offset-gray-900"
      : "border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 focus-visible:ring-violet-500 focus-visible:ring-offset-white"
  );
  const avatarBorderClass = isDarkVariant ? "border-gray-700" : "border-gray-100";
  const chevronColorClass = isDarkVariant ? "text-gray-300" : "text-gray-500";
  const menuContentClasses = cn(
    "z-50 overflow-hidden rounded-xl border p-1 shadow-lg",
    fullWidth ? "w-full" : "min-w-44",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    isDarkVariant
      ? "bg-gray-900 border-gray-700 text-gray-100"
      : "bg-white border-gray-200 text-gray-900"
  );
  const labelClasses = cn(
    "px-2 py-1.5 text-sm font-semibold",
    isDarkVariant ? "text-gray-100" : "text-gray-900"
  );
  const separatorClasses = cn(
    "-mx-1 my-1 h-px",
    isDarkVariant ? "bg-gray-700" : "bg-gray-200"
  );
  const menuItemBaseClasses = "relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors";

  if (!isMounted || loading) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className={cn(triggerBaseClasses, className)}
        aria-label="Select tenant"
        disabled
      >
        <Avatar 
          fallback={tenantInitials}
          size="sm"
          variant="primary"
          className={cn("border", avatarBorderClass)}
        />
        <span
          className={cn(
            "text-sm font-medium",
            isDarkVariant ? "text-gray-300" : "text-gray-700",
            fullWidth ? "flex-1 text-left truncate" : ""
          )}
        >
          {getTenantName(selectedTenant) || 'Loading...'}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            chevronColorClass,
            isMenuOpen && "rotate-180"
          )}
        />
      </Button>
    );
  }

  if (tenants.length === 0) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className={cn(triggerBaseClasses, className)}
        aria-label="Select tenant"
        disabled
      >
        <Avatar 
          fallback="TN"
          size="sm"
          variant="primary"
          className={cn("border", avatarBorderClass)}
        />
        <span
          className={cn(
            "text-sm font-medium",
            isDarkVariant ? "text-gray-300" : "text-gray-700",
            fullWidth ? "flex-1 text-left truncate" : ""
          )}
        >
          No tenants
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            chevronColorClass,
            isMenuOpen && "rotate-180"
          )}
        />
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", fullWidth && "w-full", className)}>
      {selectedTenant?.logo && showLogo === 'full' && (
        <div className="relative h-10 w-30 overflow-hidden">
          <Image 
            src={selectedTenant.logo} 
            alt={selectedTenant.title || selectedTenant.name}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}
      <DropdownMenuPrimitive.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuPrimitive.Trigger asChild className={fullWidth ? "w-full" : "min-w-44"}>
          <Button 
            variant="outline" 
            size="sm" 
            className={triggerBaseClasses}
            aria-label="Select tenant"
            ref={triggerRef}
          >
            <Avatar 
              fallback={tenantInitials}
              size={showLogo === 'sidebar-avatar' ? 'xs' : 'sm'}
              variant="primary"
              className={cn(
                "border",
                avatarBorderClass,
                showLogo === 'sidebar-avatar' ? "h-8 w-8" : ""
              )}
              src={showLogo === 'sidebar-avatar' ? selectedTenant?.logo : undefined}
            />
            <span
              className={cn(
                "text-sm font-medium line-clamp-1 whitespace-nowrap overflow-hidden text-ellipsis text-start",
                isDarkVariant ? "text-gray-300" : "text-gray-700 dark:text-gray-300",
                fullWidth ? "flex-1" : ""
              )}
            >
              {getTenantName(selectedTenant) || placeholder}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                chevronColorClass,
                isMenuOpen && "rotate-180"
              )}
            />
          </Button>
        </DropdownMenuPrimitive.Trigger>
      
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            className={menuContentClasses}
            align="start"
            sideOffset={4}
            style={{
              minWidth: triggerRef.current?.offsetWidth || undefined,
              width: triggerRef.current?.offsetWidth || undefined
            }}
          >
            <DropdownMenuPrimitive.Label className={labelClasses}>
              Tenants
            </DropdownMenuPrimitive.Label>
            
            <DropdownMenuPrimitive.Separator className={separatorClasses} />
            
            {/* None option */}
            <DropdownMenuPrimitive.Item
              className={cn(
                menuItemBaseClasses,
                isDarkVariant
                  ? "hover:bg-violet-500/10 focus:bg-violet-500/10 text-gray-200"
                  : "hover:bg-violet-50 focus:bg-violet-50 text-gray-800",
                !selectedTenant &&
                  (isDarkVariant ? "bg-violet-500/15" : "bg-violet-50")
              )}
              onSelect={() => handleTenantSelect(null)}
            >
              None (Use Domain)
            </DropdownMenuPrimitive.Item>
            
            {tenants
              .filter((tenant) => tenant && (tenant.id !== undefined && tenant.id !== null))
              .map((tenant) => (
                <DropdownMenuPrimitive.Item
                  key={tenant.id}
                  className={cn(
                    menuItemBaseClasses,
                    isDarkVariant
                      ? "hover:bg-violet-500/10 focus:bg-violet-500/10 text-gray-200"
                      : "hover:bg-violet-50 focus:bg-violet-50 text-gray-800",
                    selectedTenant?.id === tenant.id &&
                      (isDarkVariant ? "bg-violet-500/15" : "bg-violet-50")
                  )}
                  onSelect={() => handleTenantSelect(tenant)}
                >
                  {getTenantName(tenant)}
                </DropdownMenuPrimitive.Item>
              ))}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
};

TenantSelector.displayName = 'TenantSelector';


