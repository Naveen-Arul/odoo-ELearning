/**
 * SkillForge AI - Admin Monitoring
 */

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminMonitoring() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await adminAPI.getMonitoringSummary();
      setSummary(res.data.data || null);
    } catch (error) {
      toast.error('Failed to load monitoring data');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Monitoring</h1>
        <p className="text-dark-400 mt-1">System summary for admins.</p>
      </div>

      <div className="card p-6">
        {!summary ? (
          <p className="text-dark-400">No data available.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key} className="p-4 bg-dark-800 rounded-xl">
                <p className="text-dark-400 text-sm">{key}</p>
                <p className="text-white text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
