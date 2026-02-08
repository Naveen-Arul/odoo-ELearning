/**
 * Job Detail Page - View job details and apply with skill matching preview
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HiArrowLeft, HiLocationMarker, HiBriefcase, HiCurrencyDollar,
    HiOfficeBuilding, HiCheckCircle, HiXCircle, HiClock
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1';

export default function JobDetailPage() {
    const { jobId } = useParams();
    const navigate = useNavigate();

    const [job, setJob] = useState(null);
    const [matchPreview, setMatchPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [application, setApplication] = useState({
        coverLetter: '',
        resume: ''
    });

    useEffect(() => {
        fetchJobAndMatch();
    }, [jobId]);

    const fetchJobAndMatch = async () => {
        const token = localStorage.getItem('token');
        setLoading(true);

        try {
            const [jobRes, matchRes] = await Promise.all([
                fetch(`${API_URL}/jobs/${jobId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                }),
                token ? fetch(`${API_URL}/jobs/${jobId}/match-preview`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }) : Promise.resolve(null)
            ]);

            const jobData = await jobRes.json();
            if (jobData.success) {
                setJob(jobData.data);
            }

            if (matchRes) {
                const matchData = await matchRes.json();
                if (matchData.success) {
                    setMatchPreview(matchData.data);
                }
            }
        } catch (error) {
            if (error.message?.includes('already applied')) {
                setHasApplied(true);
            } else {
                toast.error('Failed to load job details');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        if (!token) {
            toast.error('Please login to apply');
            navigate('/login');
            return;
        }

        setApplying(true);
        try {
            const response = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(application)
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Application submitted successfully!');
                setHasApplied(true);
                navigate('/my-applications');
            } else {
                toast.error(data.message || 'Failed to apply');
            }
        } catch (error) {
            toast.error('Failed to submit application');
        } finally {
            setApplying(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="card p-8 text-center">
                    <p className="text-dark-400">Job not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate('/jobs')}
                className="flex items-center gap-2 text-dark-400 hover:text-white mb-6 transition"
            >
                <HiArrowLeft className="w-5 h-5" />
                Back to Jobs
            </button>

            {/* Job Header */}
            <div className="card p-8 mb-6">
                <div className="flex items-start gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg">
                        <HiOfficeBuilding className="w-12 h-12 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold text-white mb-2">{job.title}</h1>
                        <p className="text-xl text-dark-400">{job.company}</p>
                        <div className="flex flex-wrap gap-4 mt-4 text-dark-400">
                            {job.location?.city && (
                                <div className="flex items-center gap-2">
                                    <HiLocationMarker className="w-5 h-5" />
                                    {job.location.city}
                                    {job.location.remote && ' (Remote)'}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <HiBriefcase className="w-5 h-5" />
                                {job.type}
                            </div>
                            {job.salary && (
                                <div className="flex items-center gap-2">
                                    <HiCurrencyDollar className="w-5 h-5" />
                                    ${job.salary.min?.toLocaleString()} - ${job.salary.max?.toLocaleString()} {job.salary.period}
                                </div>
                            )}
                            {job.postedAt && (
                                <div className="flex items-center gap-2">
                                    <HiClock className="w-5 h-5" />
                                    Posted {new Date(job.postedAt).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Match Score Preview */}
            {matchPreview && !hasApplied && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6 mb-6 border-2 border-primary/30"
                >
                    <h2 className="text-xl font-bold text-white mb-4">Your Match Score</h2>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className={`text-6xl font-bold ${getScoreColor(matchPreview.overall)}`}>
                                {matchPreview.overall}%
                            </div>
                            <div className="text-sm text-dark-400 mt-2">Overall Match</div>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            <div className="bg-dark-700 p-4 rounded-lg">
                                <div className="text-sm text-dark-400">Skills</div>
                                <div className={`text-2xl font-bold ${getScoreColor(matchPreview.breakdown.skills.score)}`}>
                                    {matchPreview.breakdown.skills.score}%
                                </div>
                                <div className="text-xs text-dark-400 mt-1">
                                    {matchPreview.breakdown.skills.matched.length} / {matchPreview.breakdown.skills.total} matched
                                </div>
                            </div>
                            <div className="bg-dark-700 p-4 rounded-lg">
                                <div className="text-sm text-dark-400">Experience</div>
                                <div className={`text-2xl font-bold ${getScoreColor(matchPreview.breakdown.experience.score)}`}>
                                    {matchPreview.breakdown.experience.score}%
                                </div>
                                <div className="text-xs text-dark-400 mt-1">
                                    {matchPreview.breakdown.experience.userLevel}
                                </div>
                            </div>
                            <div className="bg-dark-700 p-4 rounded-lg">
                                <div className="text-sm text-dark-400">Certifications</div>
                                <div className={`text-2xl font-bold ${getScoreColor(matchPreview.breakdown.certifications.score)}`}>
                                    {matchPreview.breakdown.certifications.score}%
                                </div>
                                <div className="text-xs text-dark-400 mt-1">
                                    {matchPreview.breakdown.certifications.matched.length} matched
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Skill Gap Analysis */}
                    {matchPreview.skillGaps && matchPreview.skillGaps.length > 0 && (
                        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <h3 className="text-sm font-semibold text-yellow-400 mb-2">Missing Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {matchPreview.skillGaps.map((skill, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-dark-700 text-yellow-400 rounded-full text-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                            <p className="text-sm text-dark-400 mt-3">
                                Consider learning these skills to improve your match score
                            </p>
                        </div>
                    )}

                    {/* Matched Skills */}
                    {matchPreview.breakdown.skills.matched.length > 0 && (
                        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <h3 className="text-sm font-semibold text-green-400 mb-2">Your Matching Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {matchPreview.breakdown.skills.matched.map((skill, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-dark-700 text-green-400 rounded-full text-sm flex items-center gap-1">
                                        <HiCheckCircle className="w-4 h-4" />
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Has Applied Message */}
            {hasApplied && (
                <div className="card p-6 mb-6 bg-green-500/10 border-2 border-green-500/30">
                    <div className="flex items-center gap-3">
                        <HiCheckCircle className="w-8 h-8 text-green-400" />
                        <div>
                            <h3 className="text-lg font-bold text-white">Application Submitted</h3>
                            <p className="text-dark-400">You have already applied to this position</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Description */}
            <div className="card p-6 mb-6">
                <h2 className="text-2xl font-bold text-white mb-4">Job Description</h2>
                <p className="text-dark-300 whitespace-pre-line">{job.description}</p>
            </div>

            {/* Requirements */}
            {job.requirements && (
                <div className="card p-6 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Requirements</h2>
                    {job.requirements.skills && job.requirements.skills.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-white mb-2">Required Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {job.requirements.skills.map((skill, idx) => {
                                    const isMatched = matchPreview?.breakdown.skills.matched.includes(skill);
                                    return (
                                        <span
                                            key={idx}
                                            className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${isMatched
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                    : 'bg-dark-700 text-dark-400'
                                                }`}
                                        >
                                            {isMatched ? <HiCheckCircle className="w-4 h-4" /> : <HiXCircle className="w-4 h-4" />}
                                            {skill}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {job.requirements.experience && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-white mb-2">Experience</h3>
                            <p className="text-dark-300">{job.requirements.experience}</p>
                        </div>
                    )}
                    {job.requirements.education && (
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-white mb-2">Education</h3>
                            <p className="text-dark-300">{job.requirements.education}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Application Form */}
            {!hasApplied && job.status === 'active' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6"
                >
                    <h2 className="text-2xl font-bold text-white mb-4">Apply for This Position</h2>
                    <form onSubmit={handleApply} className="space-y-4">
                        <div>
                            <label className="block text-white text-sm font-medium mb-2">
                                Resume/CV URL
                            </label>
                            <input
                                type="url"
                                placeholder="https://..."
                                className="input"
                                value={application.resume}
                                onChange={(e) => setApplication({ ...application, resume: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-white text-sm font-medium mb-2">
                                Cover Letter
                            </label>
                            <textarea
                                rows={6}
                                placeholder="Tell us why you're a great fit for this role..."
                                className="input"
                                value={application.coverLetter}
                                onChange={(e) => setApplication({ ...application, coverLetter: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={applying}
                            className="btn-primary w-full disabled:opacity-50"
                        >
                            {applying ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </form>
                </motion.div>
            )}
        </div>
    );
}
