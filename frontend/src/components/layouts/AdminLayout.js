/**
 * SkillForge AI - Admin Layout
 * Layout for admin panel pages
 */

import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HiChartPie,
  HiUserGroup,
  HiCollection,
  HiBookOpen,
  HiUsers,
  HiArrowLeft,
  HiCog,
  HiLogout,
  HiMoon,
  HiSun,
  HiBriefcase,
} from 'react-icons/hi';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

const adminNavItems = [
  { name: 'Dashboard', icon: HiChartPie, path: '/admin' },
  { name: 'Roles', icon: HiUserGroup, path: '/admin/roles' },
  { name: 'Roadmaps', icon: HiCollection, path: '/admin/roadmaps' },
  { name: 'Topics', icon: HiBookOpen, path: '/admin/topics' },
  { name: 'Languages', icon: HiBookOpen, path: '/admin/languages' },
  { name: 'Assessments', icon: HiBookOpen, path: '/admin/assessments' },
  { name: 'Badges', icon: HiBookOpen, path: '/admin/badges' },
  { name: 'Mentors', icon: HiUsers, path: '/admin/mentors' },
  { name: 'Outcomes', icon: HiChartPie, path: '/admin/outcomes' },
  { name: 'Monitoring', icon: HiChartPie, path: '/admin/monitoring' },
  { name: 'Audit Logs', icon: HiBookOpen, path: '/admin/audit-logs' },
  { name: 'Companies', icon: HiBriefcase, path: '/admin/companies' },
  { name: 'Users', icon: HiUsers, path: '/admin/users' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { darkMode, toggleDarkMode } = useAppStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border">
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-border">
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500
                              flex items-center justify-center">
                <HiCog className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">Admin Panel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4">
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                              ${location.pathname === item.path
                      ? 'bg-red-500/10 text-foreground border-l-2 border-red-500'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                >
                  <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-red-500' : ''}`} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="px-3 py-4 border-t border-border space-y-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground
                         hover:text-foreground hover:bg-muted/60 transition-all duration-200"
            >
              <HiArrowLeft className="w-5 h-5" />
              <span>Back to App</span>
            </Link>
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border
                          flex items-center justify-between px-6 sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {adminNavItems.find(item => item.path === location.pathname)?.name || 'Admin'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-red-500/50"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-500
                              flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
