/**
 * SkillForge AI - API Service
 * Axios configuration and API endpoints
 */

import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'}/auth/refresh-token`,
            { refreshToken }
          );

          const { token } = response.data;
          localStorage.setItem('token', token);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - logout user
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  googleAuth: () => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'}/auth/google`,
  githubAuth: () => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'}/auth/github`,
};

// ============================================
// User API
// ============================================
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => {
    if (data instanceof FormData) {
      return api.put('/users/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put('/users/profile', data);
  },
  getPreferences: () => api.get('/users/preferences'),
  updatePreferences: (data) => api.put('/users/preferences', data),
  getStudyTime: (period) => api.get(`/users/study-time${period ? `?period=${period}` : ''}`),
  getAnalytics: () => api.get('/users/analytics'),
  getCareerData: () => api.get('/users/career-data'),
  updateCareerData: (data) => {
    if (data instanceof FormData) {
      return api.put('/users/career-data', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put('/users/career-data', data);
  },
  verifyLeetCode: (data) => api.post('/users/verify-leetcode', data),
  verifyGitHub: (data) => api.post('/users/verify-github', data),
  getOutcomes: () => api.get('/users/outcomes'),
  addOutcome: (data) => api.post('/users/outcomes', data),
  exportData: () => api.get('/users/export'),
  // New dashboard features
  getWeeklyGoal: () => api.get('/users/weekly-goal'),
  updateWeeklyGoal: (data) => api.put('/users/weekly-goal', data),
  getProfileCompletion: () => api.get('/users/profile-completion'),
  getRecentActivity: () => api.get('/users/recent-activity'),
  getNextAction: () => api.get('/users/next-action'),
  heartbeat: (minutes = 1) => api.post('/users/heartbeat', { minutes }),
};

// ============================================
// Roadmaps API
// ============================================
export const roadmapsAPI = {
  getAll: (params) => api.get('/roadmaps', { params }),
  getById: (id) => api.get(`/roadmaps/${id}`),
  getRecommended: () => api.get('/roadmaps/recommended/for-me'),
  enroll: (id) => api.post(`/roadmaps/${id}/enroll`),
  unenroll: (id) => api.delete(`/roadmaps/${id}/unenroll`),
  setCurrent: (id) => api.put(`/roadmaps/${id}/set-current`),
  getProgress: (id) => api.get(`/roadmaps/${id}/progress`),
  getAdaptivePath: (id) => api.get(`/roadmaps/${id}/adaptive-path`),
  getMyEnrolled: () => api.get('/roadmaps/enrolled/my'),
  submitReview: (id, data) => api.post(`/roadmaps/${id}/review`, data),
};

// ============================================
// Topics API
// ============================================
export const topicsAPI = {
  getById: (id) => api.get(`/topics/${id}`),
  getVideo: (id, params) => api.get(`/topics/${id}/video`, { params }),
  startSession: (id) => api.post(`/topics/${id}/start-session`),
  pauseSession: (id, data) => api.post(`/topics/${id}/pause-session`, data),
  resumeSession: (id, data) => api.post(`/topics/${id}/resume-session`, data),
  endSession: (id, data) => api.post(`/topics/${id}/end-session`, data),
  complete: (id, data) => api.post(`/topics/${id}/complete`, data),
};

// ============================================
// Roles API
// ============================================
export const rolesAPI = {
  getAll: (params) => api.get('/roles', { params }),
  getById: (id) => api.get(`/roles/${id}`),
  getSuggestions: (query) => api.get(`/roles/suggestions?q=${encodeURIComponent(query)}`),
  validate: (name) => api.get(`/roles/validate/${encodeURIComponent(name)}`),
  getCategories: () => api.get('/roles/categories/list'),
};

// ============================================
// Programming Languages API
// ============================================
export const languagesAPI = {
  getAll: (params) => api.get('/languages', { params }),
  getById: (id) => api.get(`/languages/${id}`),
  getTopics: (id) => api.get(`/languages/${id}/topics`),
  getTopic: (topicId) => api.get(`/languages/topics/${topicId}`),
  start: (id) => api.post(`/languages/${id}/start`),
  completeTopic: (topicId) => api.post(`/languages/topics/${topicId}/complete`),
  getMyProgress: () => api.get('/languages/my/progress'),
};

// ============================================
// Study Plan API
// ============================================
export const studyPlanAPI = {
  getToday: () => api.get('/study-plan/today'),
  generate: (data) => api.post('/study-plan/generate', data),
  getHistory: (params) => api.get('/study-plan/history', { params }),
  getStats: (params) => api.get('/study-plan/stats', { params }),
  updateTopicStatus: (topicId, data) => api.put(`/study-plan/topic/${topicId}/status`, data),
};

// ============================================
// Tests API
// ============================================
export const testsAPI = {
  start: (data) => api.post('/tests/start', data),
  submit: (attemptId, data) => api.post(`/tests/${attemptId}/submit`, data),
  getTopicAttempts: (topicId) => api.get(`/tests/topic/${topicId}/attempts`),
  getAttempt: (attemptId) => api.get(`/tests/${attemptId}`),
  getOverviewStats: () => api.get('/tests/stats/overview'),
};

// ============================================
// AI API
// ============================================
export const aiAPI = {
  // Teacher
  teacherExplain: (data) => api.post('/ai/teacher/explain', data),

  // Tutor
  tutorGenerateTest: (data) => api.post('/ai/tutor/generate-test', data),
  tutorEvaluate: (data) => api.post('/ai/tutor/evaluate', data),
  tutorSocratic: (data) => api.post('/ai/tutor/socratic', data),
  tutorCodeCritique: (data) => api.post('/ai/tutor/code-critique', data),

  // Mentor
  mentorChat: (data) => api.post('/ai/mentor/chat', data),

  // Interviewer
  interviewerStart: (data) => api.post('/ai/interviewer/start', data),
  interviewerRespond: (sessionId, data) => api.post(`/ai/interviewer/${sessionId}/respond`, data),
  interviewerEnd: (sessionId) => api.post(`/ai/interviewer/${sessionId}/end`),

  // Helper
  helperAnalyze: (formData) => api.post('/ai/helper/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Scheduler
  schedulerGenerate: () => api.post('/ai/scheduler/generate-plan'),

  // Sessions
  getSessions: (params) => api.get('/ai/sessions', { params }),
  getSession: (sessionId) => api.get(`/ai/sessions/${sessionId}`),
};

// ============================================
// Career API
// ============================================
export const careerAPI = {
  // LeetCode
  analyzeLeetCode: (data) => api.post('/career/leetcode/analyze', data),
  getLatestLeetCode: () => api.get('/career/leetcode/latest'),
  getLeetCodeHeatmap: (year) => api.get('/career/leetcode/heatmap', { params: { year } }),
  recordLeetCodeSubmission: (data) => api.post('/career/leetcode/submission', data),

  // GitHub
  analyzeGitHub: (data) => api.post('/career/github/analyze', data),
  getLatestGitHub: () => api.get('/career/github/latest'),
  getGitHubHeatmap: (year) => api.get('/career/github/heatmap', { params: { year } }),

  // Unified Activity
  getUnifiedActivity: (year) => api.get('/career/activity/unified', { params: { year } }),

  // Resume
  analyzeResume: (formData) => api.post('/career/resume/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  reanalyzeResume: (data) => api.post('/career/resume/reanalyze', data),
  getLatestResume: () => api.get('/career/resume/latest'),

  // All
  getAllAnalyses: () => api.get('/career/all'),

  // Career Readiness Score
  getReadinessScore: () => api.get('/career/readiness-score'),
};

// ============================================
// Admin API
// ============================================
export const adminAPI = {
  // Dashboard
  getDashboard: (params) => api.get('/admin/dashboard', { params }),
  getStats: (params) => api.get('/admin/dashboard', { params }),

  // Roles
  getRoles: (params) => api.get('/admin/roles', { params }),
  createRole: (data) => api.post('/admin/roles', data),
  updateRole: (id, data) => api.put(`/admin/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/admin/roles/${id}`),

  // Roadmaps
  getRoadmaps: (params) => api.get('/admin/roadmaps', { params }),
  createRoadmap: (data) => api.post('/admin/roadmaps', data),
  updateRoadmap: (id, data) => api.put(`/admin/roadmaps/${id}`, data),
  deleteRoadmap: (id) => api.delete(`/admin/roadmaps/${id}`),
  publishRoadmap: (id, data) => api.put(`/admin/roadmaps/${id}/publish`, data),
  generateRoadmapTopics: (id, data) => api.post(`/admin/roadmaps/${id}/generate-topics`, data),
  reorderTopics: (id, data) => api.put(`/admin/roadmaps/${id}/topics/reorder`, data),

  // Topics
  getTopics: (params) => api.get('/admin/topics', { params }),
  createTopic: (formData) => api.post('/admin/topics', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateTopic: (id, formData) => api.put(`/admin/topics/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteTopic: (id) => api.delete(`/admin/topics/${id}`),
  generateTopicVideos: (data) => api.post('/admin/topics/generate-videos', data),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
  toggleUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),

  // Test Config
  updateTestConfig: (data) => api.put('/admin/settings/test-config', data),

  // Languages
  getLanguages: (params) => api.get('/admin/languages', { params }),
  createLanguage: (formData) => api.post('/admin/languages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateLanguage: (id, formData) => api.put(`/admin/languages/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteLanguage: (id) => api.delete(`/admin/languages/${id}`),

  // Language Topics
  getLanguageTopics: (languageId, params) => api.get(`/admin/languages/${languageId}/topics`, { params }),
  createLanguageTopic: (languageId, data) => api.post(`/admin/languages/${languageId}/topics`, data),
  updateLanguageTopic: (topicId, data) => api.put(`/admin/language-topics/${topicId}`, data),
  deleteLanguageTopic: (topicId) => api.delete(`/admin/language-topics/${topicId}`),

  // Assessments & Collaboration
  getBadges: () => api.get('/admin/badges'),
  createBadge: (data) => api.post('/admin/badges', data),
  updateBadge: (id, data) => api.put(`/admin/badges/${id}`, data),
  deleteBadge: (id) => api.delete(`/admin/badges/${id}`),

  getProjectSubmissions: () => api.get('/admin/assessments/submissions'),
  updateSubmissionStatus: (id, data) => api.put(`/admin/assessments/submissions/${id}/status`, data),

  getCohorts: () => api.get('/admin/cohorts'),
  createCohort: (data) => api.post('/admin/cohorts', data),
  updateCohort: (id, data) => api.put(`/admin/cohorts/${id}`, data),
  deleteCohort: (id) => api.delete(`/admin/cohorts/${id}`),

  getMentorApplications: () => api.get('/admin/mentors'),
  updateMentorStatus: (id, data) => api.put(`/admin/mentors/${id}/status`, data),
  getOutcomeStats: () => api.get('/admin/outcomes/stats'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getMonitoringSummary: () => api.get('/admin/monitoring/summary'),
};

// ============================================
// Assessments API
// ============================================
export const assessmentsAPI = {
  getMySubmissions: () => api.get('/assessments/submissions'),
  createSubmission: (data) => api.post('/assessments/submissions', data),
  getSubmission: (id) => api.get(`/assessments/submissions/${id}`),
  submitReview: (id, data) => api.post(`/assessments/submissions/${id}/reviews`, data),
  getMyBadges: () => api.get('/assessments/badges'),
  getAvailableBadges: () => api.get('/assessments/badges/available')
};

// ============================================
// Cohorts API
// ============================================
export const cohortsAPI = {
  getAll: () => api.get('/cohorts'),
  getMy: () => api.get('/cohorts/my'),
  join: (id) => api.post(`/cohorts/${id}/join`),
  leave: (id) => api.post(`/cohorts/${id}/leave`)
};

// ============================================
// Mentors API
// ============================================
export const mentorsAPI = {
  getAll: () => api.get('/mentors'),
  getMyApplication: () => api.get('/mentors/me'),
  apply: (data) => api.post('/mentors/apply', data),
  bookSession: (mentorId, data) => api.post(`/mentors/${mentorId}/book`, data),
  getRequests: () => api.get('/mentors/requests'),
  updateRequestStatus: (requestId, data) => api.put(`/mentors/requests/${requestId}`, data)
};

// ============================================
// Analytics API
// ============================================
export const analyticsAPI = {
  getSkillRadar: () => api.get('/analytics/skill-radar'),
  getLearningStyle: () => api.get('/analytics/learning-style'),
  getPredictiveCompletion: (roadmapId) => api.get(`/analytics/predictive-completion/${roadmapId}`),
  getDropOffRisk: () => api.get('/analytics/drop-off-risk'),
};

export default api;

// ============================================
// Community Discussion API
// ============================================
export const communityAPI = {
  getPosts: (params) => api.get('/community/posts', { params }),
  getPost: (id) => api.get(`/community/posts/${id}`),
  createPost: (data) => api.post('/community/posts', data),
  deletePost: (id) => api.delete(`/community/posts/${id}`),
  addComment: (postId, data) => api.post(`/community/posts/${postId}/comments`, data),
  upvotePost: (postId) => api.post(`/community/posts/${postId}/upvote`),
  downvotePost: (postId) => api.post(`/community/posts/${postId}/downvote`),
};

// ============================================
// Leaderboard API
// ============================================
export const leaderboardAPI = {
  getTop: (limit) => api.get(`/leaderboard/top/${limit}`),
  getRank: (userId) => api.get(`/leaderboard/rank/${userId}`),
  getMyRank: () => api.get('/leaderboard/my-rank'),
};

export const badgesAPI = {
  getUserBadges: (userId) => api.get(`/badges/${userId}`),
};
