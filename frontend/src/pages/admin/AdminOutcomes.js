/**
 * SkillForge AI - Admin Outcomes
 */

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminOutcomes() {
  const [stats, setStats] = useState({ total: 0, byStatus: {} });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getOutcomeStats();
      setStats(res.data.data || { total: 0, byStatus: {} });
    } catch (error) {
      toast.error('Failed to load outcomes');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Outcomes</h1>
        <p className="text-dark-400 mt-1">Placement analytics and outcome tracking.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
        <p className="text-dark-400">Total outcomes: {stats.total || 0}</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {Object.entries(stats.byStatus || {}).map(([status, count]) => (
            <div key={status} className="p-4 bg-dark-800 rounded-xl text-white">
              <p className="text-sm text-dark-400">{status}</p>
              <p className="text-xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
