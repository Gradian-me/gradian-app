import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { FormSchema, FormData } from '@/gradian-ui/schema-manager/types/form-schema';
import { User } from '@/types';
import { sanitizeNestedData } from '@/gradian-ui/shared/utils/security.util';
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';

interface DynamicFormContextState {
  formSchema: FormSchema | null;
  formData: FormData | null;
  userData: User | null;
  setFormSchema: (schema: FormSchema | null) => void;
  setFormData: (data: FormData | null) => void;
  setUserData: (user: User | null) => void;
  reset: () => void;
}

export const useDynamicFormContextStore = create<DynamicFormContextState>()(
  devtools(
    (set) => ({
      formSchema: null,
      formData: null,
      userData: null,
      setFormSchema: (schema) => set({ formSchema: schema }, false, 'setFormSchema'),
      setFormData: (data) => {
        // Sanitize form data before storing (remove sensitive fields)
        const sanitizedData = data ? sanitizeNestedData(data) : null;
        set({ formData: sanitizedData }, false, 'setFormData');
      },
      setUserData: (user) => {
        // Sanitize user data before storing
        const sanitizedUser = user ? sanitizeNestedData(user) : null;
        set({ userData: sanitizedUser }, false, 'setUserData');
      },
      reset: () => set({ formSchema: null, formData: null, userData: null }, false, 'resetDynamicFormContext'),
    }),
    getZustandDevToolsConfig<DynamicFormContextState>('dynamic-form-context-store')
  )
);


