/**
 * Roadmap Progress Indicator Component
 * Shows all enrolled roadmaps with progress bars and status
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { HiAcademicCap, HiChevronRight } from 'react-icons/hi';
import { motion } from 'framer-motion';

export default function RoadmapProgressIndicator({ roadmaps, loading }) {
    if (loading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-20 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    if (!roadmaps || roadmaps.length === 0) {
        return (
            <div className="card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Your Roadmaps</h2>
                <div className="text-center py-8">
                    <HiAcademicCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No enrolled roadmaps yet</p>
                    <Link to="/roadmaps" className="btn-primary btn-sm">
                        Explore Roadmaps
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Your Roadmaps</h2>
                <Link
                    to="/roadmaps"
                    className="text-primary-400 hover:text-primary-300 text-sm flex items-center"
                >
                    View All
                    <HiChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="space-y-3">
                {roadmaps.map((enrollment, index) => {
                    const roadmap = enrollment.roadmap || {};
                    const progress = enrollment.progressPercentage || enrollment.progress || 0;
                    const isCurrent = enrollment.status === 'current' || enrollment.isCurrent;

                    return (
                        <Link
                            key={roadmap._id || index}
                            to={`/roadmaps/${roadmap._id}`}
                            className={`block p-4 rounded-lg transition-all hover:bg-accent ${isCurrent ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/30' : 'bg-muted/30'
                                }`}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCurrent
                                    ? 'bg-gradient-to-br from-primary/20 to-secondary/20 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                    }`}>
                                    <HiAcademicCap className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-foreground truncate flex items-center gap-2">
                                        {roadmap.title || 'Untitled Roadmap'}
                                        {isCurrent && (
                                            <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        {enrollment.completedTopics?.length || 0} of {roadmap.topics?.length || 0} topics
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="text-foreground font-medium">{Math.round(progress)}%</span>
                                </div>
                                <div className="progress">
                                    <div
                                        className={`progress-bar ${isCurrent
                                            ? 'bg-gradient-to-r from-primary to-secondary'
                                            : 'bg-gradient-to-r from-accent-500 to-accent-400'
                                            }`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {roadmaps.length < 3 && (
                <Link
                    to="/roadmaps"
                    className="mt-4 w-full btn-secondary btn-sm flex items-center justify-center"
                >
                    <span>Add Another Roadmap ({roadmaps.length}/3)</span>
                </Link>
            )}
        </motion.div>
    );
}
