import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    FiHome, FiBook, FiUsers, FiSettings, FiLogOut, 
    FiMenu, FiX, FiAward, FiPlusCircle, FiBarChart2
} from 'react-icons/fi';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Navigation items based on role
    const getNavItems = () => {
        if (user?.role === 'learner') {
            return [
                { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
                { path: '/courses', icon: FiBook, label: 'Browse Courses' },
                { path: '/my-courses', icon: FiBarChart2, label: 'My Learning' },
                { path: '/badges', icon: FiAward, label: 'Badges' },
            ];
        }
        // Admin & Instructor
        return [
            { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
            { path: '/manage-courses', icon: FiBook, label: 'Courses' },
            { path: '/manage-courses/new', icon: FiPlusCircle, label: 'New Course' },
            ...(user?.role === 'admin' ? [
                { path: '/users', icon: FiUsers, label: 'Users' },
                { path: '/settings', icon: FiSettings, label: 'Settings' },
            ] : []),
        ];
    };

    const navItems = getNavItems();

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar - Desktop */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <Link to="/dashboard" className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg mr-3">
                                <span className="text-xl font-bold text-white">L</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900">LearnSphere</span>
                        </Link>
                        <button 
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                        >
                            <FiX size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                                        isActive 
                                            ? 'bg-primary-50 text-primary-700 font-semibold' 
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <item.icon className="mr-3" size={20} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="p-4 border-t">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{user?.name}</div>
                                <div className="text-sm text-gray-500 capitalize">{user?.role}</div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <FiLogOut className="mr-2" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 lg:ml-64">
                {/* Top Header */}
                <header className="bg-white shadow-sm sticky top-0 z-30">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                        >
                            <FiMenu size={24} />
                        </button>
                        <div className="flex-1 lg:hidden text-center">
                            <span className="font-bold text-gray-900">LearnSphere</span>
                        </div>
                        <div className="hidden lg:flex items-center space-x-4">
                            {user?.role === 'learner' && (
                                <div className="flex items-center px-3 py-1 bg-yellow-50 rounded-full">
                                    <FiAward className="text-yellow-500 mr-1" />
                                    <span className="text-sm font-semibold text-yellow-700">
                                        {user?.totalPoints || 0} Points
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
