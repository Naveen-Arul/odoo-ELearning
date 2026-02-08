/**
 * SkillForge AI - Study Plan Page
 * View and manage daily study plans
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiCalendar, HiClock, HiCheck, HiChevronLeft, HiChevronRight,
  HiPlay, HiRefresh, HiLightningBolt, HiAcademicCap
} from 'react-icons/hi';
import { studyPlanAPI } from '../services/api';
import toast from 'react-hot-toast';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

export default function StudyPlanPage() {
  const [todayPlan, setTodayPlan] = useState(null);
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('today'); // today, week, history

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [todayRes, historyRes] = await Promise.all([
        studyPlanAPI.getToday(),
        studyPlanAPI.getHistory()
      ]);
      setTodayPlan(todayRes.data.data);
      setHistory(historyRes.data.data || []);

      // Generate weekly view
      const startOfWeek = getStartOfWeek(new Date());
      const weekPlans = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        const dayPlan = historyRes.data.data?.find(
          h => new Date(h.date).toDateString() === date.toDateString()
        );
        weekPlans.push({
          date,
          plan: dayPlan,
          isToday: date.toDateString() === new Date().toDateString()
        });
      }
      setWeeklyPlans(weekPlans);
    } catch (error) {
      console.error('Failed to fetch study plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      const response = await studyPlanAPI.generatePlan();
      setTodayPlan(response.data.data);
      toast.success('Study plan regenerated!');
    } catch (error) {
      toast.error('Failed to regenerate plan');
    } finally {
      setRegenerating(false);
    }
  };

  const handleTopicComplete = async (topicId) => {
    try {
      await studyPlanAPI.updateTopicStatus(todayPlan._id, topicId, 'completed');
      setTodayPlan(prev => ({
        ...prev,
        topics: prev.topics.map(t =>
          t.topic._id === topicId ? { ...t, status: 'completed' } : t
        )
      }));
      toast.success('Topic marked as complete!');
    } catch (error) {
      toast.error('Failed to update topic');
    }
  };

  const handleSkipTopic = async (topicId) => {
    try {
      await studyPlanAPI.updateTopicStatus(todayPlan._id, topicId, 'skipped');
      setTodayPlan(prev => ({
        ...prev,
        topics: prev.topics.map(t =>
          t.topic._id === topicId ? { ...t, status: 'skipped' } : t
        )
      }));
    } catch (error) {
      toast.error('Failed to skip topic');
    }
  };

  // Prepare heatmap data
  const heatmapData = history.map(h => ({
    date: new Date(h.date).toISOString().split('T')[0],
    count: h.topics?.filter(t => t.status === 'completed').length || 0
  }));

  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Study Plan</h1>
          <p className="text-dark-400 mt-1">
            Your personalized daily learning schedule
          </p>
        </div>
        <div className="flex gap-2">
          {['today', 'week', 'history'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg capitalize ${
                view === v
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Today View */}
          {view === 'today' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={HiAcademicCap}
                  label="Topics Today"
                  value={todayPlan?.topics?.length || 0}
                  color="primary"
                />
                <StatCard
                  icon={HiCheck}
                  label="Completed"
                  value={todayPlan?.topics?.filter(t => t.status === 'completed').length || 0}
                  color="accent"
                />
                <StatCard
                  icon={HiClock}
                  label="Est. Time"
                  value={`${todayPlan?.totalDuration || 0}m`}
                  color="secondary"
                />
                <StatCard
                  icon={HiLightningBolt}
                  label="Progress"
                  value={`${Math.round(
                    ((todayPlan?.topics?.filter(t => t.status === 'completed').length || 0) /
                    (todayPlan?.topics?.length || 1)) * 100
                  )}%`}
                  color="warning"
                />
              </div>

              {/* Today's Plan */}
              <div className="card">
                <div className="p-4 border-b border-dark-700 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Today's Topics</h2>
                    <p className="text-dark-400 text-sm">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="btn-secondary text-sm"
                  >
                    <HiRefresh className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>

                <div className="divide-y divide-dark-700">
                  {todayPlan?.topics?.length > 0 ? (
                    todayPlan.topics.map((item, index) => (
                      <motion.div
                        key={item.topic._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 flex items-center gap-4 ${
                          item.status === 'completed' ? 'bg-accent-500/10' :
                          item.status === 'skipped' ? 'bg-dark-800/50 opacity-60' : ''
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          item.status === 'completed' ? 'bg-accent-500' :
                          item.status === 'skipped' ? 'bg-dark-600' : 'bg-primary-500/20'
                        }`}>
                          {item.status === 'completed' ? (
                            <HiCheck className="w-5 h-5 text-white" />
                          ) : (
                            <span className="text-primary-400 font-medium">{index + 1}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium ${
                            item.status === 'completed' ? 'text-dark-400 line-through' : 'text-white'
                          }`}>
                            {item.topic.title}
                          </h3>
                          <p className="text-dark-500 text-sm truncate">
                            {item.roadmap?.title || 'General'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-dark-400">
                          <HiClock className="w-4 h-4" />
                          <span>{item.duration || 30}m</span>
                        </div>

                        {item.status === 'pending' && (
                          <div className="flex gap-2">
                            <Link
                              to={`/topics/${item.topic._id}`}
                              className="btn-primary py-2 px-3 text-sm"
                            >
                              <HiPlay className="w-4 h-4 mr-1" />
                              Start
                            </Link>
                            <button
                              onClick={() => handleSkipTopic(item.topic._id)}
                              className="btn-ghost py-2 px-3 text-sm text-dark-400"
                            >
                              Skip
                            </button>
                          </div>
                        )}

                        {item.status === 'in-progress' && (
                          <Link
                            to={`/topics/${item.topic._id}`}
                            className="btn-secondary py-2 px-3 text-sm"
                          >
                            Continue
                          </Link>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <HiCalendar className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                      <p className="text-dark-400">No topics scheduled for today</p>
                      <button
                        onClick={handleRegenerate}
                        className="btn-primary mt-4"
                      >
                        Generate Plan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Week View */}
          {view === 'week' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid gap-4">
                {weeklyPlans.map((day, index) => (
                  <div
                    key={index}
                    className={`card p-4 ${day.isToday ? 'border-2 border-primary-500' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className={`font-medium ${day.isToday ? 'text-primary-400' : 'text-white'}`}>
                          {day.date.toLocaleDateString('en-US', { weekday: 'long' })}
                          {day.isToday && <span className="ml-2 badge badge-primary">Today</span>}
                        </h3>
                        <p className="text-dark-500 text-sm">
                          {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {day.plan && (
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {day.plan.topics?.filter(t => t.status === 'completed').length || 0}/
                            {day.plan.topics?.length || 0}
                          </p>
                          <p className="text-dark-500 text-sm">completed</p>
                        </div>
                      )}
                    </div>

                    {day.plan?.topics?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {day.plan.topics.map((item) => (
                          <span
                            key={item.topic._id}
                            className={`px-3 py-1 rounded-full text-sm ${
                              item.status === 'completed'
                                ? 'bg-accent-500/20 text-accent-400'
                                : item.status === 'skipped'
                                ? 'bg-dark-700 text-dark-500'
                                : 'bg-dark-700 text-dark-300'
                            }`}
                          >
                            {item.topic.title}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-dark-500 text-sm">No plan for this day</p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* History View */}
          {view === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Heatmap */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Activity Heatmap</h2>
                <div className="heatmap-container">
                  <CalendarHeatmap
                    startDate={sixMonthsAgo}
                    endDate={today}
                    values={heatmapData}
                    classForValue={(value) => {
                      if (!value || value.count === 0) return 'color-empty';
                      if (value.count <= 1) return 'color-scale-1';
                      if (value.count <= 2) return 'color-scale-2';
                      if (value.count <= 3) return 'color-scale-3';
                      return 'color-scale-4';
                    }}
                    tooltipDataAttrs={(value) => ({
                      'data-tip': value?.date
                        ? `${value.count} topics on ${value.date}`
                        : 'No activity'
                    })}
                  />
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 text-sm text-dark-400">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm color-empty" />
                    <div className="w-3 h-3 rounded-sm color-scale-1" />
                    <div className="w-3 h-3 rounded-sm color-scale-2" />
                    <div className="w-3 h-3 rounded-sm color-scale-3" />
                    <div className="w-3 h-3 rounded-sm color-scale-4" />
                  </div>
                  <span>More</span>
                </div>
              </div>

              {/* History List */}
              <div className="card">
                <div className="p-4 border-b border-dark-700">
                  <h2 className="text-lg font-semibold text-white">Past Plans</h2>
                </div>
                <div className="divide-y divide-dark-700 max-h-96 overflow-y-auto">
                  {history.length > 0 ? (
                    history.slice(0, 30).map((plan) => (
                      <div key={plan._id} className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-medium">
                            {new Date(plan.date).toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric'
                            })}
                          </span>
                          <span className="text-accent-400">
                            {plan.topics?.filter(t => t.status === 'completed').length || 0}/
                            {plan.topics?.length || 0} completed
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {plan.topics?.map((item) => (
                            <span
                              key={item.topic._id || item._id}
                              className={`text-sm ${
                                item.status === 'completed' ? 'text-accent-400' : 'text-dark-500'
                              }`}
                            >
                              {item.topic?.title || 'Topic'}
                              {item.status === 'completed' && ' ✓'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-dark-400">
                      No history yet. Complete some study plans to see your progress!
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    primary: 'bg-primary-500/20 text-primary-400',
    secondary: 'bg-secondary-500/20 text-secondary-400',
    accent: 'bg-accent-500/20 text-accent-400',
    warning: 'bg-amber-500/20 text-amber-400'
  };

  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-dark-400 text-sm">{label}</p>
    </div>
  );
}
