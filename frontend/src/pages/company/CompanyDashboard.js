import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiUsers, HiBriefcase, HiPlus, HiOfficeBuilding } from 'react-icons/hi';
import api from '../../services/api';

export default function CompanyDashboard() {
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRecruiterModal, setShowRecruiterModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        position: '',
        phone: '',
        linkedin: ''
    });

    useEffect(() => {
        fetchCompanyData();
    }, []);

    const fetchCompanyData = async () => {
        try {
            const res = await api.get('/company/my-company');
            setCompany(res.data.data);
        } catch (error) {
            console.error('Failed to fetch company data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRecruiter = async (recruiterId) => {
        if (window.confirm('Are you sure you want to delete this recruiter? This action cannot be undone.')) {
            try {
                await api.delete(`/company/recruiter/${recruiterId}`);
                fetchCompanyData();
                alert('Recruiter deleted successfully');
            } catch (error) {
                console.error('Failed to delete recruiter:', error);
                alert('Failed to delete recruiter');
            }
        }
    };

    const handleCreateRecruiter = async (e) => {
        e.preventDefault();
        try {
            await api.post('/company/recruiter', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                position: formData.position,
                contactInfo: {
                    phone: formData.phone,
                    linkedin: formData.linkedin
                }
            });
            setShowRecruiterModal(false);
            fetchCompanyData();
            setFormData({ name: '', email: '', password: '', position: '', phone: '', linkedin: '' });
            alert('Recruiter created successfully!');
        } catch (error) {
            console.error('Failed to create recruiter:', error);
            alert(error.response?.data?.message || 'Failed to create recruiter');
        }
    };

    if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>;
    if (!company) return <div className="text-center py-20 text-red-400">Company data not found</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <HiOfficeBuilding className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">{company.name}</h1>
                    <p className="text-gray-400">Recruiters</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400">Active Recruiters</h3>
                        <HiUsers className="w-6 h-6 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{company.recruiters?.length || 0}</p>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400">Jobs Posted</h3>
                        <HiBriefcase className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{company.stats?.totalJobsPosted || 0}</p>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400">Total Hires</h3>
                        <HiUsers className="w-6 h-6 text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-white">{company.stats?.totalHires || 0}</p>
                </motion.div>
            </div>

            {/* Recruiters Management */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Recruiters Management</h2>
                    <button
                        onClick={() => setShowRecruiterModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <HiPlus className="w-5 h-5" />
                        Add Recruiter
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50 text-gray-400 text-sm">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Verified</th>
                                <th className="px-6 py-4">Jobs Posted</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {company.recruiters?.map((recruiter) => (
                                <tr key={recruiter._id} className="text-gray-300 hover:bg-gray-700/50">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">
                                            {recruiter.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        {recruiter.user?.name || 'Unknown User'}
                                    </td>
                                    <td className="px-6 py-4">{recruiter.user?.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${recruiter.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                                            }`}>
                                            {recruiter.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {recruiter.verified ? '✅' : '❌'}
                                    </td>
                                    <td className="px-6 py-4">{recruiter.jobsPosted?.length || 0}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDeleteRecruiter(recruiter._id)}
                                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!company.recruiters?.length && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No recruiters found. Add one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Recruiter Modal */}
            {showRecruiterModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700"
                    >
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Add New Recruiter</h2>
                            <button onClick={() => setShowRecruiterModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleCreateRecruiter} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Position / Title</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                    placeholder="e.g. Senior Recruiter"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Phone (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">LinkedIn (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                        value={formData.linkedin}
                                        onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRecruiterModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Create Recruiter
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
