/**
 * Recruiter Job Detail - View and manage applicants for a specific job
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HiArrowLeft, HiFilter, HiSortAscending, HiEye, HiCheck, HiX,
    HiOfficeBuilding, HiLocationMarker, HiBriefcase, HiCurrencyDollar,
    HiClipboardList
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1';

export default function RecruiterJobDetail() {
    const { jobId } = useParams();
    const navigate = useNavigate();

    const [job, setJob] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('score'); // score, date, name
    const [selectedApplicants, setSelectedApplicants] = useState([]);

    useEffect(() => {
        fetchJobAndApplications();
    }, [jobId]);

    const fetchJobAndApplications = async () => {
        const token = localStorage.getItem('token');
        setLoading(true);

        try {
            const [jobRes, appsRes] = await Promise.all([
                fetch(`${API_URL}/jobs/${jobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/jobs/${jobId}/applications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const jobData = await jobRes.json();
            const appsData = await appsRes.json();

            if (jobData.success) {
                setJob(jobData.data);
            }
            if (appsData.success) {
                setApplications(appsData.data || []);
            }
        } catch (error) {
            toast.error('Failed to load job details');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (applicationId, newStatus, note = '') => {
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/jobs/applications/${applicationId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus, note })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Status updated');
                fetchJobAndApplications();
            } else {
                toast.error(data.message || 'Failed to update status');
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedApplicants.length === 0) {
            toast.error('Please select applicants first');
            return;
        }

        const confirmMessage = `Are you sure you want to ${action} ${selectedApplicants.length} applicant(s)?`;
        if (!window.confirm(confirmMessage)) return;

        const promises = selectedApplicants.map(appId =>
            handleStatusUpdate(appId, action)
        );

        await Promise.all(promises);
        setSelectedApplicants([]);
    };

    const filteredApplications = applications.filter(app => {
        if (filterStatus === 'all') return true;
        return app.status === filterStatus;
    });

    const sortedApplications = [...filteredApplications].sort((a, b) => {
        switch (sortBy) {
            case 'score':
                return (b.matchScore || 0) - (a.matchScore || 0);
            case 'date':
                return new Date(b.appliedAt) - new Date(a.appliedAt);
            case 'name':
                return (a.applicant?.name || '').localeCompare(b.applicant?.name || '');
            default:
                return 0;
        }
    });

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-400';
    };

    const getStatusColor = (status) => {
        const colors = {
            'submitted': 'bg-blue-500/20 text-blue-400',
            'under-review': 'bg-yellow-500/20 text-yellow-400',
            'shortlisted': 'bg-green-500/20 text-green-400',
            'interview-scheduled': 'bg-purple-500/20 text-purple-400',
            'rejected': 'bg-red-500/20 text-red-400',
            'accepted': 'bg-emerald-500/20 text-emerald-400'
        };
        return colors[status] || 'bg-muted text-muted-foreground';
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
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <button
                onClick={() => navigate('/recruiter-dashboard')}
                className="flex items-center gap-2 text-dark-400 hover:text-white mb-6 transition"
            >
                <HiArrowLeft className="w-5 h-5" />
                Back to Dashboard
            </button>

            {/* Job Details Card */}
            <div className="card p-6 mb-8">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <HiOfficeBuilding className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">{job.title}</h1>
                            <p className="text-dark-400 mt-1">{job.company}</p>
                            <div className="flex flex-wrap gap-4 mt-4 text-sm text-dark-400">
                                {job.location?.city && (
                                    <div className="flex items-center gap-1">
                                        <HiLocationMarker className="w-4 h-4" />
                                        {job.location.city}
                                        {job.location.remote && ' (Remote)'}
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <HiBriefcase className="w-4 h-4" />
                                    {job.type}
                                </div>
                                {job.salary && (
                                    <div className="flex items-center gap-1">
                                        <HiCurrencyDollar className="w-4 h-4" />
                                        ${job.salary.min?.toLocaleString()} - ${job.salary.max?.toLocaleString()} {job.salary.period}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(job.status)}`}>
                        {job.status}
                    </div>
                </div>

                {/* Job Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-dark-700 p-4 rounded-lg">
                        <div className="text-sm text-dark-400">Total Applications</div>
                        <div className="text-2xl font-bold text-white">{applications.length}</div>
                    </div>
                    <div className="bg-dark-700 p-4 rounded-lg">
                        <div className="text-sm text-dark-400">Shortlisted</div>
                        <div className="text-2xl font-bold text-green-400">
                            {applications.filter(a => a.status === 'shortlisted').length}
                        </div>
                    </div>
                    <div className="bg-dark-700 p-4 rounded-lg">
                        <div className="text-sm text-dark-400">Avg Match Score</div>
                        <div className="text-2xl font-bold text-blue-400">
                            {applications.length > 0
                                ? Math.round(applications.reduce((sum, a) => sum + (a.matchScore || 0), 0) / applications.length)
                                : 0}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="card p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <HiFilter className="w-5 h-5 text-dark-400" />
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'all' ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'}`}
                        >
                            All ({applications.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('submitted')}
                            className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'submitted' ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'}`}
                        >
                            Submitted ({applications.filter(a => a.status === 'submitted').length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('shortlisted')}
                            className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'shortlisted' ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'}`}
                        >
                            Shortlisted ({applications.filter(a => a.status === 'shortlisted').length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('interview-scheduled')}
                            className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'interview-scheduled' ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'}`}
                        >
                            Interview ({applications.filter(a => a.status === 'interview-scheduled').length})
                        </button>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <HiSortAscending className="w-5 h-5 text-dark-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="input"
                        >
                            <option value="score">Match Score</option>
                            <option value="date">Application Date</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedApplicants.length > 0 && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                        <span className="text-white text-sm">
                            {selectedApplicants.length} selected
                        </span>
                        <button
                            onClick={() => handleBulkAction('shortlisted')}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                        >
                            Shortlist All
                        </button>
                        <button
                            onClick={() => handleBulkAction('rejected')}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                        >
                            Reject All
                        </button>
                        <button
                            onClick={() => setSelectedApplicants([])}
                            className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white text-sm rounded ml-auto"
                        >
                            Clear Selection
                        </button>
                    </div>
                )}
            </div>

            {/* Applications List */}
            <div className="space-y-4">
                {sortedApplications.length === 0 ? (
                    <div className="card p-8 text-center">
                        <HiClipboardList className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                        <p className="text-dark-400">No applications found</p>
                    </div>
                ) : (
                    sortedApplications.map((app) => (
                        <motion.div
                            key={app._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-6"
                        >
                            <div className="flex items-start gap-4">
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={selectedApplicants.includes(app._id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedApplicants([...selectedApplicants, app._id]);
                                        } else {
                                            setSelectedApplicants(selectedApplicants.filter(id => id !== app._id));
                                        }
                                    }}
                                    className="mt-1 w-5 h-5"
                                />

                                {/* Match Score Badge */}
                                <div className="text-center">
                                    <div className={`text-3xl font-bold ${getScoreColor(app.matchScore)}`}>
                                        {app.matchScore || 0}%
                                    </div>
                                    <div className="text-xs text-dark-400 mt-1">Match</div>
                                </div>

                                {/* Applicant Info */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">
                                                {app.applicant?.name || 'Unknown'}
                                            </h3>
                                            <p className="text-sm text-dark-400">{app.applicant?.email}</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-lg text-sm ${getStatusColor(app.status)}`}>
                                            {app.status}
                                        </div>
                                    </div>

                                    {/* Skill Breakdown */}
                                    {app.skillAnalysis?.breakdown && (
                                        <div className="mt-4 grid grid-cols-3 gap-3">
                                            <div className="bg-dark-700 p-3 rounded-lg">
                                                <div className="text-xs text-dark-400">Skills Match</div>
                                                <div className="text-lg font-bold text-white">
                                                    {app.skillAnalysis.breakdown.skills?.score || 0}%
                                                </div>
                                                <div className="text-xs text-dark-400 mt-1">
                                                    {(app.skillAnalysis.breakdown.skills?.matched?.length || 0)} / {app.skillAnalysis.breakdown.skills?.total || 0} matched
                                                </div>
                                            </div>
                                            <div className="bg-dark-700 p-3 rounded-lg">
                                                <div className="text-xs text-dark-400">Experience</div>
                                                <div className="text-lg font-bold text-white">
                                                    {app.skillAnalysis.breakdown.experience?.score || 0}%
                                                </div>
                                                <div className="text-xs text-dark-400 mt-1">
                                                    {app.skillAnalysis.breakdown.experience?.userLevel || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="bg-dark-700 p-3 rounded-lg">
                                                <div className="text-xs text-dark-400">Certifications</div>
                                                <div className="text-lg font-bold text-white">
                                                    {app.skillAnalysis.breakdown.certifications?.score || 0}%
                                                </div>
                                                <div className="text-xs text-dark-400 mt-1">
                                                    {(app.skillAnalysis.breakdown.certifications?.matched?.length || 0)} / {app.skillAnalysis.breakdown.certifications?.total || 0}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Applied Date */}
                                    <div className="mt-3 text-sm text-dark-400">
                                        Applied: {new Date(app.appliedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => navigate(`/recruiter/applicant/${app._id}`)}
                                            className="btn-primary flex items-center gap-2 text-sm"
                                        >
                                            <HiEye className="w-4 h-4" />
                                            View Details
                                        </button>
                                        {app.status !== 'shortlisted' && app.status !== 'rejected' && app.status !== 'accepted' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(app._id, 'shortlisted', 'Shortlisted by recruiter')}
                                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-1"
                                                >
                                                    <HiCheck className="w-4 h-4" />
                                                    Shortlist
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(app._id, 'rejected', 'Not a good fit')}
                                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1"
                                                >
                                                    <HiX className="w-4 h-4" />
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
