/**
 * Recent Activity Log Component
 * Timeline-style feed of recent user activities
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function RecentActivityLog({ activities, loading }) {
    if (loading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-dark-700 rounded w-1/3"></div>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                            <div className="w-8 h-8 bg-dark-700 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-dark-700 rounded w-3/4"></div>
                                <div className="h-2 bg-dark-700 rounded w-1/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const activityTypeStyles = {
        enrollment: 'bg-primary-500/20 text-primary-400',
        topic_completed: 'bg-accent-500/20 text-accent-400',
        badge_earned: 'bg-yellow-500/20 text-yellow-400',
        test_completed: 'bg-secondary-500/20 text-secondary-400'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
        >
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>

            {!activities || activities.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-dark-400 mb-2">No recent activity</p>
                    <p className="text-dark-500 text-sm">
                        Complete topics and enroll in roadmaps to see your activity here
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activities.map((activity, index) => (
                        <motion.div
                            key={`${activity.type}-${activity.date}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3 group"
                        >
                            {/* Icon */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                              ${activityTypeStyles[activity.type] || 'bg-dark-700 text-dark-400'}`}>
                                <span className="text-lg">{activity.icon || '📌'}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-white text-sm font-medium group-hover:text-primary-400 
                                transition-colors truncate">
                                        {activity.title}
                                    </p>
                                    <span className="text-dark-500 text-xs whitespace-nowrap">
                                        {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                                    </span>
                                </div>

                                {/* Additional Info */}
                                {activity.timeSpent && (
                                    <p className="text-dark-400 text-xs mt-1">
                                        ⏱️ {activity.timeSpent} minutes
                                    </p>
                                )}

                                {/* Link to related item */}
                                {(activity.topicId || activity.roadmapId) && (
                                    <Link
                                        to={activity.topicId ? `/topics/${activity.topicId}` : `/roadmaps/${activity.roadmapId}`}
                                        className="text-primary-400 hover:text-primary-300 text-xs mt-1 inline-block"
                                    >
                                        View →
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {/* Connector lines */}
                    <div className="relative">
                        <div className="absolute left-5 top-0 bottom-0 w-px bg-dark-700 -z-10"
                            style={{ top: '-1rem', bottom: '-1rem' }}></div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
