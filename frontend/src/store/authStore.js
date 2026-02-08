/**
 * SkillForge AI - Auth Store
 * Zustand store for authentication state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, userAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      // Actions

      /**
       * Initialize auth state from storage
       */
      initialize: async () => {
        const token = localStorage.getItem('token');

        if (token) {
          try {
            set({ isLoading: true });
            const response = await authAPI.getMe();
            set({
              user: response.data.data,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
          } catch (error) {
            // Token invalid - clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
            });
          }
        } else {
          set({ isInitialized: true });
        }
      },

      /**
       * Register a new user
       */
      register: async (userData) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.register(userData);
          const { token, refreshToken, user } = response.data;

          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success('Account created successfully!');
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          console.error('Registration error:', error.response?.data);
          const message = error.response?.data?.message || 'Registration failed';
          const errors = error.response?.data?.errors;
          if (errors && errors.length > 0) {
            errors.forEach(err => toast.error(`${err.field}: ${err.message}`));
          } else {
            toast.error(message);
          }
          return { success: false, error: message };
        }
      },

      /**
       * Login user
       */
      login: async (credentials) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.login(credentials);
          const { token, refreshToken, user } = response.data;

          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          toast.success(`Welcome back, ${user.name}!`);
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          const message = error.response?.data?.message || 'Login failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      /**
       * Handle OAuth callback
       */
      handleOAuthCallback: async (token, refreshToken) => {
        try {
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', refreshToken);

          const response = await authAPI.getMe();

          set({
            user: response.data.data,
            token,
            refreshToken,
            isAuthenticated: true,
          });

          toast.success('Logged in successfully!');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'OAuth login failed';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      /**
       * Logout user
       */
      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          // Ignore logout errors
        }

        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });

        toast.success('Logged out successfully');
      },

      /**
       * Update user profile
       */
      updateProfile: async (data) => {
        try {
          const response = await userAPI.updateProfile(data);
          set({ user: response.data.data });
          toast.success('Profile updated successfully');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Failed to update profile';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      /**
       * Update user preferences
       */
      updatePreferences: async (data) => {
        try {
          const response = await userAPI.updatePreferences(data);
          const payload = response.data.data || {};
          const nextPreferences = payload.preferences || payload;
          set((state) => ({
            user: {
              ...state.user,
              preferences: nextPreferences,
              isOnboarded: true
            }
          }));
          toast.success('Preferences updated successfully');
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Failed to update preferences';
          toast.error(message);
          return { success: false, error: message };
        }
      },

      /**
       * Refresh user data from server
       */
      refreshUser: async () => {
        try {
          const response = await authAPI.getMe();
          set({ user: response.data.data });
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        }
      },

      /**
       * Check if user needs to complete onboarding
       */
      needsOnboarding: () => {
        const { user } = get();
        if (!user) return false;

        return !(user.isOnboarded || (user.preferences?.targetRole && user.preferences?.skillLevel));
      },

      /**
       * Check if user is admin
       */
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
