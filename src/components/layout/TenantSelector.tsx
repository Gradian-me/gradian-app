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
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { SCHEMAS_QUERY_KEY, SCHEMAS_SUMMARY_QUERY_KEY } from '@/gradian-ui/schema-manager/hooks/use-schemas';
import { clearSchemaCache } from '@/gradian-ui/indexdb-manager/schema-cache';
import { SCHEMA_SUMMARY_CACHE_KEY, SCHEMA_CACHE_KEY } from '@/gradian-ui/indexdb-manager/types';

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
  hidden?: boolean; // If true, enables fallback to first tenant when no domain match is found (legacy prop, mainly for backward compatibility)
  disabled?: boolean; // If true, show selector but disable interaction (read-only)
  onOpenChange?: (open: boolean) => void; // Notify parent when dropdown menu opens/closes
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({
  className,
  placeholder = 'Select tenant',
  variant = 'auto',
  fullWidth = false,
  showLogo = 'full',
  hidden = false,
  disabled = false,
  onOpenChange,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedTenant, setSelectedTenant, tenants: storeTenants, setTenants: setStoreTenants } = useTenantStore();
  const [tenants, setTenants] = useState<Tenant[]>(() => storeTenants || []);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const hasAutoSelectedRef = useRef(false);
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
        // If we already have tenants in the store, use them and avoid another network call
        if (storeTenants && storeTenants.length > 0) {
          setTenants(storeTenants);
          setLoading(false);
          return;
        }

        const response = await apiRequest<Tenant[] | { data?: Tenant[]; items?: Tenant[] }>(
          '/api/data/tenants',
          { method: 'GET', callerName: 'TenantSelector' }
        );

        if (response.success && response.data) {
          const data = Array.isArray(response.data)
            ? response.data
            : ((response.data as any)?.data || (response.data as any)?.items || []);
          setTenants(data);
          setStoreTenants(data);
          
          // Validate that the currently selected tenant still exists in the fetched list
          if (selectedTenant) {
            const tenantStillExists = data.some((tenant: Tenant) => 
              tenant.id === selectedTenant.id
            );
            if (!tenantStillExists) {
              // Selected tenant no longer exists, clear it
              loggingCustom(LogType.CLIENT_LOG, 'info', `Selected tenant "${selectedTenant.name || selectedTenant.id}" no longer exists, clearing selection`);
              setSelectedTenant(null);
            }
          }
          
          // Auto-select tenant based on domain matching on initial load (only if no tenant is selected)
          // Skip auto-selection if hostname is localhost
          if (data.length > 0 && !selectedTenant && !hasAutoSelectedRef.current) {
            hasAutoSelectedRef.current = true;
            const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
            
            // Skip auto-selection for localhost
            const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost:');
            
            if (!isLocalhost) {
              // Normalize hostname: remove port if present
              const normalizedHostname = hostname.split(':')[0];
              
              // Try to find tenant matching current domain (exact match or subdomain match)
              const domainMatch = data.find((tenant: Tenant) => {
                if (!tenant.domain) return false;
                const tenantDomain = tenant.domain.toLowerCase().trim();
                
                // Remove http:// or https:// if present
                const cleanDomain = tenantDomain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
                
                // Exact match
                if (normalizedHostname === cleanDomain) return true;
                
                // Subdomain match: hostname ends with .domain (e.g., app.example.com matches example.com)
                if (normalizedHostname.endsWith('.' + cleanDomain)) return true;
                
                return false;
              });
              
              if (domainMatch) {
                const fullTenant: Tenant = {
                  ...domainMatch,
                  domain: domainMatch.domain || '',
                };
                loggingCustom(LogType.CLIENT_LOG, 'info', `Auto-selected tenant "${fullTenant.name || fullTenant.id}" based on domain match: ${normalizedHostname} matches ${domainMatch.domain}`);
                setSelectedTenant(fullTenant);
                // Save to localStorage
                if (typeof window !== 'undefined') {
                  try {
                    const stateToSave = {
                      state: { selectedTenant: fullTenant },
                      version: 0
                    };
                    localStorage.setItem('tenant-store', JSON.stringify(stateToSave));
                  } catch (error) {
                    loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to save tenant to localStorage: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }
              } else {
                // Fallback to first tenant if no domain match and hidden prop is true (legacy behavior)
                // Otherwise, leave tenant unselected for user to choose manually
                if (hidden) {
                  const firstTenant = data[0];
                  if (firstTenant) {
                    const fullTenant: Tenant = {
                      ...firstTenant,
                      domain: firstTenant.domain || '',
                    };
                    loggingCustom(LogType.CLIENT_LOG, 'info', `No domain match found for ${normalizedHostname}, selecting first tenant (hidden mode fallback)`);
                    setSelectedTenant(fullTenant);
                    // Save to localStorage
                    if (typeof window !== 'undefined') {
                      try {
                        const stateToSave = {
                          state: { selectedTenant: fullTenant },
                          version: 0
                        };
                        localStorage.setItem('tenant-store', JSON.stringify(stateToSave));
                      } catch (error) {
                        loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to save tenant to localStorage: ${error instanceof Error ? error.message : String(error)}`);
                      }
                    }
                  }
                } else {
                  loggingCustom(LogType.CLIENT_LOG, 'info', `No domain match found for ${normalizedHostname}, leaving tenant unselected`);
                }
              }
            } else {
              loggingCustom(LogType.CLIENT_LOG, 'info', 'Hostname is localhost, skipping tenant auto-selection');
            }
          }
        }
      } catch (err) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading tenants: ${err instanceof Error ? err.message : String(err)}`);
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchTenants();
    // Only depend on isMounted and hidden - don't re-fetch when selectedTenant changes
  }, [isMounted, hidden, storeTenants]);
  
  // Separate effect to validate selected tenant when it changes (but don't re-fetch)
  useEffect(() => {
    if (!isMounted || tenants.length === 0 || !selectedTenant) return;
    
    // Validate that the selected tenant still exists in the tenants list
    const tenantStillExists = tenants.some((tenant: Tenant) => 
      tenant.id === selectedTenant.id
    );
    if (!tenantStillExists) {
      // Selected tenant no longer exists, clear it
      loggingCustom(LogType.CLIENT_LOG, 'info', `Selected tenant "${selectedTenant.name || selectedTenant.id}" no longer exists in fetched list, clearing selection`);
      setSelectedTenant(null);
    }
  }, [isMounted, tenants, selectedTenant, setSelectedTenant]);
  
  // Reset auto-selection ref when hidden prop changes (allows re-attempting auto-selection)
  useEffect(() => {
    if (!hidden) {
      hasAutoSelectedRef.current = false;
    }
  }, [hidden]);

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
    
    // Clear schema cache when tenant changes (both React Query and IndexedDB)
    try {
      loggingCustom(LogType.CLIENT_LOG, 'info', 'Clearing schema cache due to tenant change');
      
      // Call the clear-cache API route to clear server-side caches
      try {
        const clearCacheResponse = await fetch('/api/schemas/clear-cache', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (clearCacheResponse.ok) {
          const result = await clearCacheResponse.json();
          loggingCustom(LogType.CLIENT_LOG, 'info', `Server-side cache cleared: ${result.message || 'success'}`);
        } else {
          loggingCustom(LogType.CLIENT_LOG, 'warn', `Server-side cache clear returned status ${clearCacheResponse.status}`);
        }
      } catch (apiError) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to call clear-cache API: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
      
      // Clear IndexedDB cache (this is persistent storage)
      try {
        await Promise.all([
          clearSchemaCache(undefined, SCHEMA_CACHE_KEY),
          clearSchemaCache(undefined, SCHEMA_SUMMARY_CACHE_KEY),
        ]);
        loggingCustom(LogType.CLIENT_LOG, 'info', 'IndexedDB schema cache cleared');
      } catch (indexedDbError) {
        loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to clear IndexedDB schema cache: ${indexedDbError instanceof Error ? indexedDbError.message : String(indexedDbError)}`);
      }
      
      // Invalidate all schema queries (this marks them as stale and triggers refetch)
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
          exact: false, // Invalidate all queries that start with this key (including tenant-specific ones)
        }),
        queryClient.invalidateQueries({ 
          queryKey: SCHEMAS_QUERY_KEY,
          exact: false, // Invalidate all queries that start with this key (including tenant-specific ones)
        }),
      ]);
      
      // Remove all schema queries from React Query cache to force fresh fetch
      queryClient.removeQueries({ 
        queryKey: SCHEMAS_SUMMARY_QUERY_KEY,
        exact: false,
      });
      queryClient.removeQueries({ 
        queryKey: SCHEMAS_QUERY_KEY,
        exact: false,
      });
      
      // Dispatch event to notify other components about cache clear
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('react-query-cache-clear', { 
          detail: { queryKeys: ['schemas', 'schemas-summary'] } 
        }));
        // Also trigger storage event for other tabs
        window.localStorage.setItem('react-query-cache-cleared', JSON.stringify(['schemas', 'schemas-summary']));
        window.localStorage.removeItem('react-query-cache-cleared');
      }
      
      loggingCustom(LogType.CLIENT_LOG, 'info', 'Schema cache cleared successfully (Server + React Query + IndexedDB)');
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', `Failed to clear schema cache: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Wait a bit more to ensure cache clearing operations complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Refresh router to update server components without full page reload
    // This preserves scroll position, pagination, and other client state
    router.refresh();
  };

  const defaultLang = getDefaultLanguage();
  const language = useLanguageStore((s) => s.language) || defaultLang;
  const labelNoneUseDomain = getT(TRANSLATION_KEYS.LABEL_NONE_USE_DOMAIN, language, defaultLang);

  const getTenantName = (tenant?: Tenant | null) => {
    if (!tenant) return labelNoneUseDomain;
    return (tenant.title || tenant.name || String(tenant.id)).trim() || 'Untitled tenant';
  };

  const tenantInitials = (() => {
    if (!selectedTenant) return 'TN';
    const name = getTenantName(selectedTenant);
    if (!name) {
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
    "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-100 dark:text-gray-900"
  );
  const labelClasses = cn(
    "px-2 py-1.5 text-sm font-semibold",
    "text-gray-900 dark:text-gray-100"
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

  // Read-only / disabled mode: show current tenant but prevent opening menu
  if (disabled) {
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
        <Button 
          variant="outline" 
          size="sm" 
          className={triggerBaseClasses}
          aria-label="Tenant selection is disabled in live mode"
          disabled
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
              "h-4 w-4 shrink-0",
              chevronColorClass,
            )}
          />
        </Button>
      </div>
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
      <DropdownMenuPrimitive.Root
        open={isMenuOpen}
        onOpenChange={(open) => {
          setIsMenuOpen(open);
          onOpenChange?.(open);
        }}
      >
        <DropdownMenuPrimitive.Trigger asChild className={fullWidth ? "w-full" : "min-w-44"}>
          <div className="relative w-full">
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
            {selectedTenant && (
              <div
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white shadow-sm"
                title={getTenantName(selectedTenant)}
                aria-label={getTenantName(selectedTenant)}
              />
            )}
          </div>
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
                "hover:bg-violet-50 focus:bg-violet-50 text-gray-800 dark:hover:bg-violet-500/10 dark:focus:bg-violet-500/10 dark:text-gray-200",
                !selectedTenant &&
                  "bg-violet-50 dark:bg-violet-500/15"
              )}
              onSelect={() => handleTenantSelect(null)}
            >
              {labelNoneUseDomain}
            </DropdownMenuPrimitive.Item>
            
            {tenants
              .filter((tenant) => tenant && (tenant.id !== undefined && tenant.id !== null))
              .map((tenant) => (
                <DropdownMenuPrimitive.Item
                  key={tenant.id}
                  className={cn(
                    menuItemBaseClasses,
                    "hover:bg-violet-50 focus:bg-violet-50 text-gray-800 dark:hover:bg-violet-500/10 dark:focus:bg-violet-500/10 dark:text-gray-200",
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


