/**
 * Admin Recruiters Management Page
 * Create, approve, suspend, and monitor recruiters
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiPlus, HiCheck, HiX, HiBan, HiTrash, HiOfficeBuilding,
    HiMail, HiPhone, HiGlobe, HiFilter, HiSearch
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1';

export default function AdminRecruiters() {
    const [recruiters, setRecruiters] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filter, setFilter] = useState('all'); // all, pending, active, suspended
    const [searchTerm, setSearchTerm] = useState('');

    const [newRecruiter, setNewRecruiter] = useState({
        userId: '',
        company: {
            name: '',
            website: '',
            industry: '',
            size: '1-10',
            location: '',
            description: ''
        },
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
            const [recruitersRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/recruiters`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/admin/users?limit=1000`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const recruitersData = await recruitersRes.json();
            const usersData = await usersRes.json();

            if (recruitersData.success) {
                setRecruiters(recruitersData.data || []);
            }
            if (usersData.success) {
                setUsers(usersData.data || []);
            }
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRecruiter = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/recruiters/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newRecruiter)
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Recruiter created successfully!');
                setShowCreateModal(false);
                setNewRecruiter({
                    userId: '',
                    company: {
                        name: '',
                        website: '',
                        industry: '',
                        size: '1-10',
                        location: '',
                        description: ''
                    },
                    contactInfo: {
                        email: '',
                        phone: '',
                        linkedin: ''
                    }
                });
                fetchData();
            } else {
                toast.error(data.message || 'Failed to create recruiter');
            }
        } catch (error) {
            toast.error('Failed to create recruiter');
        }
    };

    const handleApprove = async (recruiterId) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/recruiters/${recruiterId}/approve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Recruiter approved!');
                fetchData();
            } else {
                toast.error(data.message || 'Failed to approve');
            }
        } catch (error) {
            toast.error('Failed to approve recruiter');
        }
    };

    const handleSuspend = async (recruiterId) => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/recruiters/${recruiterId}/suspend`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Recruiter suspended!');
                fetchData();
            } else {
                toast.error(data.message || 'Failed to suspend');
            }
        } catch (error) {
            toast.error('Failed to suspend recruiter');
        }
    };

    const handleDelete = async (recruiterId) => {
        if (!window.confirm('Are you sure you want to delete this recruiter? This will also delete all their job postings.')) {
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/recruiters/${recruiterId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Recruiter deleted!');
                fetchData();
            } else {
                toast.error(data.message || 'Failed to delete');
            }
        } catch (error) {
            toast.error('Failed to delete recruiter');
        }
    };

    const filteredRecruiters = recruiters.filter(rec => {
        const matchesFilter = filter === 'all' || rec.status === filter;
        const matchesSearch = searchTerm === '' ||
            rec.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Recruiter Management</h1>
                    <p className="text-dark-400 mt-2">
                        {recruiters.length} total recruiters
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <HiPlus className="w-5 h-5" />
                    Create Recruiter
                </button>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <div className="card p-6">
                    <div className="text-dark-400 text-sm">Pending</div>
                    <div className="text-3xl font-bold text-yellow-400 mt-2">
                        {recruiters.filter(r => r.status === 'pending').length}
                    </div>
                </div>
                <div className="card p-6">
                    <div className="text-dark-400 text-sm">Active</div>
                    <div className="text-3xl font-bold text-green-400 mt-2">
                        {recruiters.filter(r => r.status === 'active').length}
                    </div>
                </div>
                <div className="card p-6">
                    <div className="text-dark-400 text-sm">Suspended</div>
                    <div className="text-3xl font-bold text-red-400 mt-2">
                        {recruiters.filter(r => r.status === 'suspended').length}
                    </div>
                </div>
                <div className="card p-6">
                    <div className="text-dark-400 text-sm">Total Jobs Posted</div>
                    <div className="text-3xl font-bold text-blue-400 mt-2">
                        {recruiters.reduce((sum, r) => sum + (r.stats?.totalJobsPosted || 0), 0)}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2 text-white">
                        <HiFilter className="w-5 h-5 text-dark-400" />
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg transition ${filter === 'all' ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-lg transition ${filter === 'pending' ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-4 py-2 rounded-lg transition ${filter === 'active' ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilter('suspended')}
                            className={`px-4 py-2 rounded-lg transition ${filter === 'suspended' ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'}`}
                        >
                            Suspended
                        </button>
                    </div>
                    <div className="flex-1 relative">
                        <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by company or user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Recruiters List */}
            <div className="space-y-4">
                {filteredRecruiters.length === 0 ? (
                    <div className="card p-8 text-center">
                        <p className="text-dark-400">No recruiters found</p>
                    </div>
                ) : (
                    filteredRecruiters.map((recruiter) => (
                        <motion.div
                            key={recruiter._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-6"
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg">
                                            <HiOfficeBuilding className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-white">
                                                {recruiter.company?.name || 'Unnamed Company'}
                                            </h3>
                                            <p className="text-dark-400 text-sm mt-1">
                                                {recruiter.user?.name} ({recruiter.user?.email})
                                            </p>
                                            <div className="flex items-center gap-4 mt-3 text-sm text-dark-400">
                                                {recruiter.company?.industry && (
                                                    <span>{recruiter.company.industry}</span>
                                                )}
                                                {recruiter.company?.size && (
                                                    <span>{recruiter.company.size} employees</span>
                                                )}
                                                {recruiter.company?.location && (
                                                    <span>{recruiter.company.location}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                {recruiter.contactInfo?.email && (
                                                    <div className="flex items-center gap-1 text-dark-400">
                                                        <HiMail className="w-4 h-4" />
                                                        {recruiter.contactInfo.email}
                                                    </div>
                                                )}
                                                {recruiter.company?.website && (
                                                    <div className="flex items-center gap-1 text-dark-400">
                                                        <HiGlobe className="w-4 h-4" />
                                                        <a href={recruiter.company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                                                            Website
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-4">
                                        <div className="bg-dark-700 p-3 rounded-lg">
                                            <div className="text-xs text-dark-400">Jobs Posted</div>
                                            <div className="text-lg font-bold text-white">
                                                {recruiter.stats?.totalJobsPosted || 0}
                                            </div>
                                        </div>
                                        <div className="bg-dark-700 p-3 rounded-lg">
                                            <div className="text-xs text-dark-400">Applications</div>
                                            <div className="text-lg font-bold text-white">
                                                {recruiter.stats?.totalApplications || 0}
                                            </div>
                                        </div>
                                        <div className="bg-dark-700 p-3 rounded-lg">
                                            <div className="text-xs text-dark-400">Status</div>
                                            <div className={`text-lg font-bold ${recruiter.status === 'active' ? 'text-green-400' :
                                                    recruiter.status === 'pending' ? 'text-yellow-400' :
                                                        'text-red-400'
                                                }`}>
                                                {recruiter.status}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 md:items-end">
                                    {recruiter.status === 'pending' && (
                                        <button
                                            onClick={() => handleApprove(recruiter._id)}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            <HiCheck className="w-5 h-5" />
                                            Approve
                                        </button>
                                    )}
                                    {recruiter.status === 'active' && (
                                        <button
                                            onClick={() => handleSuspend(recruiter._id)}
                                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-2"
                                        >
                                            <HiBan className="w-5 h-5" />
                                            Suspend
                                        </button>
                                    )}
                                    {recruiter.status === 'suspended' && (
                                        <button
                                            onClick={() => handleApprove(recruiter._id)}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            <HiCheck className="w-5 h-5" />
                                            Activate
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(recruiter._id)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                                    >
                                        <HiTrash className="w-5 h-5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-white mb-6">Create Recruiter Account</h2>
                            <form onSubmit={handleCreateRecruiter} className="space-y-4">
                                {/* User Selection */}
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">
                                        Select User <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        required
                                        className="input"
                                        value={newRecruiter.userId}
                                        onChange={(e) => setNewRecruiter({ ...newRecruiter, userId: e.target.value })}
                                    >
                                        <option value="">Choose a user</option>
                                        {users.filter(u => u.role !== 'admin').map(user => (
                                            <option key={user._id} value={user._id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Company Details */}
                                <div className="border-t border-dark-700 pt-4">
                                    <h3 className="text-lg font-semibold text-white mb-3">Company Information</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <input
                                            required
                                            placeholder="Company Name *"
                                            className="input"
                                            value={newRecruiter.company.name}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                company: { ...newRecruiter.company, name: e.target.value }
                                            })}
                                        />
                                        <input
                                            placeholder="Website"
                                            className="input"
                                            value={newRecruiter.company.website}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                company: { ...newRecruiter.company, website: e.target.value }
                                            })}
                                        />
                                        <input
                                            placeholder="Industry"
                                            className="input"
                                            value={newRecruiter.company.industry}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                company: { ...newRecruiter.company, industry: e.target.value }
                                            })}
                                        />
                                        <select
                                            className="input"
                                            value={newRecruiter.company.size}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                company: { ...newRecruiter.company, size: e.target.value }
                                            })}
                                        >
                                            <option value="1-10">1-10 employees</option>
                                            <option value="11-50">11-50 employees</option>
                                            <option value="51-200">51-200 employees</option>
                                            <option value="201-500">201-500 employees</option>
                                            <option value="501-1000">501-1000 employees</option>
                                            <option value="1000+">1000+ employees</option>
                                        </select>
                                        <input
                                            placeholder="Location"
                                            className="input md:col-span-2"
                                            value={newRecruiter.company.location}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                company: { ...newRecruiter.company, location: e.target.value }
                                            })}
                                        />
                                        <textarea
                                            placeholder="Description"
                                            rows={3}
                                            className="input md:col-span-2"
                                            value={newRecruiter.company.description}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                company: { ...newRecruiter.company, description: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="border-t border-dark-700 pt-4">
                                    <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <input
                                            type="email"
                                            placeholder="Contact Email"
                                            className="input"
                                            value={newRecruiter.contactInfo.email}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                contactInfo: { ...newRecruiter.contactInfo, email: e.target.value }
                                            })}
                                        />
                                        <input
                                            placeholder="Phone"
                                            className="input"
                                            value={newRecruiter.contactInfo.phone}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                contactInfo: { ...newRecruiter.contactInfo, phone: e.target.value }
                                            })}
                                        />
                                        <input
                                            placeholder="LinkedIn URL"
                                            className="input md:col-span-2"
                                            value={newRecruiter.contactInfo.linkedin}
                                            onChange={(e) => setNewRecruiter({
                                                ...newRecruiter,
                                                contactInfo: { ...newRecruiter.contactInfo, linkedin: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="submit" className="btn-primary flex-1">
                                        Create Recruiter
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
