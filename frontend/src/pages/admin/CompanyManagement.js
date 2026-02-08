import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiPlus, HiOfficeBuilding, HiSearch } from 'react-icons/hi';
import api from '../../services/api';

export default function CompanyManagement() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        description: '',
        website: '',
        industry: '',
        size: '1-10',
        location: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
    });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/company');
            setCompanies(response.data.data);
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // ... (fetchCompanies)

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this company? This will also delete all associated company admin and recruiter accounts.')) {
            try {
                await api.delete(`/company/${id}`);
                fetchCompanies();
                alert('Company deleted successfully');
            } catch (error) {
                console.error('Failed to delete company:', error);
                alert('Failed to delete company');
            }
        }
    };

    const handleEdit = (company) => {
        setFormData({
            companyName: company.name,
            description: company.description,
            website: company.website,
            industry: company.industry,
            size: company.size,
            location: company.location?.city || '', // Simplification for demo
            adminName: company.admin?.name,
            adminEmail: company.admin?.email,
            adminPassword: '', // Don't prefill password
            status: company.status
        });
        setSelectedId(company._id);
        setEditMode(true);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editMode) {
                await api.put(`/company/${selectedId}`, formData);
                alert('Company updated successfully');
            } else {
                await api.post('/company', formData);
                alert('Company created successfully!');
            }
            setShowModal(false);
            setEditMode(false);
            fetchCompanies();
            resetForm();
        } catch (error) {
            console.error('Failed to save company:', error);
            alert(error.response?.data?.message || 'Failed to save company');
        }
    };

    const resetForm = () => {
        setFormData({
            companyName: '', description: '', website: '', industry: '',
            size: '1-10', location: '', adminName: '', adminEmail: '', adminPassword: '', status: 'active'
        });
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Company Management</h1>
                    <p className="text-gray-400">Create, edit, and manage companies</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setEditMode(false);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <HiPlus className="w-5 h-5" />
                    Add Company
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map((company) => (
                        <motion.div
                            key={company._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-indigo-500/50 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-indigo-500/10 rounded-lg">
                                    <HiOfficeBuilding className="w-6 h-6 text-indigo-400" />
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${company.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                    {company.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-1">{company.name}</h3>
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{company.description}</p>

                            <div className="space-y-2 pt-4 border-t border-gray-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Industry</span>
                                    <span className="text-gray-300">{company.industry}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Size</span>
                                    <span className="text-gray-300">{company.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Admin</span>
                                    <span className="text-gray-300">{company.admin?.name || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Recruiters</span>
                                    <span className="text-gray-300">{company.recruiters?.length || 0}</span>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-700">
                                <button
                                    onClick={() => handleEdit(company)}
                                    className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(company._id)}
                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Company Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700"
                    >
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">{editMode ? 'Edit Company' : 'Create New Company'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* ... existing fields ... */}

                            {/* Company Admin Details - Only show for new companies (simplification) or allow editing name/email only */}
                            <div className="pt-6 border-t border-gray-800">
                                <h3 className="text-sm font-medium text-indigo-400 mb-4 uppercase tracking-wider">Company Admin</h3>
                                {!editMode && <p className="text-xs text-gray-500 mb-4">Credentials for the initial company admin account.</p>}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* ... fields ... */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            required={!editMode}
                                            disabled={editMode} // Disable admin editing in this view for simplicity
                                            className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 ${editMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={formData.adminName}
                                            onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                        <input
                                            type="email"
                                            required={!editMode}
                                            disabled={editMode}
                                            className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 ${editMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            value={formData.adminEmail}
                                            onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                        />
                                    </div>
                                    {!editMode && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                            <input
                                                type="password"
                                                required
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                                value={formData.adminPassword}
                                                onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    {editMode ? 'Save Changes' : 'Create Company'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
