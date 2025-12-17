'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/gradian-ui/form-builder/form-elements';
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { useCompanyStore } from '@/stores/company.store';
import { useTenantStore } from '@/stores/tenant.store';
import { useTheme } from 'next-themes';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

interface Company {
  id: string | number;
  name: string;
  logo?: string;
  [key: string]: any;
}

interface CompanySelectorProps {
  onCompanyChange?: (company: string) => void;
  onCompanyChangeFull?: (company: Company) => void;
  variant?: 'light' | 'dark' | 'auto';
  fullWidth?: boolean;
  showLogo?: 'none' | 'sidebar-avatar' | 'full';
}

export function CompanySelector({
  onCompanyChange,
  onCompanyChangeFull,
  variant = 'auto',
  fullWidth = false,
  showLogo = 'full',
}: CompanySelectorProps) {
  const { selectedCompany, setSelectedCompany } = useCompanyStore();
  const { selectedTenant } = useTenantStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const onCompanyChangeFullRef = useRef(onCompanyChangeFull);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { resolvedTheme } = useTheme();
  const computedVariant =
    variant === 'auto'
      ? isMounted && resolvedTheme === 'dark'
        ? 'dark'
        : 'light'
      : variant;
  const isDarkVariant = computedVariant === 'dark';
  
  // Keep ref in sync with callback
  useEffect(() => {
    onCompanyChangeFullRef.current = onCompanyChangeFull;
  }, [onCompanyChangeFull]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load companies from tenant-store in localStorage, with fallback to API
  useEffect(() => {
    if (!isMounted) return;

    const loadCompanies = async () => {
      try {
        // Try to get from Zustand store first
        const tenant = selectedTenant;
        
        // If not in store, read directly from localStorage
        let relatedCompanies: Array<{ id: string; label: string }> = [];
        
        if (tenant && tenant['relatedCompanies']) {
          relatedCompanies = tenant['relatedCompanies'];
        } else if (typeof window !== 'undefined') {
          const tenantStoreData = localStorage.getItem('tenant-store');
          if (tenantStoreData) {
            const parsed = JSON.parse(tenantStoreData);
            if (parsed?.state?.selectedTenant?.['relatedCompanies']) {
              relatedCompanies = parsed.state.selectedTenant['relatedCompanies'];
            }
          }
        }

        // If we have relatedCompanies from tenant, use them
        if (relatedCompanies && relatedCompanies.length > 0) {
          // Map relatedCompanies to Company format (label -> name)
          const mappedCompanies: Company[] = relatedCompanies.map((company) => ({
            id: company.id,
            name: company.label,
          }));

          setCompanies(mappedCompanies);
          setLoading(false);
          return;
        }

        // Fallback: Fetch companies directly from API if tenant doesn't have relatedCompanies
        loggingCustom(LogType.CLIENT_LOG, 'info', 'Tenant does not have relatedCompanies, fetching companies from API');
        
        const { apiRequest } = await import('@/gradian-ui/shared/utils/api');
        const response = await apiRequest<Company[] | { data?: Company[]; items?: Company[] }>(
          '/api/data/companies',
          { method: 'GET', callerName: 'CompanySelector' }
        );

        if (response.success && response.data) {
          const data = Array.isArray(response.data)
            ? response.data
            : ((response.data as any)?.data || (response.data as any)?.items || []);
          setCompanies(data);
        } else {
          setCompanies([]);
        }
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading companies: ${error instanceof Error ? error.message : String(error)}`);
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    void loadCompanies();
  }, [isMounted, selectedTenant]);

  // Set default company when companies are loaded
  useEffect(() => {
    if (isMounted && companies.length > 0) {
      // If there's only one company, automatically set it as default
      if (companies.length === 1) {
        const singleCompany = companies[0];
        if (!selectedCompany || selectedCompany.id !== singleCompany.id) {
          setSelectedCompany(singleCompany);
          // Set cookie for the single company
          if (typeof document !== 'undefined') {
            const companyId = singleCompany.id !== -1 ? String(singleCompany.id) : '';
            document.cookie = `selectedCompanyId=${companyId}; path=/; max-age=${60 * 60 * 24 * 365}`;
          }
        }
      } else {
        // Set default company if nothing is in store (for multiple companies)
        if (!selectedCompany) {
          // First try to find "All Companies" option
          const allCompaniesOption = companies.find(c => c.id === -1);
          if (allCompaniesOption) {
            setSelectedCompany(allCompaniesOption);
            // Set cookie for default
            if (typeof document !== 'undefined') {
              document.cookie = `selectedCompanyId=; path=/; max-age=0`; // Clear for "All Companies"
            }
          } else if (companies.length > 0) {
            // Otherwise, select the first company
            setSelectedCompany(companies[0]);
            // Set cookie for first company
            if (typeof document !== 'undefined') {
              const companyId = companies[0].id !== -1 ? String(companies[0].id) : '';
              document.cookie = `selectedCompanyId=${companyId}; path=/; max-age=${60 * 60 * 24 * 365}`;
            }
          }
        } else {
          // Sync cookie with store
          if (typeof document !== 'undefined') {
            const companyId = selectedCompany.id !== -1 ? String(selectedCompany.id) : '';
            document.cookie = `selectedCompanyId=${companyId}; path=/; max-age=${60 * 60 * 24 * 365}`;
          }
        }
      }
    }
  }, [isMounted, companies, selectedCompany, setSelectedCompany]);

  
  const handleCompanySelect = (company: Company) => {
    loggingCustom(LogType.CLIENT_LOG, 'log', `Company selected: ${JSON.stringify(company)}`);
    setSelectedCompany(company);
    // Set cookie for server-side access
    if (typeof document !== 'undefined') {
      const companyId = company.id !== -1 ? String(company.id) : '';
      document.cookie = `selectedCompanyId=${companyId}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
    }
    if (onCompanyChange) {
      onCompanyChange(company.name);
    }
    if (onCompanyChangeFull) {
      onCompanyChangeFull(company);
    }
  };

  const getCompanyName = (company?: Company | null) =>
    company?.name && company.name.trim().length > 0 ? company.name.trim() : 'Untitled company';

  const companyInitials = (() => {
    const name = getCompanyName(selectedCompany);
    if (!name) {
      return 'CO';
    }
    return name
      .split(' ')
      .filter(Boolean)
      .map((word: string) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'CO';
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

  // Hide component if there's only one company (it's automatically selected)
  if (isMounted && !loading && companies.length === 1) {
    return null;
  }

  if (!isMounted || loading) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className={triggerBaseClasses}
        aria-label="Select company"
        disabled
      >
        <Avatar 
          fallback={companyInitials}
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
          {getCompanyName(selectedCompany) || 'Loading...'}
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

  if (companies.length === 0) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className={triggerBaseClasses}
        aria-label="Select company"
        disabled
      >
        <Avatar 
          fallback="CO"
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
          No companies
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
    <div className={cn("flex items-center space-x-2", fullWidth && "w-full")}>
      {selectedCompany?.logo && showLogo === 'full' && (
        <div className="relative h-10 w-30 overflow-hidden">
          <Image 
            src={selectedCompany.logo} 
            alt={selectedCompany.name}
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
              aria-label="Select company"
              ref={triggerRef}
            >
            <Avatar 
              fallback={companyInitials}
              size={showLogo === 'sidebar-avatar' ? 'xs' : 'sm'}
              variant="primary"
              className={cn(
                "border",
                avatarBorderClass,
                showLogo === 'sidebar-avatar' ? "h-8 w-8" : ""
              )}
              src={showLogo === 'sidebar-avatar' ? selectedCompany?.logo : undefined}
            />
            <span
              className={cn(
                "text-sm font-medium line-clamp-1 whitespace-nowrap overflow-hidden text-ellipsis text-start",
                isDarkVariant ? "text-gray-300" : "text-gray-700 dark:text-gray-300",
                fullWidth ? "flex-1" : ""
              )}
            >
              {getCompanyName(selectedCompany) || 'Select company'}
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
            Companies
          </DropdownMenuPrimitive.Label>
          
          <DropdownMenuPrimitive.Separator className={separatorClasses} />
          
          {companies
            .filter((company) => company && (company.id !== undefined && company.id !== null))
            .map((company) => (
            <DropdownMenuPrimitive.Item
              key={company.id}
              className={cn(
                menuItemBaseClasses,
                isDarkVariant
                  ? "hover:bg-violet-500/10 focus:bg-violet-500/10 text-gray-200"
                  : "hover:bg-violet-50 focus:bg-violet-50 text-gray-800",
                selectedCompany?.id === company.id &&
                  (isDarkVariant ? "bg-violet-500/15" : "bg-violet-50")
              )}
              onSelect={() => handleCompanySelect(company)}
            >
              {getCompanyName(company)}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
    </div>
  );
}
