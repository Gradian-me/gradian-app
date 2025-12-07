import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { sanitizeNestedData } from '@/gradian-ui/shared/utils/security.util';
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';

interface Company {
  id: string | number;
  name: string;
  logo?: string;
  abbreviation?: string;
  [key: string]: any;
}

interface CompanyState {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  getCompanyId: () => string | number | null;
  clearSelectedCompany: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  devtools(
    persist(
      (set, get) => ({
        selectedCompany: null,
        
        setSelectedCompany: (company: Company | null) => {
          // Sanitize company data before storing
          const sanitizedCompany = company ? sanitizeNestedData(company) : null;
          set({ selectedCompany: sanitizedCompany }, false, 'setSelectedCompany');
        },
        
        getCompanyId: () => {
          const company = get().selectedCompany;
          // Return null if "All Companies" is selected (id === -1)
          if (company && company.id !== -1) {
            return company.id;
          }
          return null;
        },
        
        clearSelectedCompany: () => {
          set({ selectedCompany: null }, false, 'clearSelectedCompany');
        },
      }),
      {
        name: 'company-store',
      }
    ),
    getZustandDevToolsConfig<CompanyState>('company-store')
  )
);
