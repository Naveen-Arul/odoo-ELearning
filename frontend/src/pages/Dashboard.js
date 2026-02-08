/**
 * SkillForge AI - Dashboard Page
 * Main dashboard with overview and quick actions
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiAcademicCap,
  HiClock,
  HiTrendingUp,
  HiFire,
  HiPlay,
  HiChevronRight,
  HiCalendar,
  HiLightningBolt,
} from 'react-icons/hi';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { format, subDays } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { userAPI } from '../services/api';
import RoadmapProgressIndicator from '../components/RoadmapProgressIndicator';
import NextRecommendedAction from '../components/NextRecommendedAction';
import WeeklyGoalSetter from '../components/WeeklyGoalSetter';
import StreakMessage from '../components/StreakMessage';
import RecentActivityLog from '../components/RecentActivityLog';
import ProfileCompletionIndicator from '../components/ProfileCompletionIndicator';
import XPWidget from '../components/XPWidget';
import LearningStyleWidget from '../components/dashboard/LearningStyleWidget';
import PredictiveCompletionWidget from '../components/dashboard/PredictiveCompletionWidget';
import DropOffRiskWidget from '../components/dashboard/DropOffRiskWidget';

// ... existing imports ...

export default function Dashboard() {
  const { user } = useAuthStore();
  const { enrolledRoadmaps, fetchEnrolledRoadmaps, todaysPlan, fetchTodaysPlan } = useAppStore();
  const navigate = useNavigate(); // Import this
  const [stats, setStats] = useState(null);
  const [studyData, setStudyData] = useState([]);
  const [loading, setLoading] = useState(true);

  // New dashboard features state
  const [weeklyGoal, setWeeklyGoal] = useState(null);
  const [profileCompletion, setProfileCompletion] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [nextAction, setNextAction] = useState(null);
  const [featuresLoading, setFeaturesLoading] = useState(true);

  // Redirect based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'company_admin') {
        navigate('/company-dashboard');
      } else if (user.role === 'recruiter') {
        navigate('/recruiter-dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin');
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    // Skip fetching student data if not a student
    if (user && ['company_admin', 'recruiter', 'admin'].includes(user.role)) {
      return;
    }

    const fetchData = async () => {
      try {
        await Promise.all([
          fetchEnrolledRoadmaps(),
          fetchTodaysPlan(),
        ]);

        // Fetch analytics
        const analyticsRes = await userAPI.getAnalytics();
        setStats(analyticsRes.data.data);

        // Fetch study time for heatmap
        const studyTimeRes = await userAPI.getStudyTime('year');
        setStudyData(studyTimeRes.data.data || []);

        // Fetch new dashboard features data
        const [goalRes, completionRes, activityRes, actionRes] = await Promise.all([
          userAPI.getWeeklyGoal(),
          userAPI.getProfileCompletion(),
          userAPI.getRecentActivity(),
          userAPI.getNextAction()
        ]);

        setWeeklyGoal(goalRes.data.data);
        setProfileCompletion(completionRes.data.data);
        setRecentActivity(activityRes.data.data || []);
        setNextAction(actionRes.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
        setFeaturesLoading(false);
      }
    };

    fetchData();
  }, [fetchEnrolledRoadmaps, fetchTodaysPlan]);

  const currentRoadmap = enrolledRoadmaps.find(r => r.isCurrent);
  const activeRoadmaps = enrolledRoadmaps.filter(r => r.status !== 'completed' && (r.progressPercentage || 0) < 100);

  // Handle weekly goal update
  const handleUpdateWeeklyGoal = async (data) => {
    try {
      await userAPI.updateWeeklyGoal(data);
      // Refresh goal data
      const goalRes = await userAPI.getWeeklyGoal();
      setWeeklyGoal(goalRes.data.data);
    } catch (error) {
      console.error('Failed to update weekly goal:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section with Profile Completion */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Welcome back, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Let's continue your learning journey today.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/ai/teacher" className="btn-primary">
                <HiLightningBolt className="w-5 h-5 mr-2" />
                Ask AI Teacher
              </Link>
            </div>
          </div>

          {/* XP Widget */}
          <XPWidget />
        </div>
        <div>
          <ProfileCompletionIndicator
            completion={profileCompletion}
            loading={featuresLoading}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={HiAcademicCap}
          title="Active Roadmaps"
          value={activeRoadmaps.length}
          subtitle="of 3 max"
          color="primary"
        />
        <StatCard
          icon={HiClock}
          title="Study Time Today"
          value={`${stats?.todayMinutes || 0}m`}
          subtitle="minutes studied"
          color="accent"
        />
        <StatCard
          icon={HiFire}
          title="Current Streak"
          value={`${stats?.streak || 0}`}
          subtitle="days"
          color="orange"
        />
        <StatCard
          icon={HiTrendingUp}
          title="Weekly Progress"
          value={`${stats?.weeklyProgress || 0}%`}
          subtitle="completion rate"
          color="secondary"
        />
      </div>

      {/* Streak Motivational Message */}
      <StreakMessage
        streakData={{
          streak: stats?.streak || 0,
          streakMessage: stats?.streakMessage
        }}
        loading={loading}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Roadmap Progress & Weekly Goals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Roadmap Progress Indicator */}
          <RoadmapProgressIndicator
            roadmaps={activeRoadmaps}
            loading={loading}
          />

          {/* New Analytics Widgets */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LearningStyleWidget />
            <PredictiveCompletionWidget roadmapId={currentRoadmap?._id || currentRoadmap?.roadmap?._id} />
            <DropOffRiskWidget />
          </div>

          {/* Weekly Goal Setter */}
          <WeeklyGoalSetter
            goalData={weeklyGoal}
            onUpdateGoal={handleUpdateWeeklyGoal}
            loading={featuresLoading}
          />

          {/* Study Activity Heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Study Activity</h2>
            <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
              <CalendarHeatmap
                startDate={subDays(new Date(), 365)}
                endDate={new Date()}
                values={studyData.map(d => ({
                  date: d.date,
                  count: d.minutes > 0 ? Math.min(Math.ceil(d.minutes / 30), 4) : 0
                }))}
                classForValue={(value) => {
                  if (!value || value.count === 0) return 'color-empty';
                  return `color-scale-${value.count}`;
                }}
                titleForValue={(value) => {
                  if (!value || !value.date) return 'No data';
                  return `${value.count * 30} minutes on ${format(new Date(value.date), 'MMM d, yyyy')}`;
                }}
                showWeekdayLabels
              />
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded bg-muted" />
                <div className="w-3 h-3 rounded bg-chart-4/30" />
                <div className="w-3 h-3 rounded bg-chart-4/50" />
                <div className="w-3 h-3 rounded bg-chart-4/70" />
                <div className="w-3 h-3 rounded bg-chart-4" />
              </div>
              <span>More</span>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Next Action & Activity */}
        <div className="space-y-6">
          {/* Next Recommended Action */}
          <NextRecommendedAction
            recommendation={nextAction}
            loading={featuresLoading}
          />

          {/* Recent Activity Log */}
          <RecentActivityLog
            activities={recentActivity}
            loading={featuresLoading}
          />

          {/* Today's Study Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Today's Plan</h2>
              <Link
                to="/study-plan"
                className="text-primary hover:text-primary/80 text-sm flex items-center"
              >
                View All
                <HiChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {todaysPlan || (currentRoadmap && currentRoadmap.roadmap?.topics) ? (
              <div className="space-y-3">
                {(todaysPlan?.assignedTopics?.length > 0 ? todaysPlan.assignedTopics : (
                  // Fallback: Calculate remaining topics
                  (() => {
                    if (!currentRoadmap?.roadmap?.topics) return [];
                    const completedIds = new Set((currentRoadmap.completedTopics || []).map(t => typeof t === 'string' ? t : t._id));
                    return currentRoadmap.roadmap.topics
                      .filter(topic => !completedIds.has(topic._id))
                      .slice(0, 5)
                      .map(topic => ({
                        _id: topic._id,
                        topic: topic,
                        estimatedDuration: topic.estimatedDuration || 30, // Default if missing
                        status: 'pending'
                      }));
                  })()
                )).map((item, index) => (
                  <div
                    key={item._id || index}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors border border-border/50
                      ${item.status === 'completed'
                        ? 'bg-accent/10 border-accent/30'
                        : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium
                      ${item.status === 'completed'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${item.status === 'completed' ? 'text-accent-foreground' : 'text-foreground'
                        }`}>
                        {item.topic?.title || 'Topic'}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {item.estimatedDuration} min
                      </p>
                    </div>
                    {item.status !== 'completed' && (
                      <Link
                        to={`/topics/${item.topic?._id}`}
                        className="p-2 rounded-lg bg-primary/10 text-primary
                                   hover:bg-primary/20 transition-colors"
                      >
                        <HiPlay className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                ))}

                {todaysPlan?.assignedTopics?.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Today's progress</span>
                      <span className="text-foreground font-medium">
                        {todaysPlan.summary?.completionPercentage || 0}%
                      </span>
                    </div>
                    <div className="progress mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{ width: `${todaysPlan.summary?.completionPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Show different message if showing fallback */}
                {!todaysPlan?.assignedTopics?.length && currentRoadmap && (
                  <p className="text-center text-xs text-muted-foreground pt-2">
                    Showing next topics from your roadmap
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <HiCalendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No study plan for today</p>
                <Link to="/study-plan" className="btn-primary btn-sm">
                  Generate Plan
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div >
  );
}

// Stat Card Component
function StatCard({ icon: Icon, title, value, subtitle, color }) {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/10 text-primary',
    accent: 'from-accent/20 to-accent/10 text-accent-foreground',
    orange: 'from-orange-500/20 to-orange-500/10 text-orange-500',
    secondary: 'from-secondary/20 to-secondary/10 text-secondary-foreground',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]}
                        flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-muted-foreground/80 text-xs">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}
