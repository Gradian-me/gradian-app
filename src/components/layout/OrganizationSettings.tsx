'use client';

import { useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CompanySelector } from './CompanySelector';
import { TenantSelector } from './TenantSelector';
import { useTenantStore } from '@/stores/tenant.store';
import { useCompanyStore } from '@/stores/company.store';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { cn } from '@/gradian-ui/shared/utils';

export function OrganizationSettings() {
  const { selectedTenant } = useTenantStore();
  const { selectedCompany } = useCompanyStore();

  const tenantLabel =
    selectedTenant && (selectedTenant.title || selectedTenant.name)
      ? String(selectedTenant.title || selectedTenant.name).trim()
      : 'None';

  const companyLabel =
    selectedCompany && selectedCompany.name
      ? String(selectedCompany.name).trim()
      : 'None';

  const tooltipText = `Tenant: ${tenantLabel} Company: ${companyLabel}`;
  const hasSelection = tenantLabel !== 'None' || companyLabel !== 'None';

  const [isOpen, setIsOpen] = useState(false);

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
                  'border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 dark:border-violet-300/60 dark:bg-gray-900 dark:text-violet-200 dark:hover:bg-gray-800'
                )}
                aria-label="Organization settings"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-medium">
                  {hasSelection ? 'Organization' : 'Select organization'}
                </span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 space-y-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
              <div className="px-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  Organization
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  Tenant: {tenantLabel} • Company: {companyLabel}
                </p>
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  Tenant
                </p>
                {/* Always show TenantSelector: interactive in demo, disabled in live */}
                <TenantSelector disabled={!DEMO_MODE} fullWidth />
              </div>

              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  Company
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


