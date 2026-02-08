/**
 * SkillForge AI - Main Layout
 * Dashboard layout with sidebar and header
 */

import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiHome,
  HiAcademicCap,
  HiCode,
  HiCalendar,
  HiUser,
  HiCog,
  HiBriefcase,
  HiChartBar,
  HiMenuAlt2,
  HiX,
  HiBell,
  HiSearch,
  HiLogout,
  HiLightBulb,
  HiChatAlt2,
  HiUserGroup,
  HiQuestionMarkCircle,
  HiDocumentText,
  HiMoon,
  HiSun,
  HiStar,
} from 'react-icons/hi';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// Socket URL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// Navigation items
const dsaVisualizerUrl = process.env.REACT_APP_DSA_URL || 'http://localhost:3001';

const mainNavItems = [
  { name: 'Dashboard', icon: HiHome, path: '/dashboard' },
  { name: 'Roadmaps', icon: HiAcademicCap, path: '/roadmaps' },
  { name: 'Learn Languages', icon: HiCode, path: '/languages' },
  { name: 'Assessments', icon: HiDocumentText, path: '/assessments' },
  { name: 'Community', icon: HiUserGroup, path: '/community' },
  { name: 'DSA Visualizer', icon: HiQuestionMarkCircle, path: dsaVisualizerUrl, external: true },
];

const aiNavItems = [
  { name: 'AI Teacher', icon: HiLightBulb, path: '/ai/teacher' },
  { name: 'AI Tutor', icon: HiChartBar, path: '/ai/tutor' },
  { name: 'AI Mentor', icon: HiChatAlt2, path: '/ai/mentor' },
  { name: 'Mock Interview', icon: HiUserGroup, path: '/ai/interviewer' },
  { name: 'AI Helper', icon: HiDocumentText, path: '/ai/helper' },
];

const socialNavItems = [
  { name: 'Chat', icon: HiChatAlt2, path: '/chat' },
  { name: 'Study Rooms', icon: HiUserGroup, path: '/study-rooms' },
];

const careerNavItems = [
  { name: 'Career Tools', icon: HiBriefcase, path: '/career' },
];

const bottomNavItems = [
  { name: 'Profile', icon: HiUser, path: '/profile' },
  { name: 'Outcomes', icon: HiChartBar, path: '/outcomes' },
  { name: 'Settings', icon: HiCog, path: '/settings' },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuthStore();
  const { sidebarOpen, toggleSidebar, darkMode, toggleDarkMode } = useAppStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Gamification Socket Listener
  React.useEffect(() => {
    if (!user?._id) return;

    const socket = io(SOCKET_URL);
    socket.emit('register-user', user._id);

    socket.on('gamification_update', (data) => {
      // Show generic XP toast or specific Level Up / Badge toast
      if (data.leveledUp) {
        toast.success(`🎉 Level Up! You reached Level ${data.level}!`, { duration: 5000 });
      } else if (data.xpAdded > 0) {
        // Optional: reduce noise by only showing for large gains or badges
        // toast.success(`+${data.xpAdded} XP`, { icon: '⚡' });
      }

      if (data.newBadges && data.newBadges.length > 0) {
        data.newBadges.forEach(badge => {
          toast.success(
            <div className="flex flex-col">
              <span className="font-bold">New Badge Unlocked!</span>
              <span className="text-sm">{badge.icon} {badge.name}</span>
            </div>,
            { duration: 5000 }
          );
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <OfflineBanner />
      {/* Sidebar Overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border
                    transform transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-dark-800">
                <img
                  src="/logo/logo512.png"
                  alt="LearnSphere"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-bold text-foreground">LearnSphere</span>
            </Link>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1 text-muted-foreground hover:text-foreground"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto hide-scrollbar">
            {user?.role === 'recruiter' ? (
              <div className="space-y-1">
                <NavLink
                  item={{ name: 'Dashboard', icon: HiHome, path: '/recruiter-dashboard' }}
                  isActive={location.pathname === '/recruiter-dashboard'}
                />
              </div>
            ) : user?.role === 'company_admin' ? (
              <div className="space-y-1">
                <NavLink
                  item={{ name: 'Dashboard', icon: HiHome, path: '/company-dashboard' }}
                  isActive={location.pathname === '/company-dashboard'}
                />
              </div>
            ) : (
              <>
                {/* Main Navigation */}
                <div className="space-y-1">
                  {mainNavItems.map((item) => (
                    <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
                  ))}
                  <NavLink item={{ name: 'Leaderboard', icon: HiStar, path: '/leaderboard' }} isActive={location.pathname === '/leaderboard'} />
                </div>

                {/* Social & Community */}
                <div className="mt-6">
                  <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Social
                  </h3>
                  <div className="space-y-1">
                    {socialNavItems.map((item) => (
                      <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
                    ))}
                  </div>
                </div>

                {/* Career */}
                <div className="mt-6">
                  <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Career
                  </h3>
                  <div className="space-y-1">
                    {careerNavItems.map((item) => (
                      <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
                    ))}
                  </div>
                </div>

                {/* AI Features Section */}
                <div className="mt-6">
                  <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    AI Features
                  </h3>
                  <div className="space-y-1">
                    {aiNavItems.map((item) => (
                      <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Admin Link */}
            {isAdmin() && (
              <div className="mt-6">
                <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Admin
                </h3>
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground
                             hover:text-foreground hover:bg-muted/60 transition-all duration-200"
                >
                  <HiCog className="w-5 h-5" />
                  <span>Admin Panel</span>
                </Link>
              </div>
            )}
          </nav>

          {/* Bottom Navigation */}
          <div className="px-3 py-4 border-t border-border">
            <div className="space-y-1">
              {bottomNavItems
                .filter(item => {
                  // Hide Outcomes and Profile for recruiters and company admins
                  if ((item.name === 'Outcomes' || item.name === 'Profile') && (user?.role === 'recruiter' || user?.role === 'company_admin')) {
                    return false;
                  }
                  return true;
                })
                .map((item) => (
                  <NavLink key={item.path} item={item} isActive={location.pathname === item.path} />
                ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground
                           hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              >
                <HiLogout className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border
                          flex items-center justify-between px-4 sticky top-0 z-30">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 lg:hidden"
            >
              <HiMenuAlt2 className="w-5 h-5" />
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role === 'recruiter' ? 'Recruiter' :
                    user?.role === 'company_admin' ? 'Company Admin' :
                      (user?.preferences?.targetRole?.name || user?.preferences?.targetRole || 'Student')}
                </p>
              </div>
              <Link to="/profile">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="avatar">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-black text-sm text-center py-2">
      You’re offline. Some features may be unavailable.
    </div>
  );
}

// Navigation Link Component
function NavLink({ item, isActive }) {
  const className = `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                  ${isActive
      ? 'bg-primary/10 text-foreground border-l-2 border-primary'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
    }`;

  if (item.external) {
    return (
      <a href={item.path} className={className}>
        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
        <span>{item.name}</span>
      </a>
    );
  }

  return (
    <Link
      to={item.path}
      className={className}
    >
      <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
      <span>{item.name}</span>
    </Link>
  );
}
