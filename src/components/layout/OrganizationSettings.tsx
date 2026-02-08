'use client';

import { useState, useEffect } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CompanySelector } from './CompanySelector';
import { TenantSelector } from './TenantSelector';
import { useTenantStore } from '@/stores/tenant.store';
import { useCompanyStore } from '@/stores/company.store';
import { useLanguageStore } from '@/stores/language.store';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { cn } from '@/gradian-ui/shared/utils';
import { useTheme } from 'next-themes';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export function OrganizationSettings() {
  const { selectedTenant } = useTenantStore();
  const { selectedCompany } = useCompanyStore();
  const language = useLanguageStore((s) => s.language);
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const defaultLang = getDefaultLanguage();

  const hasTenant = !!(selectedTenant && (selectedTenant.title || selectedTenant.name));
  const tenantLabel = hasTenant
    ? String(selectedTenant!.title || selectedTenant!.name).trim()
    : 'None';

  const isAllCompanies = selectedCompany?.id === -1;
  const companyLabel =
    selectedCompany && selectedCompany.name
      ? String(selectedCompany.name).trim()
      : 'None';

  const labelOrganization = getT(TRANSLATION_KEYS.LABEL_ORGANIZATION, language, defaultLang);
  const labelSelectOrganization = getT(TRANSLATION_KEYS.LABEL_SELECT_ORGANIZATION, language, defaultLang);
  const labelTenant = getT(TRANSLATION_KEYS.LABEL_TENANT, language, defaultLang);
  const labelCompany = getT(TRANSLATION_KEYS.LABEL_COMPANY, language, defaultLang);
  const labelNone = getT(TRANSLATION_KEYS.LABEL_NONE, language, defaultLang);
  const labelAllCompanies = getT(TRANSLATION_KEYS.LABEL_ALL_COMPANIES, language, defaultLang);

  const tenantDisplay = tenantLabel === 'None' ? labelNone : tenantLabel;
  const companyDisplay =
    !selectedCompany || companyLabel === 'None'
      ? labelNone
      : isAllCompanies || companyLabel === 'All Companies'
        ? labelAllCompanies
        : companyLabel;
  const tooltipText = `${labelTenant}: ${tenantDisplay} • ${labelCompany}: ${companyDisplay}`;
  const hasSelection = hasTenant || companyLabel !== 'None';

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDarkVariant = isMounted && resolvedTheme === 'dark';

  // Render button without Popover on server to avoid hydration mismatch
  if (!isMounted) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'flex items-center space-x-2 rounded-xl transition-colors outline-none ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-10',
              'border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 focus-visible:ring-violet-500 focus-visible:ring-offset-white'
            )}
            aria-label="Organization settings"
            disabled
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-medium">
              {hasSelection ? labelOrganization : labelSelectOrganization}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip open={isOpen ? false : undefined}>
      <TooltipTrigger asChild>
        <div>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'flex items-center space-x-2 rounded-xl transition-colors outline-none ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-10',
                  isDarkVariant
                    ? 'border border-violet-300/60 bg-gray-900 text-violet-200 hover:bg-gray-800 focus-visible:ring-violet-500 focus-visible:ring-offset-gray-900'
                    : 'border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 focus-visible:ring-violet-500 focus-visible:ring-offset-white'
                )}
                aria-label="Organization settings"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-medium">
                  {hasSelection ? labelOrganization : labelSelectOrganization}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    isDarkVariant ? "text-gray-300" : "text-gray-500",
                    isOpen && "rotate-180"
                  )}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
              <div className="px-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  {labelOrganization}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {labelTenant}: {tenantDisplay} • {labelCompany}: {companyDisplay}
                </p>
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  {labelTenant}
                </p>
                {/* Always show TenantSelector: interactive in demo, disabled in live */}
                <TenantSelector disabled={!DEMO_MODE} fullWidth />
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  {labelCompany}
                </p>
                <CompanySelector fullWidth showLogo="sidebar-avatar" />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}


