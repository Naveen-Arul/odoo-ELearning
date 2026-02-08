/**
 * Admin Companies - Manage companies (Admin creates companies)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiPlus, HiOfficeBuilding, HiUsers, HiBriefcase, HiX, HiTrash, HiEye } from 'react-icons/hi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function AdminCompanies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [newCompany, setNewCompany] = useState({
        name: '',
        description: '',
        website: '',
        industry: '',
        size: '1-10',
        location: {
            address: '',
            city: '',
            state: '',
            country: ''
        },
        contactInfo: {
            email: '',
            phone: '',
            linkedin: ''
        },
        adminCredentials: {
            name: '',
            email: '',
            password: ''
        }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        setLoading(true);

        try {
            const companiesRes = await fetch(`${API_URL}/companies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const companiesData = await companiesRes.json();

            if (companiesData.success) {
                setCompanies(companiesData.data || []);
            }
        } catch (error) {
            toast.error('Failed to load companies');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/companies`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newCompany)
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Company created! Admin login: ${newCompany.adminCredentials.email}`);
                setShowCreateModal(false);
                setNewCompany({
                    name: '',
                    description: '',
                    website: '',
                    industry: '',
                    size: '1-10',
                    location: { address: '', city: '', state: '', country: '' },
                    contactInfo: { email: '', phone: '', linkedin: '' },
                    adminCredentials: { name: '', email: '', password: '' }
                });
                fetchData();
            } else {
                toast.error(data.message || 'Failed to create company');
            }
        } catch (error) {
            toast.error('Failed to create company');
        }
    };

    const handleDelete = async (companyId) => {
        if (!window.confirm('Are you sure you want to delete this company? All recruiters will also be removed.')) {
            return;
        }

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/companies/${companyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Company deleted');
                fetchData();
            } else {
                toast.error(data.message || 'Failed to delete company');
            }
        } catch (error) {
            toast.error('Failed to delete company');
        }
    };

    const filteredCompanies = companies.filter(company => {
        const matchesStatus = filterStatus === 'all' || company.status === filterStatus;
        const matchesSearch = !search ||
            company.name.toLowerCase().includes(search.toLowerCase()) ||
            company.industry?.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const stats = {
        total: companies.length,
        active: companies.filter(c => c.status === 'active').length,
        pending: companies.filter(c => c.status === 'pending').length,
        suspended: companies.filter(c => c.status === 'suspended').length
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="text-white">Loading...</div></div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">Company Management</h1>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
                    <HiPlus className="w-5 h-5" />
                    Create Company
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="card p-4">
                    <div className="text-sm text-dark-400">Total Companies</div>
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-dark-400">Active</div>
                    <div className="text-2xl font-bold text-green-400">{stats.active}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-dark-400">Pending</div>
                    <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-dark-400">Suspended</div>
                    <div className="text-2xl font-bold text-red-400">{stats.suspended}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6">
                <div className="flex gap-4 items-center">
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input flex-1"
                    />
                    <div className="flex gap-2">
                        {['all', 'active', 'pending', 'suspended'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg capitalize ${filterStatus === status ? 'bg-primary text-white' : 'bg-dark-700 text-dark-300'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Companies List */}
            <div className="grid gap-4">
                {filteredCompanies.length === 0 ? (
                    <div className="card p-8 text-center">
                        <HiOfficeBuilding className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                        <p className="text-dark-400">No companies found</p>
                    </div>
                ) : (
                    filteredCompanies.map((company) => (
                        <motion.div
                            key={company._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-6"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <HiOfficeBuilding className="w-8 h-8 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{company.name}</h3>
                                        <p className="text-dark-400 text-sm mt-1">{company.industry}</p>
                                        <div className="flex gap-4 mt-3 text-sm text-dark-400">
                                            <div className="flex items-center gap-1">
                                                <HiUsers className="w-4 h-4" />
                                                {company.stats?.totalRecruiters || 0} recruiters
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <HiBriefcase className="w-4 h-4" />
                                                {company.stats?.totalJobsPosted || 0} jobs
                                            </div>
                                        </div>
                                        <div className="mt-2 text-sm text-dark-400">
                                            Admin: {company.admin?.name} ({company.admin?.email})
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-sm ${company.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                        company.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-red-500/20 text-red-400'
                                        }`}>
                                        {company.status}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(company._id)}
                                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                    >
                                        <HiTrash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Create New Company</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-dark-700 rounded-lg">
                                <HiX className="w-6 h-6 text-dark-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCompany} className="space-y-4">
                            <div className="bg-dark-700/50 p-4 rounded-lg space-y-3">
                                <h3 className="text-white font-semibold">Company Admin Credentials</h3>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Admin Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="John Doe"
                                        value={newCompany.adminCredentials.name}
                                        onChange={(e) => setNewCompany({
                                            ...newCompany,
                                            adminCredentials: { ...newCompany.adminCredentials, name: e.target.value }
                                        })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Admin Email *</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="admin@company.com"
                                        value={newCompany.adminCredentials.email}
                                        onChange={(e) => setNewCompany({
                                            ...newCompany,
                                            adminCredentials: { ...newCompany.adminCredentials, email: e.target.value }
                                        })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Admin Password *</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="Minimum 6 characters"
                                        minLength={6}
                                        value={newCompany.adminCredentials.password}
                                        onChange={(e) => setNewCompany({
                                            ...newCompany,
                                            adminCredentials: { ...newCompany.adminCredentials, password: e.target.value }
                                        })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Company Name *</label>
                                    <input
                                        required
                                        type="text"
                                        value={newCompany.name}
                                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Industry</label>
                                    <input
                                        type="text"
                                        value={newCompany.industry}
                                        onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Description</label>
                                <textarea
                                    rows={3}
                                    value={newCompany.description}
                                    onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Website</label>
                                    <input
                                        type="url"
                                        value={newCompany.website}
                                        onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Company Size</label>
                                    <select
                                        value={newCompany.size}
                                        onChange={(e) => setNewCompany({ ...newCompany, size: e.target.value })}
                                        className="input"
                                    >
                                        <option value="1-10">1-10</option>
                                        <option value="11-50">11-50</option>
                                        <option value="51-200">51-200</option>
                                        <option value="201-500">201-500</option>
                                        <option value="501-1000">501-1000</option>
                                        <option value="1000+">1000+</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Contact Email *</label>
                                    <input
                                        required
                                        type="email"
                                        value={newCompany.contactInfo.email}
                                        onChange={(e) => setNewCompany({
                                            ...newCompany,
                                            contactInfo: { ...newCompany.contactInfo, email: e.target.value }
                                        })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        value={newCompany.contactInfo.phone}
                                        onChange={(e) => setNewCompany({
                                            ...newCompany,
                                            contactInfo: { ...newCompany.contactInfo, phone: e.target.value }
                                        })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">City</label>
                                    <input
                                        type="text"
                                        value={newCompany.location.city}
                                        onChange={(e) => setNewCompany({
                                            ...newCompany,
                                            location: { ...newCompany.location, city: e.target.value }
                                        })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white text-sm font-medium mb-2">Country</label>
                                    <input
                                        type="text"
                                        value={newCompany.location.country}
                                        onChange={(e) => setNewCompany({
                                            ...newCompany,
                                            location: { ...newCompany.location, country: e.target.value }
                                        })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn-primary w-full">
                                Create Company
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
