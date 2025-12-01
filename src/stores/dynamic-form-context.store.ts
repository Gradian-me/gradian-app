import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { FormSchema, FormData } from '@/gradian-ui/schema-manager/types/form-schema';
import { User } from '@/types';

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
      setFormData: (data) => set({ formData: data }, false, 'setFormData'),
      setUserData: (user) => set({ userData: user }, false, 'setUserData'),
      reset: () => set({ formSchema: null, formData: null, userData: null }, false, 'resetDynamicFormContext'),
    }),
    {
      name: 'dynamic-form-context-store',
    }
  )
);


