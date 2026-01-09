'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CurrentUser, AuthTokens, LoginCredentials } from '@/types/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthState {
  // State
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Login failed');
          }

          const tokens: AuthTokens = await response.json();

          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Fetch user details
          await get().fetchUser();
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
          });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        const { accessToken } = get();

        // Call logout endpoint (optional, for audit logging)
        if (accessToken) {
          try {
            await fetch(`${API_BASE}/api/v1/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
          } catch {
            // Ignore errors on logout
          }
        }

        // Clear state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Refresh tokens
      refreshAuth: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          set({ isAuthenticated: false, user: null });
          return false;
        }

        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!response.ok) {
            // Refresh failed, clear auth state
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
            });
            return false;
          }

          const tokens: AuthTokens = await response.json();

          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
          });

          return true;
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      // Fetch current user details
      fetchUser: async () => {
        const { accessToken } = get();

        if (!accessToken) {
          return;
        }

        try {
          const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            if (response.status === 401) {
              // Token expired, try to refresh
              const refreshed = await get().refreshAuth();
              if (refreshed) {
                // Retry with new token
                await get().fetchUser();
              }
            }
            return;
          }

          const user: CurrentUser = await response.json();
          set({ user, isAuthenticated: true });
        } catch {
          // Silently fail user fetch
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Set loading state
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'xeeno-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper hook to get auth headers for API calls
export function useAuthHeaders(): Record<string, string> {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!accessToken) {
    return {};
  }

  return {
    'Authorization': `Bearer ${accessToken}`,
  };
}

// Non-hook version for use outside components
export function getAuthHeaders(): Record<string, string> {
  const state = useAuthStore.getState();

  if (!state.accessToken) {
    return {};
  }

  return {
    'Authorization': `Bearer ${state.accessToken}`,
  };
}
