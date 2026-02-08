/**
 * SkillForge AI - Main App Component
 * Routes and layout configuration
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

// Layout Components
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OAuthCallback from './pages/auth/OAuthCallback';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Main Pages
import Dashboard from './pages/Dashboard';
import RoadmapsPage from './pages/RoadmapsPage';
import RoadmapDetail from './pages/RoadmapDetail';
import TopicPage from './pages/TopicPage';
import LanguagesPage from './pages/LanguagesPage';
import LanguageDetail from './pages/LanguageDetail';
import StudyPlanPage from './pages/StudyPlanPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import CareerPage from './pages/CareerPage';
import CareerDashboard from './pages/CareerDashboard';

// AI Pages
import AITeacher from './pages/ai/AITeacher';
import AITutor from './pages/ai/AITutor';
import AIMentor from './pages/ai/AIMentor';
import AIInterviewer from './pages/ai/AIInterviewer';
import AIHelper from './pages/ai/AIHelper';
import MentorInbox from './pages/MentorInbox';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoles from './pages/admin/AdminRoles';
import AdminRoadmaps from './pages/admin/AdminRoadmaps';
import AdminTopics from './pages/admin/AdminTopics';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLanguages from './pages/admin/AdminLanguages';
import AdminAssessments from './pages/admin/AdminAssessments';
import AdminBadges from './pages/admin/AdminBadges';
import AdminCohorts from './pages/admin/AdminCohorts';
import AdminMentors from './pages/admin/AdminMentors';
import AdminOutcomes from './pages/admin/AdminOutcomes';
import AdminMonitoring from './pages/admin/AdminMonitoring';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

// Onboarding
import OnboardingPage from './pages/OnboardingPage';
import AssessmentsPage from './pages/AssessmentsPage';
import CommunityPage from './pages/CommunityPage';
import OutcomesPage from './pages/OutcomesPage';

// Social & Collaboration
import ChatPage from './pages/ChatPage';
import StudyRoomsPage from './pages/StudyRoomsPage';
import StudyRoomDetail from './pages/StudyRoomDetail';

// Gamification & Career
import LeaderboardPage from './pages/LeaderboardPage';
import CertificatesPage from './pages/CertificatesPage';
import JobBoardPage from './pages/JobBoardPage';
import JobDetailPage from './pages/JobDetailPage';

// Recruiter Pages
import RecruiterDashboard from './pages/RecruiterDashboard';
import RecruiterJobDetail from './pages/RecruiterJobDetail';
import CompanyDashboard from './pages/company/CompanyDashboard'; // Corrected path
import CompanyManagement from './pages/admin/CompanyManagement'; // New admin page

// Components
import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import SessionTracker from './components/SessionTracker';

function App() {
  const { isAuthenticated, isInitialized, initialize, needsOnboarding } = useAuthStore();
  const { darkMode } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      localStorage.setItem('skillforge-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      localStorage.setItem('skillforge-theme', 'light');
    }
  }, [darkMode]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <>
      {/* Hidden Session Time Tracker */}
      {isAuthenticated && <SessionTracker />}

      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          } />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
        </Route>

        {/* Onboarding Route */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        } />

        {/* Main App Routes */}
        <Route element={
          <ProtectedRoute>
            {needsOnboarding() ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <MainLayout />
            )}
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Roadmaps */}
          <Route path="/roadmaps" element={<RoadmapsPage />} />
          <Route path="/roadmaps/:id" element={<RoadmapDetail />} />
          <Route path="/topics/:id" element={<TopicPage />} />

          {/* Languages */}
          <Route path="/languages" element={<LanguagesPage />} />
          <Route path="/languages/:id" element={<LanguageDetail />} />

          {/* Study Plan */}
          <Route path="/study-plan" element={<StudyPlanPage />} />

          {/* Profile & Settings */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Assessments & Community */}
          <Route path="/assessments" element={<AssessmentsPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/outcomes" element={<OutcomesPage />} />

          {/* Social Features */}
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/study-rooms" element={<StudyRoomsPage />} />
          <Route path="/study-rooms/:id" element={<StudyRoomDetail />} />


          {/* Gamification */}
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          {/* Career Extra */}
          <Route path="/certificates" element={<CertificatesPage />} />
          <Route path="/jobs" element={<JobBoardPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailPage />} />

          {/* Recruiter */}
          <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
          <Route path="/recruiter/job/:jobId" element={<RecruiterJobDetail />} />

          {/* Company Admin */}
          <Route path="/company-dashboard" element={<CompanyDashboard />} />

          {/* Career */}
          <Route path="/career" element={<CareerPage />} />
          <Route path="/career/dashboard" element={<CareerDashboard />} />

          {/* AI Features */}
          <Route path="/ai/teacher" element={<AITeacher />} />
          <Route path="/ai/tutor" element={<AITutor />} />
          <Route path="/ai/mentor" element={<AIMentor />} />
          <Route path="/ai/interviewer" element={<AIInterviewer />} />
          <Route path="/ai/helper" element={<AIHelper />} />
          <Route path="/mentor/inbox" element={<MentorInbox />} />
        </Route>

        {/* Admin Routes */}
        <Route element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/roles" element={<AdminRoles />} />
          <Route path="/admin/roadmaps" element={<AdminRoadmaps />} />
          <Route path="/admin/topics" element={<AdminTopics />} />
          <Route path="/admin/languages" element={<AdminLanguages />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/assessments" element={<AdminAssessments />} />
          <Route path="/admin/badges" element={<AdminBadges />} />
          <Route path="/admin/mentors" element={<AdminMentors />} />
          <Route path="/admin/outcomes" element={<AdminOutcomes />} />
          <Route path="/admin/monitoring" element={<AdminMonitoring />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
          <Route path="/admin/companies" element={<CompanyManagement />} />
        </Route>

        {/* Default Redirects */}
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />

        {/* 404 Page */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="text-center">
              <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
              <p className="text-muted-foreground mb-8">Page not found</p>
              <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
            </div>
          </div>
        } />
      </Routes>
    </>
  );
}

export default App;
