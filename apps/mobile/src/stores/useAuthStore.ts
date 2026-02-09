import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { StateStorage, createJSONStorage, persist } from 'zustand/middleware';
import * as authService from '../services/auth';
import i18n from '../i18n';
import type { EmployeeRole } from '@xundian/shared';

const storage = new MMKV({ id: 'auth-storage' });

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.delete(name),
};

export interface AuthEmployee {
  id: string;
  name: string;
  phone: string;
  role: EmployeeRole;
  company_id: string;
  company_name: string;
}

interface AuthState {
  employee: AuthEmployee | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  language: string;

  login: (companyCode: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  setLanguage: (lang: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      employee: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      language: 'en',

      login: async (companyCode, phone, password) => {
        const response = await authService.login(companyCode, phone, password);
        set({
          employee: response.employee,
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        const token = get().accessToken;
        if (token) {
          authService.logoutServer();
        }
        set({
          employee: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAuth: async () => {
        const token = get().refreshToken;
        if (!token) return false;

        try {
          const response = await authService.refreshToken(token);
          set({
            employee: response.employee,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
          });
          return true;
        } catch {
          set({
            employee: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        employee: state.employee,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        language: state.language,
      }),
    },
  ),
);
