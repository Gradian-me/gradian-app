import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { User } from '@/types';
import { sanitizeNestedData } from '@/gradian-ui/shared/utils/security.util';
import { getZustandDevToolsConfig } from '@/gradian-ui/shared/utils/zustand-devtools.util';
import { createEncryptedStorage } from '@/gradian-ui/shared/utils/encrypted-local-storage';

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  getUserId: () => string | null;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        
        setUser: (user: User | null) => {
          // Sanitize user data before storing to prevent sensitive data leakage
          const sanitizedUser = user ? sanitizeNestedData(user) : null;
          set({ user: sanitizedUser }, false, 'setUser');
        },
        
        getUserId: () => {
          const user = get().user;
          return user?.id || null;
        },
        
        clearUser: () => {
          set({ user: null }, false, 'clearUser');
        },
      }),
      {
        name: 'user-store',
        storage: createEncryptedStorage(),
      }
    ),
    getZustandDevToolsConfig<UserState>('user-store')
  )
);

