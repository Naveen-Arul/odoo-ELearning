/**
 * SkillForge AI - Career Readiness Dashboard
 * Unified view of all career analyses with overall readiness score
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    HiCode, HiChartBar, HiDocumentText, HiTrendingUp,
    HiRefresh, HiExternalLink, HiCheckCircle, HiExclamationCircle
} from 'react-icons/hi';
import { careerAPI } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CareerDashboard() {
    const [loading, setLoading] = useState(true);
    const [readinessData, setReadinessData] = useState(null);
    const [leetcodeAnalysis, setLeetcodeAnalysis] = useState(null);
    const [githubAnalysis, setGithubAnalysis] = useState(null);
    const [resumeAnalysis, setResumeAnalysis] = useState(null);

    useEffect(() => {
        fetchAllAnalyses();
    }, []);

    const fetchAllAnalyses = async () => {
        try {
            setLoading(true);

            // Fetch all analyses in parallel
            const [readiness, leetcode, github, resume] = await Promise.all([
                careerAPI.getReadinessScore().catch(() => ({ data: { data: null } })),
                careerAPI.getLatestLeetCodeAnalysis().catch(() => ({ data: { data: null } })),
                careerAPI.getLatestGitHubAnalysis().catch(() => ({ data: { data: null } })),
                careerAPI.getLatestResumeAnalysis().catch(() => ({ data: { data: null } }))
            ]);

            setReadinessData(readiness.data.data);
            setLeetcodeAnalysis(leetcode.data.data);
            setGithubAnalysis(github.data.data);
            setResumeAnalysis(resume.data.data);
        } catch (error) {
            console.error('Failed to fetch career analyses:', error);
            toast.error('Failed to load career readiness data');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-accent-400';
        if (score >= 60) return 'text-amber-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getScoreBgColor = (score) => {
        if (score >= 80) return 'bg-accent-500/20';
        if (score >= 60) return 'bg-amber-500/20';
        if (score >= 40) return 'bg-orange-500/20';
        return 'bg-red-500/20';
    };

    const getScoreRingColor = (score) => {
        if (score >= 80) return '#10b981'; // accent-500
        if (score >= 60) return '#f59e0b'; // amber-500
        if (score >= 40) return '#f97316'; // orange-500
        return '#ef4444'; // red-500
    };

    const ProgressRing = ({ score, size = 120, strokeWidth = 8 }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (score / 100) * circumference;

        return (
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#1f2937"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={getScoreRingColor(score)}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                />
            </svg>
        );
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-6 bg-dark-800 rounded w-48 animate-pulse" />
                        <div className="h-4 bg-dark-800 rounded w-64 animate-pulse" />
                    </div>
                </div>
                <div className="grid lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card p-6 space-y-4">
                            <div className="h-32 bg-dark-800 rounded animate-pulse" />
                            <div className="h-4 bg-dark-800 rounded animate-pulse" />
                            <div className="h-4 bg-dark-800 rounded w-3/4 animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const overallScore = readinessData?.overallScore || 0;
    const hasAnyAnalysis = leetcodeAnalysis || githubAnalysis || resumeAnalysis;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <HiTrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Career Readiness Dashboard</h1>
                        <p className="text-dark-400 text-sm">Track your progress across all career metrics</p>
                    </div>
                </div>
                <button
                    onClick={fetchAllAnalyses}
                    className="btn-ghost"
                    title="Refresh analyses"
                >
                    <HiRefresh className="w-5 h-5" />
                </button>
            </div>

            {!hasAnyAnalysis ? (
                /* Empty State */
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-12 text-center space-y-4"
                >
                    <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center mx-auto">
                        <HiChartBar className="w-10 h-10 text-dark-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">No Career Analyses Yet</h2>
                        <p className="text-dark-400 max-w-md mx-auto">
                            Get started by analyzing your LeetCode profile, GitHub account, or uploading your resume for ATS scoring.
                        </p>
                    </div>
                    <div className="flex gap-4 justify-center pt-4">
                        <Link to="/career" className="btn-primary">
                            Start Analysis
                        </Link>
                    </div>
                </motion.div>
            ) : (
                <>
                    {/* Overall Readiness Score */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card p-8"
                    >
                        <div className="flex flex-col lg:flex-row items-center gap-8">
                            {/* Score Circle */}
                            <div className="relative">
                                <ProgressRing score={overallScore} size={160} strokeWidth={12} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                                        {Math.round(overallScore)}
                                    </span>
                                    <span className="text-dark-400 text-sm">Overall Score</span>
                                </div>
                            </div>

                            {/* Score Details */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        {overallScore >= 80 ? '🎉 Excellent Progress!' :
                                            overallScore >= 60 ? '👍 Good Progress' :
                                                overallScore >= 40 ? '📈 Making Progress' :
                                                    '🚀 Getting Started'}
                                    </h2>
                                    <p className="text-dark-400">
                                        {overallScore >= 80 ? 'You\'re well-prepared for your target role!' :
                                            overallScore >= 60 ? 'You\'re on the right track. Focus on areas that need improvement.' :
                                                overallScore >= 40 ? 'Keep building your skills and experience.' :
                                                    'Start by completing analyses and improving your scores.'}
                                    </p>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-dark-800 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <HiCode className="w-5 h-5 text-amber-400" />
                                            <span className="text-dark-400 text-sm">LeetCode</span>
                                        </div>
                                        <span className={`text-2xl font-bold ${getScoreColor(leetcodeAnalysis?.scores?.overall || 0)}`}>
                                            {leetcodeAnalysis ? Math.round(leetcodeAnalysis.scores.overall) : '--'}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-dark-800 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <HiChartBar className="w-5 h-5 text-purple-400" />
                                            <span className="text-dark-400 text-sm">GitHub</span>
                                        </div>
                                        <span className={`text-2xl font-bold ${getScoreColor(githubAnalysis?.scores?.overall || 0)}`}>
                                            {githubAnalysis ? Math.round(githubAnalysis.scores.overall) : '--'}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-dark-800 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <HiDocumentText className="w-5 h-5 text-blue-400" />
                                            <span className="text-dark-400 text-sm">Resume</span>
                                        </div>
                                        <span className={`text-2xl font-bold ${getScoreColor(resumeAnalysis?.atsScore || 0)}`}>
                                            {resumeAnalysis ? Math.round(resumeAnalysis.atsScore) : '--'}
                                        </span>
                                    </div>
                                </div>

                                {/* Last Updated */}
                                {readinessData?.lastUpdated && (
                                    <p className="text-dark-500 text-sm">
                                        Last updated: {new Date(readinessData.lastUpdated).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Individual Analysis Cards */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* LeetCode Analysis */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="card p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                        <HiCode className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">LeetCode</h3>
                                        <p className="text-dark-500 text-xs">Problem Solving</p>
                                    </div>
                                </div>
                                {leetcodeAnalysis && (
                                    <span className={`text-2xl font-bold ${getScoreColor(leetcodeAnalysis.scores.overall)}`}>
                                        {Math.round(leetcodeAnalysis.scores.overall)}
                                    </span>
                                )}
                            </div>

                            {leetcodeAnalysis ? (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Easy Solved</span>
                                            <span className="text-accent-400">{leetcodeAnalysis.totalSolved?.easy || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Medium Solved</span>
                                            <span className="text-amber-400">{leetcodeAnalysis.totalSolved?.medium || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Hard Solved</span>
                                            <span className="text-red-400">{leetcodeAnalysis.totalSolved?.hard || 0}</span>
                                        </div>
                                    </div>

                                    {leetcodeAnalysis.insights && leetcodeAnalysis.insights.length > 0 && (
                                        <div className="pt-2 border-t border-dark-700">
                                            <p className="text-dark-400 text-sm mb-2">Key Insights:</p>
                                            <ul className="space-y-1">
                                                {leetcodeAnalysis.insights.slice(0, 2).map((insight, i) => (
                                                    <li key={i} className="text-dark-500 text-xs flex items-start gap-2">
                                                        <span className="text-primary-400 mt-0.5">•</span>
                                                        <span>{insight}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <Link to="/career" className="btn-ghost btn-sm w-full">
                                        <HiRefresh className="w-4 h-4" />
                                        Re-analyze
                                    </Link>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-dark-400 text-sm mb-4">No analysis yet</p>
                                    <Link to="/career" className="btn-primary btn-sm">
                                        Analyze Profile
                                    </Link>
                                </div>
                            )}
                        </motion.div>

                        {/* GitHub Analysis */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition delay={{ delay: 0.2 }}
                            className="card p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <HiChartBar className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">GitHub</h3>
                                        <p className="text-dark-500 text-xs">Code Portfolio</p>
                                    </div>
                                </div>
                                {githubAnalysis && (
                                    <span className={`text-2xl font-bold ${getScoreColor(githubAnalysis.scores.overall)}`}>
                                        {Math.round(githubAnalysis.scores.overall)}
                                    </span>
                                )}
                            </div>

                            {githubAnalysis ? (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Total Repos</span>
                                            <span className="text-white">{githubAnalysis.totalRepositories || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Public Repos</span>
                                            <span className="text-white">{githubAnalysis.publicRepos || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-dark-400">Total Stars</span>
                                            <span className="text-white">{githubAnalysis.totalStars || 0}</span>
                                        </div>
                                    </div>

                                    {githubAnalysis.insights && githubAnalysis.insights.length > 0 && (
                                        <div className="pt-2 border-t border-dark-700">
                                            <p className="text-dark-400 text-sm mb-2">Key Insights:</p>
                                            <ul className="space-y-1">
                                                {githubAnalysis.insights.slice(0, 2).map((insight, i) => (
                                                    <li key={i} className="text-dark-500 text-xs flex items-start gap-2">
                                                        <span className="text-primary-400 mt-0.5">•</span>
                                                        <span>{insight}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <Link to="/career" className="btn-ghost btn-sm w-full">
                                        <HiRefresh className="w-4 h-4" />
                                        Re-analyze
                                    </Link>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-dark-400 text-sm mb-4">No analysis yet</p>
                                    <Link to="/career" className="btn-primary btn-sm">
                                        Analyze Profile
                                    </Link>
                                </div>
                            )}
                        </motion.div>

                        {/* Resume Analysis */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="card p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <HiDocumentText className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">Resume</h3>
                                        <p className="text-dark-500 text-xs">ATS Score</p>
                                    </div>
                                </div>
                                {resumeAnalysis && (
                                    <span className={`text-2xl font-bold ${getScoreColor(resumeAnalysis.atsScore)}`}>
                                        {Math.round(resumeAnalysis.atsScore)}
                                    </span>
                                )}
                            </div>

                            {resumeAnalysis ? (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {resumeAnalysis.sections?.contact?.present ? (
                                                <HiCheckCircle className="w-4 h-4 text-accent-400" />
                                            ) : (
                                                <HiExclamationCircle className="w-4 h-4 text-red-400" />
                                            )}
                                            <span className="text-dark-400 text-sm">Contact Info</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {resumeAnalysis.sections?.summary?.present ? (
                                                <HiCheckCircle className="w-4 h-4 text-accent-400" />
                                            ) : (
                                                <HiExclamationCircle className="w-4 h-4 text-red-400" />
                                            )}
                                            <span className="text-dark-400 text-sm">Summary</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {resumeAnalysis.sections?.experience?.present ? (
                                                <HiCheckCircle className="w-4 h-4 text-accent-400" />
                                            ) : (
                                                <HiExclamationCircle className="w-4 h-4 text-red-400" />
                                            )}
                                            <span className="text-dark-400 text-sm">Experience</span>
                                        </div>
                                    </div>

                                    {resumeAnalysis.suggestions && resumeAnalysis.suggestions.length > 0 && (
                                        <div className="pt-2 border-t border-dark-700">
                                            <p className="text-dark-400 text-sm mb-2">Suggestions:</p>
                                            <ul className="space-y-1">
                                                {resumeAnalysis.suggestions.slice(0, 2).map((suggestion, i) => (
                                                    <li key={i} className="text-dark-500 text-xs flex items-start gap-2">
                                                        <span className="text-primary-400 mt-0.5">•</span>
                                                        <span>{suggestion}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <Link to="/career" className="btn-ghost btn-sm w-full">
                                        <HiRefresh className="w-4 h-4" />
                                        Re-analyze
                                    </Link>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-dark-400 text-sm mb-4">No analysis yet</p>
                                    <Link to="/career" className="btn-primary btn-sm">
                                        Upload Resume
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Action Recommendations */}
                    {readinessData?.recommendations && readinessData.recommendations.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="card p-6"
                        >
                            <h2 className="text-lg font-semibold text-white mb-4">📋 Recommended Actions</h2>
                            <div className="grid md:grid-cols-2 gap-3">
                                {readinessData.recommendations.map((rec, index) => (
                                    <div key={index} className="p-4 bg-dark-800 rounded-xl flex items-start gap-3">
                                        <span className="text-primary-400 font-bold">{index + 1}.</span>
                                        <p className="text-dark-300 text-sm flex-1">{rec}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}
