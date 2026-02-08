/**
 * SkillForge AI - Admin Roles Management
 * CRUD operations for career roles
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiPencil, HiTrash, HiSearch, HiX,
  HiBriefcase, HiTag, HiCheck
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    aliases: '',
    keywords: '',
    category: ''
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getRoles();
      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name || '',
        description: role.description || '',
        aliases: role.aliases?.join(', ') || '',
        keywords: role.keywords?.join(', ') || '',
        category: role.category || ''
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        aliases: '',
        keywords: '',
        category: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      aliases: formData.aliases.split(',').map(s => s.trim()).filter(Boolean),
      keywords: formData.keywords.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      if (editingRole) {
        await adminAPI.updateRole(editingRole._id, data);
        toast.success('Role updated successfully');
      } else {
        await adminAPI.createRole(data);
        toast.success('Role created successfully');
      }
      setShowModal(false);
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save role');
    }
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      await adminAPI.deleteRole(roleId);
      toast.success('Role deleted');
      fetchRoles();
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Career Roles</h1>
          <p className="text-dark-400 mt-1">Manage career roles and keywords</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          <HiPlus className="w-5 h-5 mr-2" />
          Add Role
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
          placeholder="Search roles..."
        />
      </div>

      {/* Roles List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map((role, index) => (
            <motion.div
              key={role._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <HiBriefcase className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{role.name}</h3>
                    {role.category && (
                      <span className="text-dark-500 text-sm">{role.category}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(role)}
                    className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                  >
                    <HiPencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role._id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {role.description && (
                <p className="text-dark-400 text-sm mb-3 line-clamp-2">
                  {role.description}
                </p>
              )}

              {/* Aliases */}
              {role.aliases?.length > 0 && (
                <div className="mb-3">
                  <p className="text-dark-500 text-xs mb-1">Aliases:</p>
                  <div className="flex flex-wrap gap-1">
                    {role.aliases.slice(0, 3).map((alias, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-dark-700 rounded text-dark-300">
                        {alias}
                      </span>
                    ))}
                    {role.aliases.length > 3 && (
                      <span className="text-xs text-dark-500">+{role.aliases.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {role.keywords?.length > 0 && (
                <div>
                  <p className="text-dark-500 text-xs mb-1">Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {role.keywords.slice(0, 5).map((keyword, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-primary-500/20 rounded text-primary-400">
                        {keyword}
                      </span>
                    ))}
                    {role.keywords.length > 5 && (
                      <span className="text-xs text-dark-500">+{role.keywords.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {filteredRoles.length === 0 && !loading && (
        <div className="text-center py-12">
          <HiBriefcase className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No roles found</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingRole ? 'Edit Role' : 'Add New Role'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-dark-700 text-dark-400"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Role Title *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                    placeholder="e.g., Frontend Developer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input"
                    placeholder="e.g., Development, DevOps, Data"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input h-24"
                    placeholder="Brief description of the role..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Aliases (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.aliases}
                    onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                    className="input"
                    placeholder="e.g., Front-End Dev, UI Developer"
                  />
                  <p className="text-dark-500 text-xs mt-1">
                    Alternative names for this role
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Keywords (comma-separated)
                  </label>
                  <textarea
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    className="input h-24"
                    placeholder="e.g., react, javascript, html, css, ui, web"
                  />
                  <p className="text-dark-500 text-xs mt-1">
                    Keywords for search and typo correction
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    <HiCheck className="w-4 h-4 mr-2" />
                    {editingRole ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
