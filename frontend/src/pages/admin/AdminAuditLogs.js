/**
 * SkillForge AI - Admin Audit Logs
 * Comprehensive activity tracking for admin actions
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiClipboardList, HiSearch, HiFilter, HiRefresh,
  HiPlus, HiPencil, HiTrash, HiEye, HiEyeOff,
  HiUser, HiAcademicCap, HiBookOpen, HiBriefcase
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ACTION_ICONS = {
  CREATE: HiPlus,
  UPDATE: HiPencil,
  DELETE: HiTrash,
  PUBLISH: HiEye,
  UNPUBLISH: HiEyeOff
};

const ACTION_COLORS = {
  CREATE: 'text-green-400 bg-green-500/20',
  UPDATE: 'text-blue-400 bg-blue-500/20',
  DELETE: 'text-red-400 bg-red-500/20',
  PUBLISH: 'text-purple-400 bg-purple-500/20',
  UNPUBLISH: 'text-yellow-400 bg-yellow-500/20'
};

const ENTITY_ICONS = {
  Roadmap: HiAcademicCap,
  Topic: HiBookOpen,
  Role: HiBriefcase,
  User: HiUser
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAuditLogs({ limit: 200 });
      setLogs(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.metadata)?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = !filterAction || log.action === filterAction;
    const matchesEntity = !filterEntity || log.entityType === filterEntity;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionDescription = (log) => {
    const actionVerb = {
      CREATE: 'created',
      UPDATE: 'updated',
      DELETE: 'deleted',
      PUBLISH: 'published',
      UNPUBLISH: 'unpublished'
    };

    const verb = actionVerb[log.action] || log.action?.toLowerCase();
    const entity = log.entityType?.toLowerCase() || 'item';
    const name = log.metadata?.title || log.metadata?.name || '';

    return `${verb} ${entity}${name ? `: "${name}"` : ''}`;
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))].filter(Boolean);
  const uniqueEntities = [...new Set(logs.map(log => log.entityType))].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <HiClipboardList className="w-8 h-8 text-primary-400" />
            Activity Logs
          </h1>
          <p className="text-dark-400 mt-1">Track all admin actions and changes</p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn-secondary"
          disabled={loading}
        >
          <HiRefresh className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
              placeholder="Search logs..."
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <HiFilter className="w-5 h-5 text-dark-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="input"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="input"
          >
            <option value="">All Types</option>
            {uniqueEntities.map(entity => (
              <option key={entity} value={entity}>{entity}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['CREATE', 'UPDATE', 'DELETE', 'PUBLISH'].map(action => {
          const count = logs.filter(l => l.action === action).length;
          const Icon = ACTION_ICONS[action] || HiClipboardList;
          const colorClass = ACTION_COLORS[action] || 'text-dark-400 bg-dark-700';

          return (
            <div key={action} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-dark-400 text-sm">{action}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card p-12 text-center">
          <HiClipboardList className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 text-lg">No activity logs found</p>
          <p className="text-dark-500 text-sm mt-1">Admin actions will appear here</p>
        </div>
      ) : (
        <div className="card divide-y divide-dark-700">
          {filteredLogs.map((log, index) => {
            const ActionIcon = ACTION_ICONS[log.action] || HiClipboardList;
            const EntityIcon = ENTITY_ICONS[log.entityType] || HiClipboardList;
            const actionColor = ACTION_COLORS[log.action] || 'text-dark-400 bg-dark-700';

            return (
              <motion.div
                key={log._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="p-4 hover:bg-dark-800/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Action Icon */}
                  <div className={`p-2 rounded-lg shrink-0 ${actionColor}`}>
                    <ActionIcon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">
                        {log.actor?.name || 'System'}
                      </span>
                      <span className="text-dark-400">
                        {getActionDescription(log)}
                      </span>
                    </div>

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-dark-700 rounded text-xs text-dark-300"
                          >
                            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-dark-500">
                      <div className="flex items-center gap-1">
                        <EntityIcon className="w-3 h-3" />
                        {log.entityType}
                      </div>
                      <span>{formatDate(log.createdAt)}</span>
                      {log.ip && <span>IP: {log.ip}</span>}
                    </div>
                  </div>

                  {/* Entity ID Badge */}
                  {log.entityId && (
                    <span className="text-xs text-dark-500 font-mono bg-dark-800 px-2 py-1 rounded shrink-0">
                      {log.entityId.slice(-8)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {!loading && filteredLogs.length > 0 && (
        <p className="text-center text-dark-500 text-sm">
          Showing {filteredLogs.length} of {logs.length} logs
        </p>
      )}
    </div>
  );
}
