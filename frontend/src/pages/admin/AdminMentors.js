/**
 * SkillForge AI - Admin Mentors
 */

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminMentors() {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await adminAPI.getMentorApplications();
      setApplications(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load mentor applications');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updateMentorStatus(id, { status });
      toast.success('Mentor updated');
      fetchApplications();
    } catch (error) {
      toast.error('Failed to update mentor');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Mentor Applications</h1>
        <p className="text-dark-400 mt-1">Approve or reject mentors.</p>
      </div>

      <div className="card p-6">
        {applications.length === 0 ? (
          <p className="text-dark-400">No applications found.</p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app._id} className="p-4 bg-dark-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{app.user?.name || 'User'}</h3>
                    <p className="text-dark-400 text-sm">{app.bio}</p>
                  </div>
                  <span className="text-xs text-dark-300 bg-dark-700 px-2 py-1 rounded">{app.status}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm" onClick={() => updateStatus(app._id, 'approved')}>Approve</button>
                  <button className="btn-secondary btn-sm" onClick={() => updateStatus(app._id, 'rejected')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
