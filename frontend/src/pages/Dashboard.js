import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/courseService';
import { FiAward, FiBook, FiUsers, FiTrendingUp, FiPlus, FiArrowRight } from 'react-icons/fi';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'learner') {
            fetchStats();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const response = await courseService.getStats();
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
                    <h1 className="text-2xl font-bold mb-2">
                        Welcome back, {user?.name}! 👋
                    </h1>
                    <p className="text-primary-100">
                        {user?.role === 'learner'
                            ? 'Continue your learning journey and earn more badges!'
                            : 'Manage your courses and track student progress'}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {user?.role === 'learner' ? (
                        <>
                            {/* Learner Stats */}
                            <div className="bg-white rounded-xl shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Total Points</div>
                                        <div className="text-2xl font-bold text-gray-900">{user?.totalPoints || 0}</div>
                                    </div>
                                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                        <FiAward className="text-yellow-600" size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Enrolled Courses</div>
                                        <div className="text-2xl font-bold text-gray-900">0</div>
                                    </div>
                                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                        <FiBook className="text-primary-600" size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Completed</div>
                                        <div className="text-2xl font-bold text-gray-900">0</div>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                        <FiTrendingUp className="text-green-600" size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Badges Earned</div>
                                        <div className="text-2xl font-bold text-gray-900">0</div>
                                    </div>
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <FiAward className="text-purple-600" size={24} />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Admin/Instructor Stats */}
                            <div className="bg-white rounded-xl shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Total Courses</div>
                                        <div className="text-2xl font-bold text-gray-900">{stats?.total_courses || 0}</div>
                                    </div>
                                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                        <FiBook className="text-primary-600" size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Published</div>
                                        <div className="text-2xl font-bold text-green-600">{stats?.published_courses || 0}</div>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                        <FiTrendingUp className="text-green-600" size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Total Students</div>
                                        <div className="text-2xl font-bold text-gray-900">{stats?.total_enrollments || 0}</div>
                                    </div>
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <FiUsers className="text-purple-600" size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-gray-500">Avg. Rating</div>
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {parseFloat(stats?.avg_rating || 0).toFixed(1)} ⭐
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                                        <FiAward className="text-yellow-600" size={24} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {user?.role === 'learner' ? (
                        <>
                            {/* Learner Quick Actions */}
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Continue Learning</h2>
                                <div className="text-center py-8 text-gray-500">
                                    <FiBook className="mx-auto mb-3" size={40} />
                                    <p>No courses in progress</p>
                                    <Link 
                                        to="/courses" 
                                        className="inline-flex items-center mt-4 text-primary-600 font-medium hover:text-primary-700"
                                    >
                                        Browse Courses <FiArrowRight className="ml-1" />
                                    </Link>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Badges</h2>
                                <div className="text-center py-8 text-gray-500">
                                    <FiAward className="mx-auto mb-3" size={40} />
                                    <p>Complete courses to earn badges!</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Admin/Instructor Quick Actions */}
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <Link
                                        to="/manage-courses/new"
                                        className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors"
                                    >
                                        <FiPlus className="text-primary-600 mb-2" size={24} />
                                        <span className="text-sm font-medium text-gray-700">New Course</span>
                                    </Link>
                                    <Link
                                        to="/manage-courses"
                                        className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors"
                                    >
                                        <FiBook className="text-primary-600 mb-2" size={24} />
                                        <span className="text-sm font-medium text-gray-700">View Courses</span>
                                    </Link>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                                <div className="text-center py-8 text-gray-500">
                                    <FiTrendingUp className="mx-auto mb-3" size={40} />
                                    <p>No recent activity</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
