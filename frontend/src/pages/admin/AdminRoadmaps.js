/**
 * SkillForge AI - Admin Roadmaps Management
 * CRUD operations for learning roadmaps
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiPencil, HiTrash, HiSearch, HiX,
  HiAcademicCap, HiBookOpen, HiCheck, HiEye, HiEyeOff
} from 'react-icons/hi';
import { adminAPI, rolesAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminRoadmaps() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoadmap, setEditingRoadmap] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    role: '',
    skillLevel: 'beginner',
    estimatedDuration: 0,
    prerequisites: '',
    passingPercentage: 70,
    isActive: true
  });

  const navigate = useNavigate();

  const parsePrerequisites = (value) => value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^[a-f\d]{24}$/i.test(item));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roadmapsRes, rolesRes] = await Promise.all([
        adminAPI.getRoadmaps(),
        rolesAPI.getAll()
      ]);
      setRoadmaps(roadmapsRes.data.data || []);
      setRoles(rolesRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (roadmap = null) => {
    if (roadmap) {
      setEditingRoadmap(roadmap);
      setFormData({
        title: roadmap.title || '',
        description: roadmap.description || '',
        role: roadmap.role?._id || roadmap.role || '',
        skillLevel: roadmap.skillLevel || 'beginner',
        estimatedDuration: roadmap.estimatedDuration || 0,
        prerequisites: roadmap.prerequisites?.join(', ') || '',
        passingPercentage: roadmap.testConfig?.passingPercentage || 70,
        isActive: roadmap.isActive !== false
      });
    } else {
      setEditingRoadmap(null);
      setFormData({
        title: '',
        description: '',
        role: '',
        skillLevel: 'beginner',
        estimatedDuration: 0,
        prerequisites: '',
        passingPercentage: 70,
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      prerequisites: parsePrerequisites(formData.prerequisites),
      testConfig: { passingPercentage: formData.passingPercentage }
    };

    try {
      if (editingRoadmap) {
        await adminAPI.updateRoadmap(editingRoadmap._id, data);
        toast.success('Roadmap updated successfully');
      } else {
        const res = await adminAPI.createRoadmap(data);
        const newId = res?.data?.data?._id || res?.data?._id;
        toast.success('Roadmap created successfully');
        if (newId) {
          navigate(`/admin/topics?roadmap=${newId}`);
        }
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save roadmap');
    }
  };

  const handleTogglePublish = async (roadmap) => {
    try {
      const response = await adminAPI.publishRoadmap(roadmap._id, { publish: !roadmap.isPublished });
      const updated = response.data.data;
      setRoadmaps((prev) => prev.map((rm) => {
        if (rm._id !== updated._id) return rm;
        const resolvedRole = typeof updated.role === 'string' ? rm.role : (updated.role || rm.role);
        return {
          ...rm,
          ...updated,
          role: resolvedRole
        };
      }));
      toast.success(updated.isPublished ? 'Roadmap published' : 'Roadmap not published');
    } catch (error) {
      toast.error('Failed to update publish status');
    }
  };

  const handleDelete = async (roadmapId, title) => {
    const confirmMessage = `This will permanently delete "${title}" and all its topics. Continue?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await adminAPI.deleteRoadmap(roadmapId);
      toast.success('Roadmap deleted');
      setRoadmaps((prev) => prev.filter((rm) => rm._id !== roadmapId));
    } catch (error) {
      toast.error('Failed to delete roadmap');
    }
  };

  const filteredRoadmaps = roadmaps.filter(roadmap =>
    roadmap.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Roadmaps</h1>
          <p className="text-dark-400 mt-1">Manage learning roadmaps</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          <HiPlus className="w-5 h-5 mr-2" />
          Add Roadmap
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
          placeholder="Search roadmaps..."
        />
      </div>

      {/* Roadmaps Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-dark-400 text-sm border-b border-dark-700">
                  <th className="p-4">Roadmap</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Level</th>
                  <th className="p-4">Topics</th>
                  <th className="p-4">Enrollments</th>
                  <th className="p-4">Completed</th>
                  <th className="p-4">Reviews</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredRoadmaps.map((roadmap) => (
                  <tr key={roadmap._id} className="text-sm hover:bg-dark-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                          <HiAcademicCap className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{roadmap.title}</p>
                          <p className="text-dark-500 text-xs truncate max-w-xs">
                            {roadmap.description}
                          </p>
                          <p className="text-dark-400 text-xs mt-1">
                            Role: {roadmap.role?.name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-dark-300">
                      {roadmap.role?.name || 'N/A'}
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        roadmap.skillLevel === 'beginner' ? 'badge-accent' :
                        roadmap.skillLevel === 'intermediate' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {roadmap.skillLevel}
                      </span>
                    </td>
                    <td className="p-4 text-dark-300">
                      {roadmap.topics?.length || 0}
                    </td>
                    <td className="p-4 text-dark-300">
                      {roadmap.stats?.enrollmentCount || 0}
                    </td>
                    <td className="p-4 text-dark-300">
                      {roadmap.stats?.completionCount || 0}
                    </td>
                    <td className="p-4 text-dark-300">
                      {roadmap.stats?.totalRatings
                        ? `${roadmap.stats?.averageRating || 0} (${roadmap.stats?.totalRatings})`
                        : 'No reviews'}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 items-center">
                        <span className={`badge ${roadmap.isActive ? 'badge-accent' : 'badge-secondary'}`}>
                          {roadmap.isActive ? 'Active' : 'Deactivated'}
                        </span>
                        <span className={`badge ${roadmap.isPublished ? 'badge-success' : 'badge-secondary'}`}>
                          {roadmap.isPublished ? 'Published' : 'Not Published'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Link
                          to={`/admin/topics?roadmap=${roadmap._id}`}
                          className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                          title="View Topics"
                        >
                          <HiBookOpen className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenModal(roadmap)}
                          className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTogglePublish(roadmap)}
                          className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                          title={roadmap.isPublished ? 'Hide from users' : 'Show to users'}
                        >
                          {roadmap.isPublished ? (
                            <HiEye className="w-4 h-4" />
                          ) : (
                            <HiEyeOff className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(roadmap._id, roadmap.title)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredRoadmaps.length === 0 && !loading && (
        <div className="text-center py-12">
          <HiAcademicCap className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No roadmaps found</p>
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
                  {editingRoadmap ? 'Edit Roadmap' : 'Add New Roadmap'}
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
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    required
                    placeholder="e.g., Frontend Development Roadmap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input h-24"
                    required
                    placeholder="Describe what learners will achieve..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Associated Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="input"
                    >
                      <option value="">Select a role</option>
                      {roles.map((role) => (
                        <option key={role._id} value={role._id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Level *
                    </label>
                    <select
                      value={formData.skillLevel}
                      onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Estimated Duration
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData({
                        ...formData,
                        estimatedDuration: parseInt(e.target.value || '0', 10)
                      })}
                      className="input"
                      placeholder="Total hours"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Passing % for Tests
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.passingPercentage}
                      onChange={(e) => setFormData({ ...formData, passingPercentage: parseInt(e.target.value) })}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                      Prerequisites (roadmap IDs, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.prerequisites}
                    onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                    className="input"
                    placeholder="e.g., Basic HTML, CSS fundamentals"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-dark-300">
                    Active (visible to users)
                  </label>
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
                    {editingRoadmap ? 'Update' : 'Create'}
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
