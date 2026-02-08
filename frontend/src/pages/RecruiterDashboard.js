/**
 * Recruiter Dashboard - Manage job postings and applications
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiPlus, HiEye, HiPencil, HiTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import JobCreationWizard from '../components/recruiter/JobCreationWizard';
import CandidatesView from '../components/recruiter/CandidatesView';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function RecruiterDashboard() {
    const navigate = useNavigate();
    const [recruiterProfile, setRecruiterProfile] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newJob, setNewJob] = useState({
        title: '',
        description: '',
        location: { city: '', remote: false },
        type: 'full-time',
        requirements: { skills: '', experience: '' }
    });

    useEffect(() => {
        fetchRecruiterData();
    }, []);

    const fetchRecruiterData = async () => {
        const token = localStorage.getItem('token');
        try {
            const [profileRes, jobsRes] = await Promise.all([
                fetch(`${API_URL}/recruiters/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/jobs?recruiter=me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const profileData = await profileRes.json();
            const jobsData = await jobsRes.json();

            if (profileData.success) {
                setRecruiterProfile(profileData.data);
            }
            if (jobsData.success) {
                setJobs(jobsData.data || []);
            }
        } catch (error) {
            toast.error('Failed to load recruiter data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/jobs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...newJob,
                    requirements: {
                        ...newJob.requirements,
                        skills: newJob.requirements.skills.split(',').map(s => s.trim())
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Job posted successfully!');
                setShowCreateForm(false);
                setNewJob({
                    title: '',
                    description: '',
                    location: { city: '', remote: false },
                    type: 'full-time',
                    requirements: { skills: '', experience: '' }
                });
                fetchRecruiterData();
            } else {
                toast.error(data.message || 'Failed to create job');
            }
        } catch (error) {
            toast.error('Failed to post job');
        }
    };

    // State for Sidebar Navigation
    const [activeView, setActiveView] = useState('dashboard');

    if (loading) {
        return <div className="flex items-center justify-center h-screen">
            <div className="text-white">Loading...</div>
        </div>;
    }

    if (!recruiterProfile || recruiterProfile.status !== 'active') {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16">
                <div className="card p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Recruiter Account Pending</h2>
                    <p className="text-dark-400">
                        {!recruiterProfile
                            ? 'You need to apply for a recruiter account first.'
                            : `Your recruiter account is ${recruiterProfile.status}. Please wait for admin approval.`
                        }
                    </p>
                </div>
            </div>
        );
    }

    // --- Sub-views ---

    const renderDashboard = () => (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Recruiter Dashboard</h1>
                <p className="text-dark-400 mt-2">{recruiterProfile.company?.name} : Recruiter</p>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="card p-6">
                    <div className="text-dark-400 text-sm">Total Jobs Posted</div>
                    <div className="text-3xl font-bold text-white mt-2">
                        {recruiterProfile.stats?.totalJobsPosted || 0}
                    </div>
                </div>
                <div className="card p-6">
                    <div className="text-dark-400 text-sm">Total Applications</div>
                    <div className="text-3xl font-bold text-white mt-2">
                        {recruiterProfile.stats?.totalApplications || 0}
                    </div>
                </div>
                <div className="card p-6">
                    <div className="text-dark-400 text-sm">Total Hires</div>
                    <div className="text-3xl font-bold text-white mt-2">
                        {recruiterProfile.stats?.totalHires || 0}
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Your Job Postings</h3>
                {jobs.length === 0 ? (
                    <div className="card p-8 text-center">
                        <p className="text-dark-400">No jobs posted yet</p>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <div key={job._id} className="card p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-lg font-bold text-white">{job.title}</h4>
                                    <p className="text-dark-400 text-sm mt-1">{job.status}</p>
                                    <div className="flex gap-4 mt-3 text-sm text-dark-400">
                                        <span>{job.stats?.views || 0} views</span>
                                        <span>{job.stats?.applications || 0} applications</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/recruiter/job/${job._id}`)}
                                        className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600"
                                        title="View"
                                    >
                                        <HiEye className="w-5 h-5 text-white" />
                                    </button>
                                    <button className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600" title="Edit">
                                        <HiPencil className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Sidebar */}
            <div className="w-64 bg-dark-800 border-r border-dark-700 p-4 flex flex-col gap-2">
                <div className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2 px-3">Menu</div>

                <button
                    onClick={() => setActiveView('dashboard')}
                    className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeView === 'dashboard' ? 'bg-primary text-white' : 'text-dark-300 hover:bg-dark-700 hover:text-white'}`}
                >
                    <HiEye className="w-5 h-5" /> Dashboard
                </button>

                <button
                    onClick={() => setShowCreateForm(true)}
                    className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors text-dark-300 hover:bg-dark-700 hover:text-white`}
                >
                    <HiPlus className="w-5 h-5" /> Add Job Opening
                </button>

                <button
                    onClick={() => setActiveView('candidates')}
                    className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeView === 'candidates' ? 'bg-primary text-white' : 'text-dark-300 hover:bg-dark-700 hover:text-white'}`}
                >
                    <HiEye className="w-5 h-5" /> Candidates
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-dark-900 custom-scrollbar">
                {activeView === 'dashboard' && renderDashboard()}
                {activeView === 'candidates' && <CandidatesView jobs={jobs} />}
            </div>

            {/* Create Job Wizard Modal */}
            {showCreateForm && (
                <JobCreationWizard
                    onClose={() => setShowCreateForm(false)}
                    onJobCreated={() => {
                        setShowCreateForm(false);
                        fetchRecruiterData();
                        setActiveView('dashboard'); // Go back to dashboard to see new job
                    }}
                />
            )}
        </div>
    );
}
