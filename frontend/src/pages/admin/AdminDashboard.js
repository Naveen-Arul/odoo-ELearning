/**
 * SkillForge AI - Admin Dashboard
 * Overview of platform statistics
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiUsers, HiAcademicCap, HiBookOpen, HiBriefcase,
  HiTrendingUp, HiClock, HiChartBar, HiArrowUp, HiArrowDown
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchStats();
    fetchRecentUsers();
  }, [timeRange]);

  const getMockStats = () => ({
    users: { total: 1250, new: 48, growth: 12.5 },
    roadmaps: { total: 25, active: 23 },
    topics: { total: 350, completed: 12500 },
    roles: { total: 45 },
    studyTime: { total: 125000, average: 45 },
    enrollments: { total: 3200, thisWeek: 150 },
    dailyUsers: [120, 145, 132, 168, 155, 142, 178],
    completionRate: [65, 68, 72, 70, 75, 78, 82],
    topRoadmaps: [
      { name: 'Frontend Developer', enrollments: 450 },
      { name: 'Backend Developer', enrollments: 380 },
      { name: 'Full Stack', enrollments: 320 },
      { name: 'DevOps Engineer', enrollments: 250 },
      { name: 'Data Scientist', enrollments: 200 }
    ],
    recentUsers: [
      { name: 'John Doe', email: 'john@example.com', joinedAt: new Date() },
      { name: 'Jane Smith', email: 'jane@example.com', joinedAt: new Date() }
    ]
  });

  const mapDashboardResponse = (payload) => {
    const stats = payload?.stats || {};
    const popularRoadmaps = payload?.popularRoadmaps || [];
    const dailyActiveUsersData = payload?.dailyActiveUsers || [];
    const dailyRegistrationsData = payload?.dailyRegistrations || [];
    const dayLabelsData = payload?.dayLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const mock = getMockStats();

    return {
      users: {
        total: stats.totalUsers || 0,
        new: stats.newUsersToday || 0,
        growth: 0
      },
      roadmaps: {
        total: stats.totalRoadmaps || 0,
        active: stats.totalRoadmaps || 0
      },
      topics: {
        total: stats.totalTopics || 0,
        completed: 0
      },
      roles: {
        total: stats.totalRoles || 0
      },
      studyTime: {
        total: 0,
        average: 0
      },
      enrollments: {
        total: 0,
        thisWeek: 0
      },
      dailyUsers: dailyActiveUsersData.length > 0 ? dailyActiveUsersData : mock.dailyUsers,
      dailyRegistrations: dailyRegistrationsData,
      dayLabels: dayLabelsData,
      completionRate: mock.completionRate,
      topRoadmaps: popularRoadmaps.length
        ? popularRoadmaps.map((roadmap) => ({
          name: roadmap.title,
          enrollments: roadmap.stats?.enrollmentCount || 0
        }))
        : mock.topRoadmaps,
      recentUsers: mock.recentUsers
    };
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboard({ timeRange });
      setStats(mapDashboardResponse(response.data.data));
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Mock data for development
      setStats(getMockStats());
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const response = await adminAPI.getUsers({
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 5
      });
      setRecentUsers(response.data.data?.users || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch recent users:', error);
      setRecentUsers([]);
    }
  };

  const dailyUsersData = {
    labels: stats?.dayLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Active Users',
      data: stats?.dailyUsers || [],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const completionData = {
    labels: stats?.topRoadmaps?.map(r => r.name) || [],
    datasets: [{
      label: 'Enrollments',
      data: stats?.topRoadmaps?.map(r => r.enrollments) || [],
      backgroundColor: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
      borderRadius: 8
    }]
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400 mt-1">Overview of platform performance</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="input py-2 w-40"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={HiUsers}
          label="Total Users"
          value={stats?.users?.total || 0}
          change={stats?.users?.growth || 0}
          color="primary"
        />
        <StatCard
          icon={HiAcademicCap}
          label="Roadmaps"
          value={stats?.roadmaps?.total || 0}
          subtext={`${stats?.roadmaps?.active || 0} active`}
          color="secondary"
        />
        <StatCard
          icon={HiBookOpen}
          label="Topics Completed"
          value={stats?.topics?.completed || 0}
          color="accent"
        />
        <StatCard
          icon={HiClock}
          label="Study Hours"
          value={Math.round((stats?.studyTime?.total || 0) / 60)}
          subtext={`${stats?.studyTime?.average || 0}m avg/user`}
          color="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Users Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Daily Active Users</h2>
          <Line
            data={dailyUsersData}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false }
              },
              scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
              }
            }}
          />
        </div>

        {/* Top Roadmaps Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Roadmaps</h2>
          <Bar
            data={completionData}
            options={{
              responsive: true,
              indexAxis: 'y',
              plugins: {
                legend: { display: false }
              },
              scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { display: false }, ticks: { color: '#9ca3af' } }
              }
            }}
          />
        </div>
      </div>

      {/* Quick Links & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/roadmaps"
              className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors"
            >
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <HiAcademicCap className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-white font-medium">Manage Roadmaps</p>
                <p className="text-dark-500 text-sm">Add or edit roadmaps</p>
              </div>
            </Link>
            <Link
              to="/admin/topics"
              className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors"
            >
              <div className="w-10 h-10 bg-secondary-500/20 rounded-lg flex items-center justify-center">
                <HiBookOpen className="w-5 h-5 text-secondary-400" />
              </div>
              <div>
                <p className="text-white font-medium">Manage Topics</p>
                <p className="text-dark-500 text-sm">Add videos and content</p>
              </div>
            </Link>
            <Link
              to="/admin/roles"
              className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors"
            >
              <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
                <HiBriefcase className="w-5 h-5 text-accent-400" />
              </div>
              <div>
                <p className="text-white font-medium">Manage Roles</p>
                <p className="text-dark-500 text-sm">Career roles and keywords</p>
              </div>
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors"
            >
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <HiUsers className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium">Manage Users</p>
                <p className="text-dark-500 text-sm">View and manage users</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Users */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Users</h2>
            <Link to="/admin/users" className="text-primary-400 text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {recentUsers.map((user, index) => (
                  <tr key={user._id || index} className="text-sm">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                          <span className="text-primary-400 font-medium">
                            {user.name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <span className="text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-dark-400">{user.email}</td>
                    <td className="py-3 text-dark-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <span className={`badge ${user.isActive !== false ? 'badge-accent' : 'badge-red-500'}`}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, change, subtext, color }) {
  const colors = {
    primary: 'bg-primary-500/20 text-primary-400',
    secondary: 'bg-secondary-500/20 text-secondary-400',
    accent: 'bg-accent-500/20 text-accent-400',
    warning: 'bg-amber-500/20 text-amber-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
    >
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-dark-400 text-sm">{label}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm mt-1 ${change >= 0 ? 'text-accent-400' : 'text-red-400'
          }`}>
          {change >= 0 ? <HiArrowUp className="w-3 h-3" /> : <HiArrowDown className="w-3 h-3" />}
          <span>{Math.abs(change)}%</span>
        </div>
      )}
      {subtext && (
        <p className="text-dark-500 text-xs mt-1">{subtext}</p>
      )}
    </motion.div>
  );
}
