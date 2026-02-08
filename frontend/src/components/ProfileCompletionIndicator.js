/**
 * Profile Completion Indicator Component
 * Circular progress showing profile completion percentage
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiCheckCircle, HiExclamationCircle } from 'react-icons/hi';

export default function ProfileCompletionIndicator({ completion, loading }) {
    if (loading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-dark-700 rounded w-1/3"></div>
                    <div className="h-32 bg-dark-700 rounded-full mx-auto w-32"></div>
                </div>
            </div>
        );
    }

    if (!completion) {
        return null;
    }

    const { percentage, missingFields } = completion;
    const isComplete = percentage === 100;

    // Flatten missing fields for display
    const allMissingFields = [
        ...(missingFields?.basicInfo || []),
        ...(missingFields?.preferences || []),
        ...(missingFields?.careerData || []),
        ...(missingFields?.learning || [])
    ];

    const fieldLabels = {
        name: 'Full Name',
        email: 'Email',
        avatar: 'Profile Picture',
        targetRole: 'Target Role',
        skillLevel: 'Skill Level',
        dailyStudyTime: 'Daily Study Time',
        leetcodeUsername: 'LeetCode Username',
        githubUsername: 'GitHub Username',
        hasEnrolledRoadmap: 'Enroll in a Roadmap',
        hasCompletedTopic: 'Complete a Topic'
    };

    const fieldLinks = {
        targetRole: '/onboarding',
        skillLevel: '/onboarding',
        dailyStudyTime: '/onboarding',
        avatar: '/profile',
        leetcodeUsername: '/career',
        githubUsername: '/career',
        hasEnrolledRoadmap: '/roadmaps',
        hasCompletedTopic: '/roadmaps'
    };

    // Calculate circumference for circular progress
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6"
        >
            <h2 className="text-lg font-semibold text-white mb-4">Profile Completion</h2>

            <div className="flex flex-col items-center">
                {/* Circular Progress */}
                <div className="relative w-32 h-32 mb-4">
                    <svg className="transform -rotate-90 w-full h-full">
                        {/* Background circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-dark-700"
                        />
                        {/* Progress circle */}
                        <motion.circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            className={isComplete ? 'text-accent-500' : 'text-primary-500'}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{
                                strokeDasharray: circumference
                            }}
                        />
                    </svg>

                    {/* Percentage text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{percentage}%</div>
                            {isComplete && <div className="text-accent-400 text-xs">✨ Complete</div>}
                        </div>
                    </div>
                </div>

                {/* Status Message */}
                {isComplete ? (
                    <div className="flex items-center gap-2 text-accent-400 mb-4">
                        <HiCheckCircle className="w-5 h-5" />
                        <span className="font-medium">Your profile is complete!</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-orange-400 mb-4">
                        <HiExclamationCircle className="w-5 h-5" />
                        <span className="font-medium">{allMissingFields.length} items remaining</span>
                    </div>
                )}

                {/* Missing Fields List */}
                {!isComplete && allMissingFields.length > 0 && (
                    <div className="w-full space-y-2">
                        <p className="text-dark-400 text-sm mb-2">Complete these to reach 100%:</p>
                        {allMissingFields.slice(0, 5).map((field, index) => (
                            <Link
                                key={field}
                                to={fieldLinks[field] || '/profile'}
                                className="flex items-center justify-between p-2 rounded-lg bg-dark-800 
                           hover:bg-dark-700 transition-colors group"
                            >
                                <span className="text-dark-300 text-sm group-hover:text-white">
                                    {fieldLabels[field] || field}
                                </span>
                                <span className="text-primary-400 text-xs">Add →</span>
                            </Link>
                        ))}
                        {allMissingFields.length > 5 && (
                            <p className="text-dark-500 text-xs text-center pt-2">
                                +{allMissingFields.length - 5} more
                            </p>
                        )}
                    </div>
                )}

                {/* Encouragement Message */}
                {!isComplete && (
                    <p className="text-dark-500 text-xs text-center mt-4">
                        💡 A complete profile helps us personalize your learning experience
                    </p>
                )}
            </div>
        </motion.div>
    );
}
