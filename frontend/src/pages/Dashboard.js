import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiAward, FiBook, FiUsers } from 'react-icons/fi';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg mr-3">
                <span className="text-xl font-bold text-white">L</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">LearnSphere</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="font-semibold text-gray-900">{user?.name}</div>
                <div className="text-sm text-gray-500 capitalize">{user?.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FiLogOut className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-gray-600">
            {user?.role === 'learner'
              ? 'Continue your learning journey'
              : 'Manage your courses and students'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-custom p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Total Points</div>
                <div className="text-3xl font-bold text-gray-900">{user?.totalPoints || 0}</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <FiAward className="text-2xl text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-custom p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">
                  {user?.role === 'learner' ? 'Enrolled Courses' : 'Total Courses'}
                </div>
                <div className="text-3xl font-bold text-gray-900">0</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                <FiBook className="text-2xl text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-custom p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">
                  {user?.role === 'learner' ? 'Completed' : 'Students'}
                </div>
                <div className="text-3xl font-bold text-gray-900">0</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <FiUsers className="text-2xl text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-white rounded-xl shadow-custom p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FiBook className="text-4xl text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard Coming Soon
            </h3>
            <p className="text-gray-600 mb-6">
              We're building an amazing dashboard experience for you. Stay tuned for course management, analytics, and more!
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-primary-50 text-primary-700 font-semibold rounded-lg">
              ✨ Authentication Phase Complete!
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
