/**
 * SkillForge AI - Admin Users Management
 * View and manage platform users
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiSearch, HiX, HiUsers, HiMail, HiCalendar,
  HiShieldCheck, HiBan, HiCheck, HiDotsVertical
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, filter, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const role = filter === 'admin' ? 'admin' : undefined;
      const status = filter === 'active' ? 'active' : filter === 'inactive' ? 'inactive' : undefined;
      const response = await adminAPI.getUsers({
        page,
        limit: 20,
        search: searchQuery || undefined,
        role,
        status
      });
      setUsers(response.data.data || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, isAdmin) => {
    try {
      const nextRole = isAdmin ? 'student' : 'admin';
      await adminAPI.updateUserRole(userId, { role: nextRole });
      toast.success(`User ${!isAdmin ? 'promoted to' : 'removed from'} admin`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await adminAPI.toggleUserStatus(userId, { isActive: !isActive });
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const filteredUsers = users;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Users</h1>
          <p className="text-dark-400 mt-1">Manage platform users</p>
        </div>
        <div className="flex gap-2">
          {['all', 'admin', 'active', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === f
                  ? 'bg-red-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
          placeholder="Search users by name or email..."
        />
      </div>

      {/* Users Table */}
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
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4">Study Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="text-sm hover:bg-dark-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500
                                      flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-medium">
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{user.name}</p>
                            {user.role === 'admin' && (
                              <HiShieldCheck className="w-4 h-4 text-red-400" title="Admin" />
                            )}
                          </div>
                          <p className="text-dark-500 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-dark-300">
                      {user.role === 'admin' ? 'Admin' : 'Student'}
                    </td>
                    <td className="p-4 text-dark-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-dark-300">
                      {Math.round((user.totalStudyTime || 0) / 60)}h
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        user.isActive !== false ? 'badge-accent' : 'badge-danger'
                      }`}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <HiDotsVertical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleAdmin(user._id, user.role === 'admin')}
                          className={`p-2 rounded-lg transition-colors ${
                            user.role === 'admin'
                              ? 'hover:bg-amber-500/20 text-amber-400'
                              : 'hover:bg-dark-700 text-dark-400 hover:text-white'
                          }`}
                          title={user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        >
                          <HiShieldCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user._id, user.isActive !== false)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isActive !== false
                              ? 'hover:bg-red-500/20 text-dark-400 hover:text-red-400'
                              : 'hover:bg-accent-500/20 text-dark-400 hover:text-accent-400'
                          }`}
                          title={user.isActive !== false ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive !== false ? (
                            <HiBan className="w-4 h-4" />
                          ) : (
                            <HiCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t border-dark-700">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost py-2 px-4"
              >
                Previous
              </button>
              <span className="flex items-center text-dark-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost py-2 px-4"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-12">
          <HiUsers className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No users found</p>
        </div>
      )}

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">User Details</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 rounded-lg hover:bg-dark-700 text-dark-400"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500
                              flex items-center justify-center overflow-hidden mb-4">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white">{selectedUser.name}</h3>
                <p className="text-dark-400">{selectedUser.email}</p>
                <div className="flex justify-center gap-2 mt-2">
                  {selectedUser.isAdmin && (
                    <span className="badge badge-danger">Admin</span>
                  )}
                  <span className={`badge ${
                    selectedUser.isActive !== false ? 'badge-accent' : 'badge-secondary'
                  }`}>
                    {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-dark-800 rounded-xl">
                    <p className="text-dark-500 text-xs">Career Goal</p>
                    <p className="text-white">{selectedUser.role?.title || 'Not set'}</p>
                  </div>
                  <div className="p-3 bg-dark-800 rounded-xl">
                    <p className="text-dark-500 text-xs">Skill Level</p>
                    <p className="text-white capitalize">
                      {selectedUser.preferences?.skillLevel || 'Beginner'}
                    </p>
                  </div>
                  <div className="p-3 bg-dark-800 rounded-xl">
                    <p className="text-dark-500 text-xs">Study Time</p>
                    <p className="text-white">
                      {Math.round((selectedUser.totalStudyTime || 0) / 60)} hours
                    </p>
                  </div>
                  <div className="p-3 bg-dark-800 rounded-xl">
                    <p className="text-dark-500 text-xs">Enrolled Roadmaps</p>
                    <p className="text-white">
                      {selectedUser.enrolledRoadmaps?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-dark-800 rounded-xl">
                  <p className="text-dark-500 text-xs mb-2">Account Info</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-dark-300">
                      <span className="text-dark-500">Auth Provider:</span>{' '}
                      {selectedUser.authProvider || 'Email'}
                    </p>
                    <p className="text-dark-300">
                      <span className="text-dark-500">Joined:</span>{' '}
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-dark-300">
                      <span className="text-dark-500">Last Active:</span>{' '}
                      {selectedUser.lastActive
                        ? new Date(selectedUser.lastActive).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Enrolled Roadmaps */}
                {selectedUser.enrolledRoadmaps?.length > 0 && (
                  <div className="p-3 bg-dark-800 rounded-xl">
                    <p className="text-dark-500 text-xs mb-2">Enrolled Roadmaps</p>
                    <div className="space-y-2">
                      {selectedUser.enrolledRoadmaps.map((enrollment) => (
                        <div key={enrollment._id} className="flex justify-between text-sm">
                          <span className="text-dark-300">
                            {enrollment.roadmap?.title || 'Roadmap'}
                          </span>
                          <span className="text-primary-400">
                            {enrollment.progress || 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    handleToggleAdmin(selectedUser._id, selectedUser.isAdmin);
                    setShowUserModal(false);
                  }}
                  className={`btn flex-1 ${
                    selectedUser.isAdmin ? 'btn-secondary' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  }`}
                >
                  {selectedUser.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </button>
                <button
                  onClick={() => {
                    handleToggleActive(selectedUser._id, selectedUser.isActive !== false);
                    setShowUserModal(false);
                  }}
                  className={`btn flex-1 ${
                    selectedUser.isActive !== false ? 'bg-red-500/20 text-red-400' : 'bg-accent-500/20 text-accent-400'
                  }`}
                >
                  {selectedUser.isActive !== false ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
