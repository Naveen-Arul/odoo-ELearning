/**
 * Weekly Goal Setter Component
 * Interactive component for setting and tracking weekly learning goals
 */

import React, { useState } from 'react';
import { HiPencil, HiCheck, HiX, HiCalendar } from 'react-icons/hi';
import { motion } from 'framer-motion';

export default function WeeklyGoalSetter({ goalData, onUpdateGoal, loading }) {
    const [isEditing, setIsEditing] = useState(false);
    const [targetMinutes, setTargetMinutes] = useState(600);
    const [targetTopics, setTargetTopics] = useState(5);

    React.useEffect(() => {
        if (goalData?.goal) {
            setTargetMinutes(goalData.goal.targetMinutes || 600);
            setTargetTopics(goalData.goal.targetTopics || 5);
        }
    }, [goalData]);

    const handleSave = async () => {
        if (onUpdateGoal) {
            await onUpdateGoal({ targetMinutes, targetTopics });
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (goalData?.goal) {
            setTargetMinutes(goalData.goal.targetMinutes || 600);
            setTargetTopics(goalData.goal.targetTopics || 5);
        }
        setIsEditing(false);
    };

    if (loading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-dark-700 rounded w-1/3"></div>
                    <div className="h-20 bg-dark-700 rounded"></div>
                    <div className="h-20 bg-dark-700 rounded"></div>
                </div>
            </div>
        );
    }

    const progress = goalData?.progress || {
        minutesCompleted: 0,
        topicsCompleted: 0,
        minutesPercentage: 0,
        topicsPercentage: 0
    };

    const hoursTarget = Math.round((targetMinutes / 60) * 10) / 10;
    const hoursCompleted = Math.round((progress.minutesCompleted / 60) * 10) / 10;
    const daysRemaining = 7 - new Date().getDay();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <HiCalendar className="w-5 h-5 text-secondary-400" />
                    Weekly Goal
                </h2>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-dark-400 
                       hover:text-white transition-colors"
                    >
                        <HiPencil className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {/* Study Time Goal */}
                <div className="bg-dark-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-dark-400 text-sm">Study Time</span>
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={Math.round(targetMinutes / 60)}
                                    onChange={(e) => setTargetMinutes(Math.max(1, e.target.value) * 60)}
                                    className="w-16 px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-sm text-center"
                                    min="1"
                                />
                                <span className="text-dark-400 text-sm">hours</span>
                            </div>
                        ) : (
                            <span className="text-white font-medium">
                                {hoursCompleted}h / {hoursTarget}h
                            </span>
                        )}
                    </div>
                    <div className="progress">
                        <div
                            className="progress-bar bg-gradient-to-r from-secondary-500 to-secondary-400"
                            style={{ width: `${Math.min(progress.minutesPercentage, 100)}%` }}
                        />
                    </div>
                    <div className="mt-1 text-xs text-dark-500">
                        {progress.minutesPercentage >= 100 ? '🎉 Goal achieved!' : `${progress.minutesPercentage}% complete`}
                    </div>
                </div>

                {/* Topics Goal */}
                <div className="bg-dark-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-dark-400 text-sm">Topics Completed</span>
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={targetTopics}
                                    onChange={(e) => setTargetTopics(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-16 px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-sm text-center"
                                    min="1"
                                />
                                <span className="text-dark-400 text-sm">topics</span>
                            </div>
                        ) : (
                            <span className="text-white font-medium">
                                {progress.topicsCompleted} / {targetTopics}
                            </span>
                        )}
                    </div>
                    <div className="progress">
                        <div
                            className="progress-bar bg-gradient-to-r from-accent-500 to-accent-400"
                            style={{ width: `${Math.min(progress.topicsPercentage, 100)}%` }}
                        />
                    </div>
                    <div className="mt-1 text-xs text-dark-500">
                        {progress.topicsPercentage >= 100 ? '🎉 Goal achieved!' : `${progress.topicsPercentage}% complete`}
                    </div>
                </div>

                {/* Edit Actions */}
                {isEditing && (
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleSave}
                            className="flex-1 btn-primary btn-sm flex items-center justify-center"
                        >
                            <HiCheck className="w-4 h-4 mr-1" />
                            Save
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex-1 btn-secondary btn-sm flex items-center justify-center"
                        >
                            <HiX className="w-4 h-4 mr-1" />
                            Cancel
                        </button>
                    </div>
                )}

                {/* Days Remaining */}
                {!isEditing && (
                    <div className="text-center text-sm text-dark-400 pt-2 border-t border-dark-700">
                        📅 {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left this week
                    </div>
                )}
            </div>
        </motion.div>
    );
}
