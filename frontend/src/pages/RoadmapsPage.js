/**
 * SkillForge AI - Roadmaps Page
 * Browse and enroll in learning roadmaps
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiSearch,
  HiFilter,
  HiAcademicCap,
  HiClock,
  HiUsers,
  HiChevronRight,
  HiBookOpen,
  HiCheck,
  HiPlus,
} from 'react-icons/hi';
import { roadmapsAPI } from '../services/api';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export default function RoadmapsPage() {
  const { enrolledRoadmaps, fetchEnrolledRoadmaps } = useAppStore();
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [showOnlyMyRole, setShowOnlyMyRole] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const socketRef = React.useRef(null);

  const categories = ['all', 'Frontend', 'Backend', 'Full Stack', 'DevOps', 'Data Science', 'Mobile', 'AI/ML'];
  const levels = ['all', 'beginner', 'intermediate', 'advanced'];

  const activeRoadmaps = enrolledRoadmaps.filter(r => r.status !== 'completed' && (r.progressPercentage || 0) < 100);
  const completedRoadmaps = enrolledRoadmaps.filter(r => r.status === 'completed' || (r.progressPercentage || 0) >= 100);

  useEffect(() => {
    fetchRoadmaps();
    fetchEnrolledRoadmaps();

    // Real-time updates
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on('roadmap_stats_updated', (data) => {
      setRoadmaps(prev => prev.map(r =>
        r._id === data.roadmapId ? {
          ...r,
          stats: data.stats,
          // Ensure backwards compatibility
          enrollmentCount: data.stats.enrollmentCount
        } : r
      ));
    });

    return () => {
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedLevel, showOnlyMyRole]);

  const fetchRoadmaps = async () => {
    try {
      setLoading(true);

      // If showing only my role, fetch role-specific roadmaps
      if (showOnlyMyRole) {
        try {
          const response = await roadmapsAPI.getRecommended();
          const recommended = response.data.data || [];
          setRoadmaps(recommended);
          if (response.data.roleInfo) {
            setUserRole(response.data.roleInfo.roleName);
          }
          if (recommended.length > 0) {
            return;
          }
        } catch (error) {
          // If not authenticated or no role set, fall back to all roadmaps
          console.log('Fetching all roadmaps...');
        }
      }

      // Fetch all roadmaps with filters
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedLevel !== 'all') params.level = selectedLevel;
      if (searchQuery) params.search = searchQuery;

      const response = await roadmapsAPI.getAll(params);
      setRoadmaps(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch roadmaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRoadmaps();
  };

  const handleEnroll = async (roadmapId) => {
    if (enrolledRoadmaps.length >= 3) {
      toast.error('You can only enroll in 3 roadmaps at a time');
      return;
    }

    try {
      await roadmapsAPI.enroll(roadmapId);
      toast.success('Enrolled successfully!');
      fetchEnrolledRoadmaps();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enroll');
    }
  };

  const isEnrolled = (roadmapId) => {
    return enrolledRoadmaps.some(r => r.roadmap?._id === roadmapId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Learning Roadmaps</h1>
          <p className="text-dark-400 mt-1">
            Choose a roadmap and start your learning journey
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-dark-400">
            Enrolled: <span className="text-white font-medium">{enrolledRoadmaps.length}/3</span>
          </span>
        </div>
      </div>

      {/* Enrolled Roadmaps */}
      {/* Active Roadmaps */}
      {activeRoadmaps.length > 0 && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Active Roadmaps</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {activeRoadmaps.map((enrollment) => (
              <EnrollmentCard key={enrollment._id} enrollment={enrollment} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Roadmaps */}
      {completedRoadmaps.length > 0 && (
        <div className="card p-4 border-l-4 border-l-green-500">
          <h2 className="text-lg font-semibold text-white mb-4">Completed Journeys 🏆</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {completedRoadmaps.map((enrollment) => (
              <EnrollmentCard key={enrollment._id} enrollment={enrollment} isCompleted />
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 pr-20"
                placeholder="Search roadmaps..."
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary btn-sm"
              >
                Search
              </button>
            </div>
          </form>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <HiFilter className="w-5 h-5 text-dark-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input py-2 w-40"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="input py-2 w-40"
          >
            <option value="all">All Levels</option>
            {levels.slice(1).map((level) => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Role-Based Filter Toggle */}
        <div className="mt-4 flex items-center gap-4 pt-4 border-t border-dark-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyMyRole}
              onChange={(e) => setShowOnlyMyRole(e.target.checked)}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 cursor-pointer"
            />
            <span className="text-dark-300">
              {showOnlyMyRole && userRole
                ? `Show only ${userRole} roadmaps`
                : 'Show roadmaps for my target role'}
            </span>
          </label>
        </div>
      </div>

      {/* Roadmaps Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-dark-700 rounded w-3/4 mb-4" />
              <div className="h-3 bg-dark-700 rounded w-full mb-2" />
              <div className="h-3 bg-dark-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : roadmaps.length === 0 ? (
        <div className="card p-12 text-center">
          <HiBookOpen className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No roadmaps found</h3>
          <p className="text-dark-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roadmaps.map((roadmap, index) => (
            <motion.div
              key={roadmap._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-hover p-6 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20
                                flex items-center justify-center text-primary-400 flex-shrink-0">
                  <HiAcademicCap className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-lg mb-1 line-clamp-2">
                    {roadmap.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge-secondary">{roadmap.category}</span>
                    <span className={`badge ${roadmap.level === 'beginner' ? 'badge-accent' :
                      roadmap.level === 'intermediate' ? 'badge-warning' : 'badge-danger'
                      }`}>
                      {roadmap.level}
                    </span>
                    <span className={`badge ${roadmap.isActive ? 'badge-accent' : 'badge-secondary'}`}>
                      {roadmap.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-dark-400 text-sm mb-4 line-clamp-2 flex-1">
                {roadmap.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-dark-400 mb-4">
                <div className="flex items-center gap-1">
                  <HiBookOpen className="w-4 h-4" />
                  <span>{roadmap.topics?.length || 0} topics</span>
                </div>
                <div className="flex items-center gap-1">
                  <HiClock className="w-4 h-4" />
                  <span>{roadmap.estimatedDuration || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HiUsers className="w-4 h-4" />
                  <span>{roadmap.stats?.enrollmentCount ?? roadmap.enrollmentCount ?? 0} enrolled</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  to={`/roadmaps/${roadmap._id}`}
                  className="btn-secondary flex-1 justify-center"
                >
                  View Details
                  <HiChevronRight className="w-4 h-4 ml-1" />
                </Link>
                {isEnrolled(roadmap._id) ? (
                  <button
                    disabled
                    className="btn bg-accent-500/20 text-accent-400 cursor-default"
                  >
                    <HiCheck className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnroll(roadmap._id)}
                    disabled={enrolledRoadmaps.length >= 3}
                    className="btn-primary"
                    title={enrolledRoadmaps.length >= 3 ? 'Maximum 3 roadmaps' : 'Enroll'}
                  >
                    <HiPlus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function EnrollmentCard({ enrollment, isCompleted }) {
  return (
    <Link
      to={`/roadmaps/${enrollment.roadmap?._id}`}
      className={`bg-dark-800 rounded-lg p-4 hover:bg-dark-700 transition-colors group ${isCompleted ? 'opacity-75 hover:opacity-100' : ''
        }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center 
          ${isCompleted
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-primary-400'
          }`}>
          {isCompleted ? <HiCheck className="w-5 h-5" /> : <HiAcademicCap className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate group-hover:text-primary-400 transition-colors">
            {enrollment.roadmap?.title}
          </h3>
          {enrollment.isCurrent && !isCompleted && (
            <span className="badge-primary">Current</span>
          )}
          {isCompleted && (
            <span className="text-xs text-green-400 font-medium">Completed</span>
          )}
        </div>
      </div>
      <div className="progress mb-2">
        <div
          className={`progress-bar ${isCompleted ? 'bg-green-500' : ''}`}
          style={{ width: `${enrollment.progressPercentage || 0}%` }}
        />
      </div>
      <p className="text-dark-400 text-sm">
        {enrollment.progressPercentage || 0}% complete
      </p>
    </Link>
  );
}
