/**
 * Streak Motivational Message Component
 * Displays current study streak with motivational message
 */

import React from 'react';
import { motion } from 'framer-motion';
import { HiFire } from 'react-icons/hi';

export default function StreakMessage({ streakData, loading }) {
    if (loading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse h-20 bg-dark-700 rounded"></div>
            </div>
        );
    }

    if (!streakData) {
        return null;
    }

    const { streak, streakMessage } = streakData;
    const message = streakMessage || {
        emoji: '🎯',
        message: 'Start your learning streak today!',
        type: 'start'
    };

    const typeColors = {
        start: 'from-dark-700 to-dark-800 border-dark-600',
        new: 'from-accent-500/10 to-accent-600/10 border-accent-500/20',
        building: 'from-orange-500/10 to-orange-600/10 border-orange-500/20',
        strong: 'from-orange-500/15 to-red-500/15 border-orange-500/30',
        epic: 'from-red-500/20 to-orange-500/20 border-red-500/40',
        legendary: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/40'
    };

    const typeGlow = {
        start: '',
        new: 'shadow-lg shadow-accent-500/10',
        building: 'shadow-lg shadow-orange-500/10',
        strong: 'shadow-xl shadow-orange-500/20',
        epic: 'shadow-xl shadow-red-500/30',
        legendary: 'shadow-2xl shadow-yellow-500/40'
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`card p-6 bg-gradient-to-br ${typeColors[message.type]} border ${typeGlow[message.type]}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <motion.div
                        animate={
                            message.type === 'epic' || message.type === 'legendary'
                                ? {
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, -5, 0]
                                }
                                : {}
                        }
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-5xl"
                    >
                        {message.emoji}
                    </motion.div>

                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <HiFire className={`w-5 h-5 ${streak > 0 ? 'text-orange-400' : 'text-dark-500'}`} />
                            <h3 className="text-2xl font-bold text-white">
                                {streak} {streak === 1 ? 'Day' : 'Days'}
                            </h3>
                        </div>
                        <p className={`text-sm ${message.type === 'legendary' ? 'text-yellow-400 font-medium' :
                                message.type === 'epic' ? 'text-orange-300 font-medium' :
                                    'text-dark-300'
                            }`}>
                            {message.message}
                        </p>
                    </div>
                </div>

                {/* Milestone Badges */}
                <div className="hidden md:flex items-center gap-2">
                    {[7, 30, 100].map(milestone => (
                        <div
                            key={milestone}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${streak >= milestone
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                                    : 'bg-dark-800 text-dark-500'
                                }`}
                        >
                            {milestone}
                        </div>
                    ))}
                </div>
            </div>

            {/* Warning message if streak is at risk */}
            {streak > 0 && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                    <p className="text-dark-400 text-xs flex items-center gap-2">
                        💡 Keep your streak alive by studying today!
                    </p>
                </div>
            )}
        </motion.div>
    );
}
