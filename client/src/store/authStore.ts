import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../config/api';

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  displayName?: string;
  bio?: string;
  country?: string;
  coins: number;
  isProfileComplete: boolean;
  isOnline?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setAuth: (user: User, token: string) => void;
  setUser: (user: Partial<User>) => void;
  clearAuth: () => void;
  refreshToken: () => Promise<boolean>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,

      setAuth: (user, accessToken) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        set({ user, accessToken, isAuthenticated: true });
      },

      setUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },

      clearAuth: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        try {
          const res = await api.post('/auth/refresh');
          const { accessToken } = res.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          set({ accessToken, isAuthenticated: true });
          return true;
        } catch {
          get().clearAuth();
          return false;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        get().clearAuth();
      },

      fetchMe: async () => {
        try {
          set({ isLoading: true });
          const res = await api.get('/auth/me');
          set({ user: res.data.user, isAuthenticated: true });
        } catch {
          get().clearAuth();
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'vault-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
        }
      },
    }
  )
);
