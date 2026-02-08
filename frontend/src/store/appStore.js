/**
 * SkillForge AI - App Store
 * Zustand store for general app state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { roadmapsAPI, studyPlanAPI, userAPI } from '../services/api';

const calculateEnrollmentProgress = (enrollment) => {
  if (!enrollment) return 0;

  const explicit = enrollment.progressPercentage ?? enrollment.progress;
  if (typeof explicit === 'number' && !Number.isNaN(explicit)) return explicit;

  const completed = enrollment.completedTopics?.length ?? enrollment.completedTopicsCount ?? 0;
  const total = enrollment.roadmap?.topics?.length ?? enrollment.totalTopics ?? 0;

  if (!total) return 0;
  return Math.round((completed / total) * 100);
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') return true;
  if (window.localStorage?.getItem('skillforge-theme')) {
    return window.localStorage.getItem('skillforge-theme') === 'dark';
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
};

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Sidebar state
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Theme
      darkMode: getInitialTheme(),
      setDarkMode: (value) => set({ darkMode: value }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  // Enrolled roadmaps
  enrolledRoadmaps: [],
  currentRoadmap: null,
  loadingRoadmaps: false,

  fetchEnrolledRoadmaps: async () => {
    try {
      set({ loadingRoadmaps: true });
      const response = await roadmapsAPI.getMyEnrolled();
      const roadmaps = response.data.data;
      const normalizedRoadmaps = roadmaps.map((enrollment) => ({
        ...enrollment,
        progressPercentage: calculateEnrollmentProgress(enrollment),
      }));
      const current = normalizedRoadmaps.find(r => r.isCurrent || r.status === 'current');

      set({
        enrolledRoadmaps: normalizedRoadmaps,
        currentRoadmap: current || normalizedRoadmaps[0] || null,
        loadingRoadmaps: false,
      });
    } catch (error) {
      console.error('Failed to fetch enrolled roadmaps:', error);
      set({ loadingRoadmaps: false });
    }
  },

  // Today's study plan
  todaysPlan: null,
  loadingPlan: false,

  fetchTodaysPlan: async () => {
    try {
      set({ loadingPlan: true });
      const response = await studyPlanAPI.getToday();
      set({
        todaysPlan: response.data.data,
        loadingPlan: false,
      });
    } catch (error) {
      console.error('Failed to fetch today\'s plan:', error);
      set({ loadingPlan: false, todaysPlan: null });
    }
  },

  // Study time stats
  studyTimeStats: null,
  loadingStudyTime: false,

  fetchStudyTimeStats: async (period = 'week') => {
    try {
      set({ loadingStudyTime: true });
      const response = await userAPI.getStudyTime(period);
      set({
        studyTimeStats: response.data.data,
        loadingStudyTime: false,
      });
    } catch (error) {
      console.error('Failed to fetch study time stats:', error);
      set({ loadingStudyTime: false });
    }
  },

  // Active time tracking session
  activeSession: null,
  sessionTimer: null,
  sessionDuration: 0,

  startSession: (topicId) => {
    // Clear any existing timer
    const { sessionTimer } = get();
    if (sessionTimer) clearInterval(sessionTimer);

    const timer = setInterval(() => {
      set((state) => ({ sessionDuration: state.sessionDuration + 1 }));
    }, 1000);

    set({
      activeSession: topicId,
      sessionTimer: timer,
      sessionDuration: 0,
    });
  },

  pauseSession: () => {
    const { sessionTimer } = get();
    if (sessionTimer) clearInterval(sessionTimer);
    set({ sessionTimer: null });
  },

  resumeSession: () => {
    const timer = setInterval(() => {
      set((state) => ({ sessionDuration: state.sessionDuration + 1 }));
    }, 1000);
    set({ sessionTimer: timer });
  },

  endSession: () => {
    const { sessionTimer } = get();
    if (sessionTimer) clearInterval(sessionTimer);
    set({
      activeSession: null,
      sessionTimer: null,
      sessionDuration: 0,
    });
  },

  // Notifications
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    set((state) => ({
      notifications: [
        { id: Date.now(), ...notification, read: false },
        ...state.notifications
      ],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  // Modal state
  modals: {
    roleSelection: false,
    preferences: false,
    roadmapEnroll: false,
    testStart: false,
  },

  openModal: (modalName) => {
    set((state) => ({
      modals: { ...state.modals, [modalName]: true }
    }));
  },

  closeModal: (modalName) => {
    set((state) => ({
      modals: { ...state.modals, [modalName]: false }
    }));
  },

  // Search
  globalSearchQuery: '',
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

  // Loading states
  globalLoading: false,
      setGlobalLoading: (loading) => set({ globalLoading: loading }),
    }),
    {
      name: 'skillforge-app-store',
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

export default useAppStore;
