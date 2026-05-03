import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  readCookie,
  readAuthUserFromCookie,
  writeAuthUserCookie,
  clearAuthUserCookie,
  AUTH_COOKIE_TOKEN,
  AUTH_COOKIE_USER_TYPE,
} from '../utils/authCookies';

export const useAuthStore = create(
  persist(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,
      userType: null, // 'user' | 'admin'
      isLoading: false,
      error: null,

      // Actions
      setUser: (user, type) => {
        if (user && typeof user === 'object') {
          writeAuthUserCookie(user);
        }
        set({
          user,
          userType: type,
          isAuthenticated: true,
          error: null,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      logout: () => {
        document.cookie = 'portal_logistics_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'portal_logistics_user_type=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        clearAuthUserCookie();

        set({
          user: null,
          isAuthenticated: false,
          userType: null,
          error: null,
        });
      },

      /** Restore session flags + user snapshot from cookies (after refresh or new tab). */
      checkAuth: () => {
        const token = readCookie(AUTH_COOKIE_TOKEN);
        const userType = readCookie(AUTH_COOKIE_USER_TYPE);
        const user = readAuthUserFromCookie();

        if (token && userType) {
          set({
            isAuthenticated: true,
            userType,
            user: user ?? null,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ userType: state.userType }),
    }
  )
);

useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.getState().checkAuth();
});
