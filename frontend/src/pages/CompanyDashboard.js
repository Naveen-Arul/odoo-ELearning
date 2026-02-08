/**
 * Company Dashboard - Company admin manages recruiters
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiPlus, HiX, HiTrash, HiUsers, HiBriefcase } from 'react-icons/hi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function CompanyDashboard() {
    const [company, setCompany] = useState(null);
    const [recruiters, setRecruiters] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const [newRecruiter, setNewRecruiter] = useState({
        userId: '',
        contactInfo: {
            email: '',
            phone: '',
            linkedin: ''
        }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        setLoading(true);

        try {
            const [companyRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/companies/me/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/admin/users?limit=1000`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const companyData = await companyRes.json();
            const usersData = await usersRes.json();

            if (companyData.success) {
                setCompany(companyData.data);
                setRecruiters(companyData.data.recruiters || []);
            }
            if (usersData.success) {
                setUsers(usersData.data || []);
            }
        } catch (error) {
            toast.error('Failed to load company data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRecruiter = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/companies/${company._id}/recruiters`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newRecruiter)
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Recruiter added successfully!');
                setShowAddModal(false);
                setNewRecruiter({
                    userId: '',
                    contactInfo: { email: '', phone: '', linkedin: '' }
                });
                fetchData();
            } else {
                toast.error(data.message || 'Failed to add recruiter');
            }
        } catch (error) {
            toast.error('Failed to add recruiter');
        }
    };

    const handleRemoveRecruiter = async (recruiterId) => {
        if (!window.confirm('Are you sure you want to remove this recruiter?')) {
            return;
        }

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/companies/${company._id}/recruiters/${recruiterId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Recruiter removed');
                fetchData();
            } else {
                toast.error(data.message || 'Failed to remove recruiter');
            }
        } catch (error) {
            toast.error('Failed to remove recruiter');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="text-white">Loading...</div></div>;
    }

    if (!company) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="card p-8 text-center">
                    <p className="text-dark-400">Company not found. Contact admin to set up your company.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Company Header */}
            <div className="card p-6 mb-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{company.name} : Admin</h1>
                        <p className="text-dark-400 mt-2">{company.description}</p>
                        <div className="flex gap-4 mt-4 text-sm text-dark-400">
                            {company.industry && <span>Industry: {company.industry}</span>}
                            {company.size && <span>Size: {company.size}</span>}
                            {company.location?.city && <span>Location: {company.location.city}</span>}
                        </div>
                    </div>
                    <span className={`px-4 py-2 rounded-lg ${company.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        company.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                        }`}>
                        {company.status}
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="card p-4">
                    <div className="text-sm text-dark-400">Recruiters</div>
                    <div className="text-2xl font-bold text-white">{company.stats?.totalRecruiters || 0}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-dark-400">Jobs Posted</div>
                    <div className="text-2xl font-bold text-blue-400">{company.stats?.totalJobsPosted || 0}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-dark-400">Applications</div>
                    <div className="text-2xl font-bold text-purple-400">{company.stats?.totalApplications || 0}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-dark-400">Hires</div>
                    <div className="text-2xl font-bold text-green-400">{company.stats?.totalHires || 0}</div>
                </div>
            </div>

            {/* Recruiters Section */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Recruiters</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                    disabled={recruiters.length >= company.settings?.maxRecruiters}
                >
                    <HiPlus className="w-5 h-5" />
                    Add Recruiter
                </button>
            </div>

            {recruiters.length >= company.settings?.maxRecruiters && (
                <div className="card p-4 mb-4 bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-yellow-400 text-sm">
                        Maximum recruiter limit reached ({company.settings.maxRecruiters}). Contact admin to increase limit.
                    </p>
                </div>
            )}

            {/* Recruiters List */}
            <div className="grid gap-4">
                {recruiters.length === 0 ? (
                    <div className="card p-8 text-center">
                        <HiUsers className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                        <p className="text-dark-400">No recruiters yet. Add your first recruiter to start hiring.</p>
                    </div>
                ) : (
                    recruiters.map((recruiter) => (
                        <motion.div
                            key={recruiter._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-6"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    {recruiter.user?.avatar ? (
                                        <img src={recruiter.user.avatar} alt={recruiter.user?.name} className="w-12 h-12 rounded-full" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-red-600 flex items-center justify-center text-white font-bold">
                                            {recruiter.user?.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{recruiter.user?.name}</h3>
                                        <p className="text-dark-400 text-sm">{recruiter.user?.email}</p>
                                        <div className="flex gap-4 mt-2 text-sm text-dark-400">
                                            <div className="flex items-center gap-1">
                                                <HiBriefcase className="w-4 h-4" />
                                                {recruiter.jobsPosted?.length || 0} jobs posted
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs ${recruiter.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                'bg-muted text-muted-foreground'
                                                }`}>
                                                {recruiter.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveRecruiter(recruiter._id)}
                                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                    title="Remove recruiter"
                                >
                                    <HiTrash className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Add Recruiter Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card p-6 max-w-lg w-full"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Add Recruiter</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                                <HiX className="w-6 h-6 text-dark-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddRecruiter} className="space-y-4">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Select User *</label>
                                <select
                                    required
                                    value={newRecruiter.userId}
                                    onChange={(e) => setNewRecruiter({ ...newRecruiter, userId: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Select user...</option>
                                    {users.filter(u => !recruiters.find(r => r.user?._id === u._id)).map(user => (
                                        <option key={user._id} value={user._id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Contact Email</label>
                                <input
                                    type="email"
                                    value={newRecruiter.contactInfo.email}
                                    onChange={(e) => setNewRecruiter({
                                        ...newRecruiter,
                                        contactInfo: { ...newRecruiter.contactInfo, email: e.target.value }
                                    })}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Phone</label>
                                <input
                                    type="tel"
                                    value={newRecruiter.contactInfo.phone}
                                    onChange={(e) => setNewRecruiter({
                                        ...newRecruiter,
                                        contactInfo: { ...newRecruiter.contactInfo, phone: e.target.value }
                                    })}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="block text-white text-sm font-medium mb-2">LinkedIn</label>
                                <input
                                    type="url"
                                    value={newRecruiter.contactInfo.linkedin}
                                    onChange={(e) => setNewRecruiter({
                                        ...newRecruiter,
                                        contactInfo: { ...newRecruiter.contactInfo, linkedin: e.target.value }
                                    })}
                                    className="input"
                                />
                            </div>

                            <button type="submit" className="btn-primary w-full">
                                Add Recruiter
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
