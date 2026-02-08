/**
 * SkillForge AI - Roadmap Detail Page
 * View roadmap details, topics, and progress
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiArrowLeft,
  HiPlay,
  HiCheck,
  HiLockClosed,
  HiClock,
  HiAcademicCap,
  HiUsers,
  HiBookOpen,
  HiStar,
  HiChevronDown,
  HiChevronUp,
} from 'react-icons/hi';
import { roadmapsAPI, testsAPI } from '../services/api';
import { useAppStore } from '../store/appStore';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export default function RoadmapDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enrolledRoadmaps, fetchEnrolledRoadmaps } = useAppStore();

  const [roadmap, setRoadmap] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [adaptiveData, setAdaptiveData] = useState(null);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);
  const socketRef = React.useRef(null);

  const enrollment = enrolledRoadmaps.find(r => r.roadmap?._id === id);
  const isEnrolled = !!enrollment;

  useEffect(() => {
    fetchRoadmap();
    if (isEnrolled) {
      fetchProgress();
      fetchAdaptivePath();
    }

    // Real-time updates
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on('roadmap_stats_updated', (data) => {
      if (data.roadmapId === id) {
        setRoadmap(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            stats: data.stats,
            // Ensure backwards compatibility if checking root prop
            enrollmentCount: data.stats.enrollmentCount
          };
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [id, isEnrolled]);

  const fetchRoadmap = async () => {
    try {
      setLoading(true);
      const response = await roadmapsAPI.getById(id);
      setRoadmap(response.data.data);
    } catch (error) {
      console.error('Failed to fetch roadmap:', error);
      toast.error('Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await roadmapsAPI.getProgress(id);
      setProgress(response.data.data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  const fetchAdaptivePath = async () => {
    try {
      setAdaptiveLoading(true);
      const response = await roadmapsAPI.getAdaptivePath(id);
      setAdaptiveData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch adaptive path:', error);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (enrolledRoadmaps.length >= 3) {
      toast.error('You can only enroll in 3 roadmaps at a time');
      return;
    }

    try {
      await roadmapsAPI.enroll(id);
      toast.success('Enrolled successfully!');
      fetchEnrolledRoadmaps();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enroll');
    }
  };

  const handleUnenroll = async () => {
    if (!window.confirm('Are you sure you want to unenroll? Your progress will be saved.')) {
      return;
    }

    try {
      await roadmapsAPI.unenroll(id);
      toast.success('Unenrolled successfully');
      fetchEnrolledRoadmaps();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unenroll');
    }
  };

  const handleSetCurrent = async () => {
    try {
      await roadmapsAPI.setCurrent(id);
      toast.success('Set as current roadmap');
      fetchEnrolledRoadmaps();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set as current');
    }
  };

  const toggleTopic = (topicId) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };

  const isTopicCompleted = (topicId) => {
    return (enrollment?.completedTopics || []).some((ct) => {
      const completedId = ct?.topic?._id || ct?.topic || ct;
      return completedId?.toString() === topicId?.toString();
    });
  };

  const isTopicLocked = (index) => {
    if (!isEnrolled) return true;
    if (index === 0) return false;

    // Check if previous topic is completed
    const prevTopicId = roadmap?.topics?.[index - 1]?._id;
    return !isTopicCompleted(prevTopicId);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-dark-700 rounded w-1/3" />
        <div className="card p-6">
          <div className="h-6 bg-dark-700 rounded w-1/2 mb-4" />
          <div className="h-4 bg-dark-700 rounded w-full mb-2" />
          <div className="h-4 bg-dark-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-4">Roadmap not found</h2>
        <Link to="/roadmaps" className="btn-primary">
          Browse Roadmaps
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
      >
        <HiArrowLeft className="w-5 h-5" />
        Back to Roadmaps
      </button>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20
                          flex items-center justify-center text-primary-400 flex-shrink-0">
            <HiAcademicCap className="w-10 h-10" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                  {roadmap.title}
                </h1>
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
                  {enrollment?.isCurrent && (
                    <span className="badge-primary">Current Roadmap</span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-dark-300 mb-4">{roadmap.description}</p>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm mb-6">
              <div className="flex items-center gap-2 text-dark-400">
                <HiBookOpen className="w-5 h-5" />
                <span>{roadmap.topics?.length || 0} Topics</span>
              </div>
              <div className="flex items-center gap-2 text-dark-400">
                <HiClock className="w-5 h-5" />
                <span>{roadmap.estimatedDuration || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-dark-400">
                <HiUsers className="w-5 h-5" />
                <span>{roadmap.stats?.enrollmentCount ?? roadmap.enrollmentCount ?? 0} enrolled</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-400">
                <HiStar className="w-5 h-5" />
                <span>{roadmap.rating?.toFixed(1) || '4.5'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {isEnrolled ? (
                <>
                  {enrollment.status === 'completed' && (
                    <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg flex items-center gap-2">
                      <HiCheck className="w-5 h-5" />
                      <span>Completed!</span>
                    </div>
                  )}
                  {!enrollment.isCurrent && enrollment.status !== 'completed' && (
                    <button onClick={handleSetCurrent} className="btn-primary">
                      Set as Current
                    </button>
                  )}
                  <button onClick={handleUnenroll} className="btn-secondary">
                    {enrollment.status === 'completed' ? 'Archive' : 'Unenroll'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolledRoadmaps.filter(r => r.status !== 'completed').length >= 3}
                  className="btn-primary"
                >
                  {enrolledRoadmaps.filter(r => r.status !== 'completed').length >= 3
                    ? 'Max 3 Active Roadmaps'
                    : 'Enroll in this Roadmap'}
                </button>
              )}
            </div>
          </div>

          {/* Progress Circle */}
          {isEnrolled && (
            <div className="flex-shrink-0">
              <ProgressCircle
                percentage={
                  enrollment.progressPercentage ??
                  enrollment.progress ??
                  progress?.progress ??
                  0
                }
                size={120}
              />
            </div>
          )}
        </div>
      </motion.div>

      {isEnrolled && (
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Adaptive Learning</h2>
              <p className="text-dark-400 text-sm">Real-time diagnostics and next best topic</p>
            </div>
            <span className="text-dark-400 text-sm">
              Mastery threshold: {adaptiveData?.masteryThreshold || 70}%
            </span>
          </div>

          {adaptiveLoading ? (
            <div className="text-dark-400">Loading adaptive path...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-dark-400">
                <span>Mastered: {adaptiveData?.masteredCount || 0}/{adaptiveData?.totalTopics || 0}</span>
              </div>

              {adaptiveData?.recommendedNext?.topic ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-dark-800 rounded-xl">
                  <div>
                    <p className="text-xs text-dark-400">Recommended Next</p>
                    <h3 className="text-white font-semibold">
                      {adaptiveData.recommendedNext.topic.title}
                    </h3>
                    <p className="text-dark-500 text-sm line-clamp-2">
                      {adaptiveData.recommendedNext.topic.description}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/topics/${adaptiveData.recommendedNext.topic._id}`)}
                    className="btn-primary btn-sm"
                  >
                    Start Topic
                  </button>
                </div>
              ) : (
                <div className="text-dark-400">No recommendations yet. Keep learning to unlock diagnostics.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Topics List */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Course Content</h2>

        <div className="space-y-3">
          {roadmap.topics?.map((topic, index) => {
            const completed = isTopicCompleted(topic._id);
            const locked = isTopicLocked(index);
            const expanded = expandedTopics[topic._id];

            return (
              <motion.div
                key={topic._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-lg border transition-all ${completed
                  ? 'bg-accent-500/10 border-accent-500/30'
                  : locked
                    ? 'bg-dark-800/50 border-dark-700 opacity-60'
                    : 'bg-dark-800 border-dark-700 hover:border-primary-500/50'
                  }`}
              >
                {/* Topic Header */}
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${completed
                      ? 'bg-accent-500 text-white'
                      : locked
                        ? 'bg-dark-700 text-dark-500'
                        : 'bg-primary-500/20 text-primary-400'
                      }`}>
                      {completed ? (
                        <HiCheck className="w-5 h-5" />
                      ) : locked ? (
                        <HiLockClosed className="w-5 h-5" />
                      ) : (
                        <span className="font-medium">{index + 1}</span>
                      )}
                    </div>

                    {/* Topic Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${completed ? 'text-accent-400' : 'text-white'}`}>
                        {topic.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-dark-400 mt-1">
                        <span className="flex items-center gap-1">
                          <HiClock className="w-4 h-4" />
                          {topic.estimatedDuration} min
                        </span>
                        {topic.hasTest && (
                          <span className="badge-secondary text-xs">Has Test</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isEnrolled && !locked && (
                        <Link
                          to={`/topics/${topic._id}`}
                          className="btn-primary btn-sm"
                        >
                          <HiPlay className="w-4 h-4 mr-1" />
                          {completed ? 'Review' : 'Start'}
                        </Link>
                      )}
                      <button
                        onClick={() => toggleTopic(topic._id)}
                        className="p-2 text-dark-400 hover:text-white"
                      >
                        {expanded ? (
                          <HiChevronUp className="w-5 h-5" />
                        ) : (
                          <HiChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expanded && (
                  <div className="px-4 pb-4 border-t border-dark-700 pt-4">
                    <p className="text-dark-300 text-sm mb-3">{topic.description}</p>
                    {topic.subtopics?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-dark-400">What you'll learn:</h4>
                        <ul className="space-y-1">
                          {topic.subtopics.map((sub, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                              {sub}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Progress Circle Component
function ProgressCircle({ percentage, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="text-dark-700"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="text-primary-500 transition-all duration-500"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl font-bold text-white">{Math.round(percentage)}%</span>
          <p className="text-dark-400 text-xs">Complete</p>
        </div>
      </div>
    </div>
  );
}
