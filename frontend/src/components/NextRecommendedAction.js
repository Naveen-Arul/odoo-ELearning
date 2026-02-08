/**
 * Next Recommended Action Component
 * Smart recommendation card suggesting the best next action
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { HiChevronRight, HiLightningBolt } from 'react-icons/hi';
import { motion } from 'framer-motion';

export default function NextRecommendedAction({ recommendation, loading }) {
    if (loading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-dark-700 rounded w-1/3"></div>
                    <div className="h-16 bg-dark-700 rounded"></div>
                    <div className="h-10 bg-dark-700 rounded"></div>
                </div>
            </div>
        );
    }

    if (!recommendation) {
        return null;
    }

    const priorityColors = {
        high: 'from-primary-500/20 to-secondary-500/20 border-primary-500/30',
        medium: 'from-accent-500/20 to-accent-600/20 border-accent-500/30',
        low: 'from-dark-700 to-dark-800 border-dark-600'
    };

    const priorityBadgeColors = {
        high: 'bg-primary-500/20 text-primary-400',
        medium: 'bg-accent-500/20 text-accent-400',
        low: 'bg-dark-600 text-dark-400'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <HiLightningBolt className="w-5 h-5 text-accent-400" />
                    Next Action
                </h2>
                {recommendation.priority && (
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityBadgeColors[recommendation.priority]}`}>
                        {recommendation.priority.toUpperCase()}
                    </span>
                )}
            </div>

            <div className={`bg-gradient-to-br ${priorityColors[recommendation.priority || 'medium']} 
                      border rounded-lg p-5 space-y-4`}>
                <div className="flex items-start gap-3">
                    <span className="text-3xl">{recommendation.icon || '🎯'}</span>
                    <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg mb-1">
                            {recommendation.title}
                        </h3>
                        <p className="text-dark-300 text-sm">
                            {recommendation.description}
                        </p>
                    </div>
                </div>

                <Link
                    to={recommendation.link || '/dashboard'}
                    className={`btn-primary w-full flex items-center justify-center group`}
                >
                    {recommendation.action || 'Get Started'}
                    <HiChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="mt-3 text-xs text-dark-500 text-center">
                💡 Personalized based on your learning progress
            </div>
        </motion.div>
    );
}
