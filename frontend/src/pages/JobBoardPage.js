/**
 * Job Board Page - Browse and apply to jobs
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiLocationMarker, HiBriefcase, HiClock, HiCurrencyDollar } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function JobBoardPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        category: '',
        type: '',
        remote: false
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobs();
    }, [filters]);

    const fetchJobs = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.category) params.append('category', filters.category);
            if (filters.type) params.append('type', filters.type);
            if (filters.remote) params.append('remote', 'true');

            const response = await fetch(`${API_URL}/jobs?${params}`);
            const data = await response.json();

            if (data.success) {
                setJobs(data.data || []);
            }
        } catch (error) {
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (jobId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to apply');
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    coverLetter: 'Generated from profile data'
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Application submitted successfully!');
            } else {
                toast.error(data.message || 'Failed to apply');
            }
        } catch (error) {
            toast.error('Failed to submit application');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">
            <div className="text-white">Loading jobs...</div>
        </div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Job Board</h1>
                <p className="text-dark-400 mt-2">Find your next opportunity</p>
            </div>

            {/* Filters */}
            <div className="card p-6 mb-6">
                <div className="grid md:grid-cols-4 gap-4">
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        className="input"
                    >
                        <option value="">All Categories</option>
                        <option value="software-engineering">Software Engineering</option>
                        <option value="data-science">Data Science</option>
                        <option value="frontend">Frontend</option>
                        <option value="backend">Backend</option>
                        <option value="fullstack">Full Stack</option>
                    </select>

                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="input"
                    >
                        <option value="">All Types</option>
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                        <option value="internship">Internship</option>
                    </select>

                    <label className="flex items-center gap-2 text-white">
                        <input
                            type="checkbox"
                            checked={filters.remote}
                            onChange={(e) => setFilters({ ...filters, remote: e.target.checked })}
                            className="w-4 h-4"
                        />
                        Remote Only
                    </label>
                </div>
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
                {jobs.length === 0 ? (
                    <div className="card p-8 text-center">
                        <p className="text-dark-400">No jobs found matching your filters</p>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <motion.div
                            key={job._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-6 hover:shadow-xl transition-shadow"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white">{job.title}</h3>
                                    <p className="text-primary-400 font-medium mt-1">{job.company}</p>

                                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-dark-400">
                                        <div className="flex items-center gap-2">
                                            <HiLocationMarker className="w-4 h-4" />
                                            {job.location?.city || 'Remote'} {job.location?.remote && '(Remote)'}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <HiBriefcase className="w-4 h-4" />
                                            {job.type}
                                        </div>
                                        {job.salary?.max && (
                                            <div className="flex items-center gap-2">
                                                <HiCurrencyDollar className="w-4 h-4" />
                                                ${job.salary.min}k - ${job.salary.max}k/year
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-dark-300 mt-4 line-clamp-2">{job.description}</p>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {job.requirements?.skills?.slice(0, 5).map((skill, idx) => (
                                            <span key={idx} className="px-3 py-1 bg-dark-700 text-primary-400 rounded-full text-xs">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="ml-6 flex flex-col gap-2">
                                    <button
                                        onClick={() => handleApply(job._id)}
                                        className="btn-primary btn-sm whitespace-nowrap"
                                    >
                                        Apply Now
                                    </button>
                                    <button
                                        onClick={() => navigate(`/jobs/${job._id}`)}
                                        className="btn-secondary btn-sm"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
