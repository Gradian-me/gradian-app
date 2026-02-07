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
import { useUserStore } from '@/stores/user.store';
import { useTheme } from 'next-themes';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

interface Company {
  id: string | number;
  name: string;
  logo?: string;
  [key: string]: any;
}

type RelatedCompanyLike = {
  id: string | number;
  label?: string;
  name?: string;
  logo?: string;
};

interface CompanySelectorProps {
  onCompanyChange?: (company: string) => void;
  onCompanyChangeFull?: (company: Company) => void;
  variant?: 'light' | 'dark' | 'auto';
  fullWidth?: boolean;
  showLogo?: 'none' | 'sidebar-avatar' | 'full';
  onOpenChange?: (open: boolean) => void; // Notify parent when dropdown menu opens/closes
}

export function CompanySelector({
  onCompanyChange,
  onCompanyChangeFull,
  variant = 'auto',
  fullWidth = false,
  showLogo = 'full',
  onOpenChange,
}: CompanySelectorProps) {
  const { selectedCompany, setSelectedCompany } = useCompanyStore();
  const { selectedTenant } = useTenantStore();
  const user = useUserStore((state) => state.user);
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
        // Prefer user.relatedCompanies to avoid network call
        const relatedFromUser: RelatedCompanyLike[] = (user?.relatedCompanies || []) as RelatedCompanyLike[];

        const tenant = selectedTenant;
        
        // If not in store, read directly from localStorage
        let relatedCompanies: RelatedCompanyLike[] = [];
        
        if (relatedFromUser && relatedFromUser.length > 0) {
          relatedCompanies = relatedFromUser;
        } else if (tenant && tenant['relatedCompanies']) {
          relatedCompanies = tenant['relatedCompanies'] as RelatedCompanyLike[];
        } else if (typeof window !== 'undefined') {
          const tenantStoreData = localStorage.getItem('tenant-store');
          if (tenantStoreData) {
            const parsed = JSON.parse(tenantStoreData);
            if (parsed?.state?.selectedTenant?.['relatedCompanies']) {
              relatedCompanies = parsed.state.selectedTenant['relatedCompanies'] as RelatedCompanyLike[];
            }
          }
        }

        // If we have relatedCompanies from user/tenant, use them
        if (relatedCompanies && relatedCompanies.length > 0) {
          const mappedCompanies: Company[] = relatedCompanies.map((company: RelatedCompanyLike) => ({
            id: company.id,
            name: company.label || company.name || 'Company',
            logo: company.logo,
          }));

          // Always add "All Companies" option at the beginning
          const allCompaniesOption: Company = {
            id: -1,
            name: 'All Companies',
          };
          setCompanies([allCompaniesOption, ...mappedCompanies]);
          setLoading(false);
          return;
        }

        // When no tenant is selected, fetch ALL companies from API without tenant filtering
        // The callerName 'CompanySelector' will bypass auto-injection of tenant/company filters
        loggingCustom(LogType.CLIENT_LOG, 'info', 'No tenant selected or tenant has no relatedCompanies, fetching all companies from API');
        
        const { apiRequest } = await import('@/gradian-ui/shared/utils/api');
        // Using callerName 'CompanySelector' bypasses auto-injection of tenantIds/companyIds
        const response = await apiRequest<Company[] | { data?: Company[]; items?: Company[] }>(
          '/api/data/companies',
          { method: 'GET', callerName: 'CompanySelector' }
        );

        if (response.success && response.data) {
          const data = Array.isArray(response.data)
            ? response.data
            : ((response.data as any)?.data || (response.data as any)?.items || []);
          
          // Always add "All Companies" option at the beginning
          const allCompaniesOption: Company = {
            id: -1,
            name: 'All Companies',
          };
          
          // Filter out any existing "All Companies" option to avoid duplicates
          const filteredData = data.filter((c: Company) => c.id !== -1);
          setCompanies([allCompaniesOption, ...filteredData]);
        } else {
          // Even if API fails, still show "All Companies" option
          const allCompaniesOption: Company = {
            id: -1,
            name: 'All Companies',
          };
          setCompanies([allCompaniesOption]);
        }
      } catch (error) {
        loggingCustom(LogType.CLIENT_LOG, 'error', `Error loading companies: ${error instanceof Error ? error.message : String(error)}`);
        // Even on error, show "All Companies" option
        const allCompaniesOption: Company = {
          id: -1,
          name: 'All Companies',
        };
        setCompanies([allCompaniesOption]);
      } finally {
        setLoading(false);
      }
    };

    void loadCompanies();
  }, [isMounted, selectedTenant]);

  // Set default company when companies are loaded
  useEffect(() => {
    if (isMounted && companies.length > 0) {
      const realCompanies = companies.filter((c) => c.id !== -1);

      // If there's exactly one real company, select it by default
      if (realCompanies.length === 1) {
        const singleRealCompany = realCompanies[0];
        if (!selectedCompany || selectedCompany.id !== singleRealCompany.id) {
          setSelectedCompany(singleRealCompany);
          if (typeof document !== 'undefined') {
            const companyId = String(singleRealCompany.id);
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

  const defaultLang = getDefaultLanguage();
  const language = useLanguageStore((s) => s.language) || defaultLang;
  const labelAllCompanies = getT(TRANSLATION_KEYS.LABEL_ALL_COMPANIES, language, defaultLang);

  const getCompanyName = (company?: Company | null) =>
    company?.name && company.name.trim().length > 0 ? company.name.trim() : 'Untitled company';

  const getCompanyDisplayName = (company?: Company | null) =>
    company?.id === -1 ? labelAllCompanies : getCompanyName(company);

  const companyInitials = (() => {
    const name = getCompanyDisplayName(selectedCompany);
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

  // Note: CompanySelector is always shown, even with a single company, to provide visual feedback

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
          {getCompanyDisplayName(selectedCompany) || 'Loading...'}
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
    <div className={cn("flex items-center justify-center space-x-2", fullWidth && "w-full")}>
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
                {getCompanyDisplayName(selectedCompany) || 'Select company'}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  chevronColorClass,
                  isMenuOpen && "rotate-180"
                )}
              />
            </Button>
            {selectedCompany && selectedCompany.id !== -1 && (
              <div
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white shadow-sm"
                title={getCompanyDisplayName(selectedCompany)}
                aria-label={getCompanyDisplayName(selectedCompany)}
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
                "hover:bg-violet-50 focus:bg-violet-50 text-gray-800 dark:hover:bg-violet-500/10 dark:focus:bg-violet-500/10 dark:text-gray-200",
                selectedCompany?.id === company.id &&
                  (isDarkVariant ? "bg-violet-500/15" : "bg-violet-50")
              )}
              onSelect={() => handleCompanySelect(company)}
            >
              {getCompanyDisplayName(company)}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
    </div>
  );
}
